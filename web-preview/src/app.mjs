import {
  distanceMeters,
  locationLabel,
  nextRecommendation,
  rankRestaurants,
  restaurantById,
  score
} from "./foodMapLogic.mjs";
import {
  buildGoogleMapsUrl,
  fetchRestaurantDetail,
  formatGooglePriceLevel,
  getStoredGoogleMapsApiKey,
  hasGoogleMapsApiKey,
  mergeRestaurantDetail,
  renderGoogleRestaurantMap,
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
  locationStatus: "尚未取得定位，先使用新竹市中心作為預設位置。",
  placesStatus: hasGoogleMapsApiKey()
    ? "已儲存 Google Maps API key，可取得定位後搜尋附近餐廳。"
    : "尚未設定 Google Maps API key，目前使用 MVP 假資料。",
  mapStatus: hasGoogleMapsApiKey()
    ? "正在準備 Google Map..."
    : "設定 Google Maps API key 後會顯示真正的 Google Map。",
  isLocating: false,
  isSearchingPlaces: false,
  apiKeyDraft: "",
  photoViewer: null
};

let mapRenderToken = 0;
let detailRequestToken = 0;
const app = document.querySelector("#app");

function init() {
  state.apiKeyDraft = getStoredGoogleMapsApiKey();
  state.restaurants = state.restaurants.map(normalizeRestaurant);
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
      restaurant.address,
      ...(restaurant.tags ?? [])
    ].filter(Boolean).join(" ").toLowerCase();
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
  void loadRestaurantDetail(restaurant);
}

async function loadRestaurantDetail(restaurant) {
  if (!restaurant.placeId || !hasGoogleMapsApiKey()) return;
  if (restaurant.reviewItems?.length || restaurant.phone || restaurant.website || restaurant.detailLoading) return;

  const token = ++detailRequestToken;
  state.detail = { ...restaurant, detailLoading: true, detailError: null };
  state.selected = state.selected?.id === restaurant.id ? state.detail : state.selected;
  state.restaurants = state.restaurants.map((item) => (
    item.id === restaurant.id ? { ...item, detailLoading: true, detailError: null } : item
  ));
  render();

  try {
    const detail = await fetchRestaurantDetail(restaurant.placeId, state.userLocation);
    if (token !== detailRequestToken || state.selected?.id !== restaurant.id) return;

    const merged = mergeRestaurantDetail(state.restaurants, restaurant, detail);
    state.restaurants = merged.restaurants;
    state.selected = merged.selected;
    state.detail = merged.detail;
  } catch (error) {
    if (token !== detailRequestToken || state.selected?.id !== restaurant.id) return;

    const message = error instanceof Error ? error.message : "Google Place Details 載入失敗。";
    state.detail = { ...restaurant, detailLoading: false, detailError: message };
    state.selected = state.detail;
    state.restaurants = state.restaurants.map((item) => (
      item.id === restaurant.id ? { ...item, detailLoading: false, detailError: message } : item
    ));
  } finally {
    render();
  }
}

async function requestBrowserLocation() {
  if (!("geolocation" in navigator)) {
    state.locationStatus = "這個瀏覽器不支援定位，會繼續使用預設位置。";
    render();
    return;
  }

  state.isLocating = true;
  state.locationStatus = "正在向瀏覽器要求 GPS 權限，最多等待 20 秒取得較精準的位置...";
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
      : `目前只能取得約 ${accuracy} 公尺的粗略定位，暫停 Google Places 搜尋以避免推薦到錯誤區域。`;

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
    state.restaurants = sampleRestaurants.map(normalizeRestaurant);
    state.placesStatus = "已清除 API key，目前回到 MVP 假資料。";
    state.mapStatus = "設定 Google Maps API key 後會顯示真正的 Google Map。";
    refreshSelection();
    render();
    return;
  }

  state.placesStatus = "已儲存 API key，正在嘗試搜尋目前位置附近餐廳。";
  state.mapStatus = "正在準備 Google Map...";
  render();
  await loadPlacesForCurrentLocation();
}

async function loadPlacesForCurrentLocation() {
  if (!canSearchWithCurrentLocation()) {
    state.placesStatus = state.locationAccuracy === null
      ? "請先取得 GPS 位置，再搜尋 Google Places 附近餐廳。"
      : `定位精準度約 ${state.locationAccuracy} 公尺，超過 ${MAX_SEARCH_ACCURACY_METERS} 公尺門檻，暫停 Google Places 搜尋。`;
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
    state.restaurants = googleRestaurants.map(normalizeRestaurant);
    state.category = "全部";
    state.query = "";
    state.placesStatus = `已從 Google Places 取得 ${googleRestaurants.length} 間附近餐廳。`;
    refreshSelection();
    if (state.selected) void loadRestaurantDetail(state.selected);
  } catch (error) {
    state.placesStatus = error instanceof Error ? error.message : "Google Places 搜尋失敗。";
  } finally {
    state.isSearchingPlaces = false;
    render();
  }
}

