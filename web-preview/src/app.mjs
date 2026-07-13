import {
  distanceMeters,
  locationLabel,
  nextRecommendation,
  rankRestaurants,
  restaurantById,
  score
} from "./foodMapLogic.mjs";
import {
  getStoredGoogleMapsApiKey,
  hasGoogleMapsApiKey,
  searchNearbyRestaurants,
  storeGoogleMapsApiKey
} from "./googleMapsPlaces.mjs";
import { restaurants as sampleRestaurants, userLocation as fallbackLocation } from "./restaurants.mjs";

const TARGET_ACCURACY_METERS = 100;
const MAX_SEARCH_ACCURACY_METERS = 1500;
const LOCATION_WATCH_TIMEOUT_MS = 20000;

const state = {
  source: "sample",
  restaurants: sampleRestaurants,
  userLocation: fallbackLocation,
  seen: new Set(),
  selected: null,
  detail: null,
  query: "",
  category: "全部",
  openOnly: false,
  locationAccuracy: null,
  locationStatus: "尚未取得定位，先使用新竹市東區作為預設位置。",
  placesStatus: hasGoogleMapsApiKey()
    ? "已保存 Google Maps API key，可取得定位後搜尋附近餐廳。"
    : "尚未設定 Google Maps API key，目前使用 MVP 假資料。",
  isLocating: false,
  isSearchingPlaces: false,
  apiKeyDraft: ""
};

const app = document.querySelector("#app");

function init() {
  state.apiKeyDraft = getStoredGoogleMapsApiKey();
  state.selected = pickRecommendation(filteredRestaurants());
  state.detail = state.selected;
  render();
}

function categories() {
  return ["全部", ...new Set(state.restaurants.map((restaurant) => restaurant.category))];
}

function filteredRestaurants() {
  const normalizedQuery = state.query.trim().toLowerCase();

  return state.restaurants.filter((restaurant) => {
    const matchesCategory = state.category === "全部" || restaurant.category === state.category;
    const matchesOpen = !state.openOnly || restaurant.open;
    const haystack = [
      restaurant.name,
      restaurant.category,
      restaurant.signature,
      ...(restaurant.tags ?? [])
    ].join(" ").toLowerCase();
    const matchesQuery = normalizedQuery.length === 0 || haystack.includes(normalizedQuery);

    return matchesCategory && matchesOpen && matchesQuery;
  });
}

function pickRecommendation(candidates) {
  if (candidates.length === 0) return null;

  if (state.seen.size >= candidates.length) {
    state.seen.clear();
  }

  const recommendation = nextRecommendation(candidates, state.userLocation, state.seen)
    ?? rankRestaurants(candidates, state.userLocation)[0];
  state.seen.add(recommendation.id);
  return recommendation;
}

function refreshSelection() {
  state.seen.clear();
  state.selected = pickRecommendation(filteredRestaurants());
  state.detail = state.selected;
}

function shuffleRecommendation() {
  state.selected = pickRecommendation(filteredRestaurants());
  state.detail = state.selected;
  render();
}

function selectRestaurant(id) {
  const restaurant = restaurantById(state.restaurants, id);
  if (!restaurant) return;

  state.selected = restaurant;
  state.detail = restaurant;
  state.seen.add(restaurant.id);
  render();
}

async function requestBrowserLocation() {
  if (!("geolocation" in navigator)) {
    state.locationStatus = "這個瀏覽器不支援定位，會繼續使用預設位置。";
    render();
    return;
  }

  state.isLocating = true;
  state.locationStatus = "正在向瀏覽器要求 GPS 權限，會等待最多 20 秒取得更精準的位置...";
  render();

  try {
    const position = await getBestCurrentPosition();
    const accuracy = Math.round(position.coords.accuracy);
    state.locationAccuracy = accuracy;
    state.userLocation = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      label: accuracy <= MAX_SEARCH_ACCURACY_METERS ? "目前位置" : "粗略位置"
    };
    state.locationStatus = accuracy <= MAX_SEARCH_ACCURACY_METERS
      ? `已取得 GPS 位置，精準度約 ${accuracy} 公尺。`
      : `目前只能取得約 ${accuracy} 公尺的粗略定位，還不適合搜尋附近餐廳；請確認手機定位/Wi-Fi 已開啟，或移到較空曠處再重試。`;

    refreshSelection();

    if (hasGoogleMapsApiKey() && canSearchWithCurrentLocation()) {
      await loadPlacesForCurrentLocation();
      return;
    }
  } catch (error) {
    state.locationStatus = locationErrorMessage(error);
  } finally {
    state.isLocating = false;
    render();
  }
}