function useSampleData() {
  state.source = "sample";
  state.restaurants = sampleRestaurants.map(normalizeRestaurant);
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
        <p>取得定位並設定 Google Maps API key 後，推薦來源會從假資料切換成 Google Places，地圖、照片、評論和價位也會使用 Google 資料。</p>
      </div>
      ${setupPanelTemplate()}
    </section>

    <section class="dashboard">
      <div class="main-column">
        ${selected ? recommendationTemplate(state.detail ?? selected) : emptyTemplate()}
        ${mapTemplate(selected, candidates)}
        ${filterTemplate()}
        ${nearbyTemplate(candidates, selected)}
      </div>
    </section>

    ${photoViewerTemplate()}
  `;

  bindEvents();
  void hydrateGoogleMap(selected, candidates);
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
        <p>${escapeHtml(state.locationStatus)}</p>
        <p>${escapeHtml(state.placesStatus)}</p>
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
          ${state.isSearchingPlaces ? "搜尋中..." : "儲存並搜尋附近餐廳"}
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
          ${categories().map((category) => `<option value="${escapeHtml(category)}" ${category === state.category ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}
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
  const photos = restaurant.photos?.length ? restaurant.photos : [restaurant.image].filter(Boolean);
  const reviews = restaurant.reviewItems?.length
    ? restaurant.reviewItems
    : restaurant.review
      ? [{
          id: `${restaurant.id}-sample-review`,
          author: restaurant.review.author,
          rating: restaurant.review.rating,
          time: restaurant.review.time,
          text: restaurant.review.text
        }]
      : [];
  const mapsUrl = buildGoogleMapsUrl(restaurant);

  return `
    <article class="recommendation-card">
      <div class="recommendation-photo-panel">
        <button class="photo-button primary-photo" type="button" data-photo="${escapeHtml(restaurant.image)}" data-photo-alt="${escapeHtml(restaurant.name)} 主照片">
          <img src="${escapeHtml(restaurant.image)}" alt="${escapeHtml(restaurant.name)} 招牌餐點" />
        </button>
        <div class="photo-strip compact-photos" aria-label="${escapeHtml(restaurant.name)} 照片">
          ${photos.map((photo, index) => `
            <button class="photo-button" type="button" data-photo="${escapeHtml(photo)}" data-photo-alt="${escapeHtml(restaurant.name)} 照片 ${index + 1}">
              <img src="${escapeHtml(photo)}" alt="${escapeHtml(restaurant.name)} 照片 ${index + 1}" />
            </button>
          `).join("")}
        </div>
      </div>
      <div class="recommendation-content">
        <div class="section-title">
          <span>最佳推薦</span>
          <strong>${restaurantScore} 分</strong>
        </div>
        <h2>${escapeHtml(restaurant.name)}</h2>
        <p>${escapeHtml(restaurant.category)} / ${escapeHtml(restaurant.signature)}</p>
        <div class="metrics">
          <span><b>${formatRating(restaurant.rating)}</b> 評分</span>
          <span><b>${Number(restaurant.reviews ?? 0).toLocaleString()}</b> 則評論</span>
          <span><b>${formatDistance(restaurant)}</b> 距離</span>
          <span><b>${formatGooglePriceLevel(restaurant.priceLevel)}</b> 平均價位</span>
        </div>
        <div class="status-line">
          <span class="${restaurant.open === false ? "is-closed" : "is-open"}">${openLabel}</span>
          <span>${escapeHtml(restaurant.closesAt)}</span>
          <span>${escapeHtml(restaurant.price)}</span>
        </div>
        <div class="tag-row">
          ${(restaurant.tags ?? []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
        </div>
        ${restaurant.detailLoading ? `<p class="detail-status">正在載入 Google Place Details...</p>` : ""}
        ${restaurant.detailError ? `<p class="detail-error">${escapeHtml(restaurant.detailError)}</p>` : ""}
        <div class="detail-info">
          <p>${escapeHtml(restaurant.address ?? restaurant.signature ?? "Google 尚未提供地址。")}</p>
          ${restaurant.phone ? `<a href="tel:${escapeHtml(restaurant.phone)}">${escapeHtml(restaurant.phone)}</a>` : ""}
          ${restaurant.website ? `<a href="${escapeHtml(restaurant.website)}" target="_blank" rel="noopener noreferrer">官方網站</a>` : ""}
          <a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">在 Google Maps 開啟</a>
        </div>
        <div class="review-heading">
          <h4>Google 最相關評論，最多 5 則</h4>
          <span>Place Details 回傳限制</span>
        </div>
        <div class="review-list">
          ${reviews.length
            ? reviews.map(reviewTemplate).join("")
            : `<p class="empty-copy">Google 目前沒有提供可顯示評論。</p>`}
        </div>
        <div class="actions">
          <button class="primary-button" id="open-maps" type="button">開啟 Google Maps</button>
          <button class="secondary-button" id="shuffle" type="button">換一間</button>
        </div>
      </div>
    </article>
  `;
}

function mapTemplate(selected, candidates) {
  const hasKey = hasGoogleMapsApiKey();

  return `
    <section class="map-section" aria-label="附近餐廳 Google Map">
      <div class="map-header">
        <div>
          <span class="eyebrow">附近範圍</span>
          <h3>${escapeHtml(locationLabel(state.userLocation))}</h3>
        </div>
        <strong>${candidates.length} 間候選</strong>
      </div>
      <div class="google-map-canvas" id="google-map" role="application" aria-label="Google Map">
        ${hasKey ? `<span class="map-loading">正在載入 Google Map...</span>` : mapFallbackTemplate()}
      </div>
      <p class="map-note">${escapeHtml(state.mapStatus)}</p>
    </section>
  `;
}

function mapFallbackTemplate() {
  return `
    <div class="map-fallback">
      <strong>尚未啟用 Google Map</strong>
      <span>貼上 Google Maps API key 並取得定位後，這裡會顯示真正的地圖與店家標記。</span>
    </div>
  `;
}

function nearbyTemplate(candidates, selected) {
  const rows = candidates.map((restaurant, index) => {
    const openLabel = restaurant.open === true ? "營業中" : restaurant.open === false ? "休息" : "未知";

    return `
      <button class="restaurant-row ${restaurant.id === selected?.id ? "active" : ""}" type="button" data-restaurant="${escapeHtml(restaurant.id)}">
        <span class="rank">${index + 1}</span>
        <img src="${escapeHtml(restaurant.image)}" alt="${escapeHtml(restaurant.name)}" />
        <span class="restaurant-copy">
          <b>${escapeHtml(restaurant.name)}</b>
          <small>${escapeHtml(restaurant.signature)} / ${formatDistance(restaurant)} / ${formatGooglePriceLevel(restaurant.priceLevel)}</small>
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

  const photos = restaurant.photos?.length ? restaurant.photos : [restaurant.image].filter(Boolean);
  const reviews = restaurant.reviewItems?.length
    ? restaurant.reviewItems
    : restaurant.review
      ? [{
          id: `${restaurant.id}-sample-review`,
          author: restaurant.review.author,
          rating: restaurant.review.rating,
          time: restaurant.review.time,
          text: restaurant.review.text
        }]
      : [];
  const mapsUrl = buildGoogleMapsUrl(restaurant);

  return `
    <section class="detail-card">
      <div class="card-heading">
        <h3>店家詳情</h3>
        <span>${escapeHtml(restaurant.category)}</span>
      </div>
      ${restaurant.detailLoading ? `<p class="detail-status">正在載入 Google Place Details...</p>` : ""}
      ${restaurant.detailError ? `<p class="detail-error">${escapeHtml(restaurant.detailError)}</p>` : ""}
      <div class="photo-strip">
        ${photos.map((photo) => `<img src="${escapeHtml(photo)}" alt="${escapeHtml(restaurant.name)} 照片" />`).join("")}
      </div>
      <div class="detail-grid">
        <span><b>${formatRating(restaurant.rating)}</b> 星評分</span>
        <span><b>${Number(restaurant.reviews ?? 0).toLocaleString()}</b> 則評論</span>
        <span><b>${formatGooglePriceLevel(restaurant.priceLevel)}</b> 平均價位</span>
        <span><b>${restaurant.open === true ? "營業中" : restaurant.open === false ? "休息" : "未知"}</b> 營業狀態</span>
      </div>
      <div class="detail-info">
        <p>${escapeHtml(restaurant.address ?? restaurant.signature ?? "Google 尚未提供地址。")}</p>
        ${restaurant.phone ? `<a href="tel:${escapeHtml(restaurant.phone)}">${escapeHtml(restaurant.phone)}</a>` : ""}
        ${restaurant.website ? `<a href="${escapeHtml(restaurant.website)}" target="_blank" rel="noopener noreferrer">官方網站</a>` : ""}
        <a href="${escapeHtml(mapsUrl)}" target="_blank" rel="noopener noreferrer">在 Google Maps 開啟</a>
      </div>
      <div class="review-heading">
        <h4>Google 最相關評論，最多 5 則</h4>
        <span>Place Details 回傳限制</span>
      </div>
      ${reviews.length
        ? reviews.map(reviewTemplate).join("")
        : `<p class="empty-copy">Google 目前沒有提供可顯示評論。</p>`}
    </section>
  `;
}

function reviewTemplate(review) {
  return `
    <article class="review-card">
      <div class="avatar">${escapeHtml(String(review.author ?? "G").slice(0, 1))}</div>
      <div>
        <strong>${escapeHtml(review.author ?? "Google 使用者")}</strong>
        <span>${formatRating(review.rating)} 星 / ${escapeHtml(review.time ?? "時間未知")}</span>
        <p>${escapeHtml(review.text ?? "")}</p>
      </div>
    </article>
  `;
}

function photoViewerTemplate() {
  if (!state.photoViewer) return "";

  return `
    <div class="photo-viewer" id="photo-viewer" role="dialog" aria-modal="true" aria-label="照片全圖">
      <button class="photo-viewer-close" id="photo-viewer-close" type="button" aria-label="關閉照片">×</button>
      <img src="${escapeHtml(state.photoViewer.url)}" alt="${escapeHtml(state.photoViewer.alt)}" />
    </div>
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
  document.querySelector("#open-maps")?.addEventListener("click", () => {
    const restaurant = state.detail ?? state.selected;
    if (restaurant) window.open(buildGoogleMapsUrl(restaurant), "_blank", "noopener,noreferrer");
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
  document.querySelectorAll("[data-photo]").forEach((button) => {
    button.addEventListener("click", () => {
      state.photoViewer = {
        url: button.dataset.photo,
        alt: button.dataset.photoAlt ?? "店家照片"
      };
      render();
    });
  });
  document.querySelector("#photo-viewer-close")?.addEventListener("click", () => {
    state.photoViewer = null;
    render();
  });
  document.querySelector("#photo-viewer")?.addEventListener("click", (event) => {
    if (event.target.id === "photo-viewer") {
      state.photoViewer = null;
      render();
    }
  });
}

async function hydrateGoogleMap(selected, candidates) {
  const element = document.querySelector("#google-map");
  if (!element) return;

  if (!hasGoogleMapsApiKey()) {
    state.mapStatus = "設定 Google Maps API key 後會顯示真正的 Google Map。";
    return;
  }

  const token = ++mapRenderToken;

  try {
    element.textContent = "";
    await renderGoogleRestaurantMap(element, {
      userLocation: state.userLocation,
      restaurants: candidates,
      selectedRestaurant: selected,
      onSelect: (id) => selectRestaurant(id)
    });
    if (token !== mapRenderToken) return;
    state.mapStatus = "已載入 Google Map；點選標記會自動開啟 Google Maps 店家頁。";
    document.querySelector(".map-note").textContent = state.mapStatus;
  } catch (error) {
    if (token !== mapRenderToken) return;
    state.mapStatus = error instanceof Error ? error.message : "Google Map 載入失敗。";
    element.innerHTML = mapFallbackTemplate();
    document.querySelector(".map-note").textContent = state.mapStatus;
  }
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

function normalizeRestaurant(restaurant) {
  const reviewItems = restaurant.reviewItems ?? (
    restaurant.review
      ? [{
          id: `${restaurant.id}-review`,
          author: restaurant.review.author,
          rating: restaurant.review.rating,
          time: restaurant.review.time,
          text: restaurant.review.text
        }]
      : []
  );

  return {
    ...restaurant,
    priceLevel: restaurant.priceLevel ?? priceLevelFromLabel(restaurant.price),
    googleMapsUrl: restaurant.googleMapsUrl ?? buildGoogleMapsUrl(restaurant),
    reviewItems
  };
}

function priceLevelFromLabel(price) {
  if (!price) return null;
  const level = String(price).replace("NT", "").length;
  return level > 0 ? level : null;
}

function formatDistance(restaurant) {
  const meters = distanceMeters(state.userLocation, { lat: restaurant.lat, lng: restaurant.lng });
  return `${Math.round(meters)} 公尺`;
}

function formatRating(value) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "--";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

init();