async function saveApiKeyAndSearch(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const apiKey = String(formData.get("apiKey") ?? "");

  storeGoogleMapsApiKey(apiKey);
  state.apiKeyDraft = getStoredGoogleMapsApiKey();

  if (!state.apiKeyDraft) {
    state.source = "sample";
    state.restaurants = sampleRestaurants;
    state.placesStatus = "已清除 API key，目前回到 MVP 假資料。";
    refreshSelection();
    render();
    return;
  }

  state.placesStatus = "已保存 API key，正在嘗試搜尋目前位置附近餐廳。";
  render();
  await loadPlacesForCurrentLocation();
}

async function loadPlacesForCurrentLocation() {
  if (!canSearchWithCurrentLocation()) {
    state.placesStatus = state.locationAccuracy === null
      ? "請先取得 GPS 位置，再搜尋 Google Places 附近餐廳。"
      : `定位精準度約 ${state.locationAccuracy} 公尺，超過 ${MAX_SEARCH_ACCURACY_METERS} 公尺門檻，暫停 Google Places 搜尋以避免推薦到錯的區域。`;
    render();
    return;
  }

  state.isSearchingPlaces = true;
  state.placesStatus = "正在呼叫 Google Places Nearby Search...";
  render();

  try {
    const googleRestaurants = await searchNearbyRestaurants(state.userLocation);

    if (googleRestaurants.length === 0) {
      state.placesStatus = "Google Places 沒有回傳附近餐廳，暫時保留 MVP 假資料。";
      return;
    }

    state.source = "google";
    state.restaurants = googleRestaurants;
    state.category = "全部";
    state.query = "";
    state.placesStatus = `已從 Google Places 取得 ${googleRestaurants.length} 間附近餐廳。`;
    refreshSelection();
  } catch (error) {
    state.placesStatus = error instanceof Error ? error.message : "Google Places 搜尋失敗。";
  } finally {
    state.isSearchingPlaces = false;
    render();
  }
}

function useSampleData() {
  state.source = "sample";
  state.restaurants = sampleRestaurants;
  state.category = "全部";
  state.query = "";
  state.placesStatus = "已切回 MVP 假資料。";
  refreshSelection();
  render();
}

function render() {
  const candidates = rankRestaurants(filteredRestaurants(), state.userLocation);
  const selected = state.selected && candidates.some((restaurant) => restaurant.id === state.selected.id)
    ? state.selected
    : candidates[0] ?? null;

  if (selected !== state.selected) {
    state.selected = selected;
    state.detail = selected;
  }

  app.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">FoodMap Web</span>
        <h1>用你的 GPS 找附近可以吃的店。</h1>
        <p>部署到 HTTPS 後，瀏覽器可以要求定位權限；設定 Google Maps API key 後，就能把推薦來源從假資料切換成 Google Places 附近餐廳。</p>
      </div>
      ${setupPanelTemplate()}
    </section>

    <section class="dashboard">
      <div class="main-column">
        ${selected ? recommendationTemplate(selected) : emptyTemplate()}
        ${mapTemplate(selected, candidates)}
      </div>
      <aside class="side-column">
        ${filterTemplate()}
        ${nearbyTemplate(candidates, selected)}
        ${detailTemplate(state.detail ?? selected)}
      </aside>
    </section>
  `;

  bindEvents();
}

function setupPanelTemplate() {
  return `
    <section class="setup-panel" aria-label="定位與 Google Maps 設定">
      <div class="setup-header">
        <div>
          <span class="eyebrow">Live Data</span>
          <h2>${state.source === "google" ? "Google Places" : "MVP 假資料"}</h2>
        </div>
        <button class="secondary-button compact" id="use-sample" type="button">使用假資料</button>
      </div>

      <div class="status-stack">
        <p>${state.locationStatus}</p>
        <p>${state.placesStatus}</p>
      </div>

      <button class="primary-button full-width" id="locate" type="button" ${state.isLocating ? "disabled" : ""}>
        ${state.isLocating ? "正在等待更精準定位..." : "取得我的 GPS 位置"}
      </button>

      <form class="api-key-form" id="api-key-form">
        <label>
          <span>Google Maps API key</span>
          <input
            name="apiKey"
            type="password"
            value="${escapeHtml(state.apiKeyDraft)}"
            placeholder="貼上已限制網域的 browser key"
            autocomplete="off"
          />
        </label>
        <button class="secondary-button full-width" type="submit" ${state.isSearchingPlaces ? "disabled" : ""}>
          ${state.isSearchingPlaces ? "搜尋中..." : "保存並搜尋附近餐廳"}
        </button>
      </form>
    </section>
  `;
}

function filterTemplate() {
  return `
    <form class="filter-card" id="filters">
      <label class="search-box">
        <span>搜尋</span>
        <input name="query" type="search" value="${escapeHtml(state.query)}" placeholder="輸入餐點、店名或標籤" autocomplete="off" />
      </label>
      <label class="select-box">
        <span>類型</span>
        <select name="category">
          ${categories().map((category) => `<option value="${category}" ${category === state.category ? "selected" : ""}>${category}</option>`).join("")}
        </select>
      </label>
      <label class="toggle-box">
        <input name="openOnly" type="checkbox" ${state.openOnly ? "checked" : ""} />
        <span>只看營業中</span>
      </label>
    </form>
  `;
}

function recommendationTemplate(restaurant) {
  const restaurantScore = Math.round(score(restaurant, state.userLocation) * 100);
  const openLabel = restaurant.open === true ? "營業中" : restaurant.open === false ? "目前休息" : "營業狀態未知";

  return `
    <article class="recommendation-card">
      <img src="${restaurant.image}" alt="${restaurant.name} 招牌餐點" />
      <div class="recommendation-content">
        <div class="section-title">
          <span>最佳推薦</span>
          <strong>${restaurantScore} 分</strong>
        </div>
        <h2>${restaurant.name}</h2>
        <p>${restaurant.category} / ${restaurant.signature}</p>
        <div class="metrics">
          <span><b>${restaurant.rating.toFixed(1)}</b> 評分</span>
          <span><b>${restaurant.reviews.toLocaleString()}</b> 則評論</span>
          <span><b>${formatDistance(restaurant)}</b> 距離</span>
          <span><b>${restaurant.walkMinutes}</b> 分鐘步行</span>
        </div>
        <div class="status-line">
          <span class="${restaurant.open === false ? "is-closed" : "is-open"}">${openLabel}</span>
          <span>${restaurant.closesAt}</span>
          <span>${restaurant.price}</span>
        </div>
        <div class="tag-row">
          ${(restaurant.tags ?? []).map((tag) => `<span>${tag}</span>`).join("")}
        </div>
        <div class="actions">
          <button class="primary-button" id="accept" type="button">查看店家</button>
          <button class="secondary-button" id="shuffle" type="button">換一間</button>
        </div>
      </div>
    </article>
  `;
}

function mapTemplate(selected, candidates) {
  const pins = candidates.slice(0, 8).map((restaurant, index) => {
    const position = pinPosition(restaurant, index);
    const isSelected = restaurant.id === selected?.id;
    return `
      <button
        class="map-pin ${isSelected ? "selected" : ""}"
        style="left: ${position.left}%; top: ${position.top}%;"
        type="button"
        data-restaurant="${restaurant.id}"
        aria-label="選擇 ${restaurant.name}"
      >
        <span>${index + 1}</span>
      </button>
    `;
  }).join("");

  return `
    <section class="map-section" aria-label="附近餐廳地圖示意">
      <div class="map-header">
        <div>
          <span class="eyebrow">附近範圍</span>
          <h3>${locationLabel(state.userLocation)}</h3>
        </div>
        <strong>${candidates.length} 間候選</strong>
      </div>
      <div class="map-canvas">
        <span class="map-label station">目前位置</span>
        <span class="map-label city">${state.source === "google" ? "Google Places" : "新竹市中心"}</span>
        <span class="map-label mall">附近餐廳</span>
        <span class="user-dot" aria-label="目前位置"></span>
        ${pins}
      </div>
    </section>
  `;
}

function nearbyTemplate(candidates, selected) {
  const rows = candidates.map((restaurant, index) => {
    const openLabel = restaurant.open === true ? "營業中" : restaurant.open === false ? "休息" : "未知";

    return `
      <button class="restaurant-row ${restaurant.id === selected?.id ? "active" : ""}" type="button" data-restaurant="${restaurant.id}">
        <span class="rank">${index + 1}</span>
        <img src="${restaurant.image}" alt="${restaurant.name}" />
        <span class="restaurant-copy">
          <b>${restaurant.name}</b>
          <small>${restaurant.signature} / ${formatDistance(restaurant)} / ${restaurant.price}</small>
        </span>
        <span class="${restaurant.open === false ? "closed-copy" : "open-copy"}">${openLabel}</span>
      </button>
    `;
  }).join("");

  return `
    <section class="list-card">
      <div class="card-heading">
        <h3>推薦排序</h3>
        <span>${candidates.length} 筆</span>
      </div>
      <div class="restaurant-list">
        ${rows || `<p class="empty-copy">沒有符合條件的餐廳，試著放寬搜尋或關閉篩選。</p>`}
      </div>
    </section>
  `;
}

function detailTemplate(restaurant) {
  if (!restaurant) return "";

  return `
    <section class="detail-card">
      <div class="card-heading">
        <h3>店家詳情</h3>
        <span>${restaurant.category}</span>
      </div>
      <div class="photo-strip">
        ${restaurant.photos.map((photo) => `<img src="${photo}" alt="${restaurant.name} 照片" />`).join("")}
      </div>
      <div class="detail-grid">
        <span><b>${restaurant.rating.toFixed(1)}</b> 星評分</span>
        <span><b>${restaurant.reviews.toLocaleString()}</b> 則評論</span>
        <span><b>${restaurant.walkMinutes}</b> 分鐘步行</span>
        <span><b>${restaurant.closesAt}</b> 資訊</span>
      </div>
      <article class="review-card">
        <div class="avatar">${restaurant.review.author.slice(0, 1)}</div>
        <div>
          <strong>${restaurant.review.author}</strong>
          <span>${restaurant.review.rating.toFixed(1)} 星 / ${restaurant.review.time}</span>
          <p>${restaurant.review.text}</p>
        </div>
      </article>
    </section>
  `;
}

function emptyTemplate() {
  return `
    <section class="empty-state">
      <h2>找不到符合條件的餐廳</h2>
      <p>可以清空搜尋、切回全部類型，或重新取得定位後再搜尋 Google Places。</p>
    </section>
  `;
}

function bindEvents() {
  document.querySelector("#shuffle")?.addEventListener("click", shuffleRecommendation);
  document.querySelector("#accept")?.addEventListener("click", () => {
    if (state.selected) selectRestaurant(state.selected.id);
  });
  document.querySelector("#locate")?.addEventListener("click", requestBrowserLocation);
  document.querySelector("#use-sample")?.addEventListener("click", useSampleData);
  document.querySelector("#api-key-form")?.addEventListener("submit", saveApiKeyAndSearch);
  document.querySelector("#filters")?.addEventListener("input", (event) => {
    if (event.target.name === "query") {
      state.query = event.target.value;
      refreshSelection();
      render();
    }
    if (event.target.name === "openOnly") {
      state.openOnly = event.target.checked;
      refreshSelection();
      render();
    }
  });
  document.querySelector("#filters")?.addEventListener("change", (event) => {
    if (event.target.name === "category") {
      state.category = event.target.value;
      refreshSelection();
      render();
    }
  });
  document.querySelectorAll("[data-restaurant]").forEach((button) => {
    button.addEventListener("click", () => selectRestaurant(button.dataset.restaurant));
  });
}

function getBestCurrentPosition() {
  return new Promise((resolve, reject) => {
    let bestPosition = null;
    let settled = false;
    let watchId = null;
    let timeoutId = null;
    const options = {
      enableHighAccuracy: true,
      timeout: LOCATION_WATCH_TIMEOUT_MS,
      maximumAge: 0
    };
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      callback(value);
    };
    timeoutId = window.setTimeout(() => {
      if (bestPosition) {
        finish(resolve, bestPosition);
        return;
      }
      finish(reject, new Error("LOCATION_TIMEOUT"));
    }, LOCATION_WATCH_TIMEOUT_MS);

    watchId = navigator.geolocation.watchPosition((position) => {
      if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) {
        bestPosition = position;
        state.locationStatus = `正在取得更精準定位，目前最佳精準度約 ${Math.round(position.coords.accuracy)} 公尺...`;
        render();
      }

      if (position.coords.accuracy <= TARGET_ACCURACY_METERS) {
        finish(resolve, position);
      }
    }, (error) => {
      finish(reject, error);
    }, options);
  });
}

function canSearchWithCurrentLocation() {
  return state.locationAccuracy !== null && state.locationAccuracy <= MAX_SEARCH_ACCURACY_METERS;
}

function locationErrorMessage(error) {
  if (error?.message === "LOCATION_TIMEOUT") return "20 秒內沒有取得可用定位，請確認定位服務、Wi-Fi 或行動網路後再試一次。";
  if (error?.code === 1) return "定位權限被拒絕，請在瀏覽器允許位置權限後再試一次。";
  if (error?.code === 2) return "目前無法取得位置，請確認裝置定位服務或網路狀態。";
  if (error?.code === 3) return "取得定位逾時，請再試一次。";
  return "取得定位失敗，暫時保留預設位置。";
}

function formatDistance(restaurant) {
  const meters = distanceMeters(state.userLocation, { lat: restaurant.lat, lng: restaurant.lng });
  return `${Math.round(meters)} 公尺`;
}

function pinPosition(restaurant, index) {
  const left = 50 + (restaurant.lng - state.userLocation.lng) * 2300 + index * 2;
  const top = 52 - (restaurant.lat - state.userLocation.lat) * 2300 + index * 1.5;

  return {
    left: clamp(left, 12, 88),
    top: clamp(top, 14, 84)
  };
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

init();
