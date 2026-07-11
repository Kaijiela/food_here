import {
  distanceMeters,
  nextRecommendation,
  rankRestaurants,
  restaurantById,
  score
} from "./foodMapLogic.mjs";
import { restaurants, userLocation } from "./restaurants.mjs";

const state = {
  seen: new Set(),
  selected: null,
  detail: null,
  query: "",
  category: "全部",
  openOnly: false
};

const app = document.querySelector("#app");
const categories = ["全部", ...new Set(restaurants.map((restaurant) => restaurant.category))];

function init() {
  state.selected = pickRecommendation(filteredRestaurants());
  state.detail = state.selected;
  render();
}

function filteredRestaurants() {
  const normalizedQuery = state.query.trim().toLowerCase();

  return restaurants.filter((restaurant) => {
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

  const recommendation = nextRecommendation(candidates, userLocation, state.seen)
    ?? rankRestaurants(candidates, userLocation)[0];
  state.seen.add(recommendation.id);
  return recommendation;
}

function shuffleRecommendation() {
  state.selected = pickRecommendation(filteredRestaurants());
  state.detail = state.selected;
  render();
}

function selectRestaurant(id) {
  const restaurant = restaurantById(restaurants, id);
  if (!restaurant) return;

  state.selected = restaurant;
  state.detail = restaurant;
  state.seen.add(restaurant.id);
  render();
}

function updateQuery(value) {
  state.query = value;
  state.seen.clear();
  state.selected = pickRecommendation(filteredRestaurants());
  state.detail = state.selected;
  render();
}

function updateCategory(value) {
  state.category = value;
  state.seen.clear();
  state.selected = pickRecommendation(filteredRestaurants());
  state.detail = state.selected;
  render();
}

function updateOpenOnly(value) {
  state.openOnly = value;
  state.seen.clear();
  state.selected = pickRecommendation(filteredRestaurants());
  state.detail = state.selected;
  render();
}

function render() {
  const candidates = rankRestaurants(filteredRestaurants(), userLocation);
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
        <h1>今天吃哪間，交給附近推薦。</h1>
        <p>用評分、評論量、距離與營業狀態幫你縮小選擇。這版先使用新竹市假資料，方便在 Windows 上快速預覽和調整產品流程。</p>
      </div>
      <form class="search-panel" id="filters">
        <label class="search-box">
          <span>搜尋</span>
          <input name="query" type="search" value="${escapeHtml(state.query)}" placeholder="輸入餐點、店名或標籤" autocomplete="off" />
        </label>
        <label class="select-box">
          <span>類型</span>
          <select name="category">
            ${categories.map((category) => `<option value="${category}" ${category === state.category ? "selected" : ""}>${category}</option>`).join("")}
          </select>
        </label>
        <label class="toggle-box">
          <input name="openOnly" type="checkbox" ${state.openOnly ? "checked" : ""} />
          <span>只看營業中</span>
        </label>
      </form>
    </section>

    <section class="dashboard">
      <div class="main-column">
        ${selected ? recommendationTemplate(selected) : emptyTemplate()}
        ${mapTemplate(selected, candidates)}
      </div>
      <aside class="side-column">
        ${nearbyTemplate(candidates, selected)}
        ${detailTemplate(state.detail ?? selected)}
      </aside>
    </section>
  `;

  document.querySelector("#shuffle")?.addEventListener("click", shuffleRecommendation);
  document.querySelector("#accept")?.addEventListener("click", () => {
    if (state.selected) selectRestaurant(state.selected.id);
  });
  document.querySelector("#filters")?.addEventListener("input", (event) => {
    if (event.target.name === "query") updateQuery(event.target.value);
    if (event.target.name === "openOnly") updateOpenOnly(event.target.checked);
  });
  document.querySelector("#filters")?.addEventListener("change", (event) => {
    if (event.target.name === "category") updateCategory(event.target.value);
  });
  document.querySelectorAll("[data-restaurant]").forEach((button) => {
    button.addEventListener("click", () => selectRestaurant(button.dataset.restaurant));
  });
}

function recommendationTemplate(restaurant) {
  const restaurantScore = Math.round(score(restaurant, userLocation) * 100);

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
          <span class="${restaurant.open ? "is-open" : "is-closed"}">${restaurant.open ? "營業中" : "目前休息"}</span>
          <span>營業至 ${restaurant.closesAt}</span>
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
  const pins = candidates.slice(0, 5).map((restaurant, index) => {
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
          <h3>${userLocation.label}</h3>
        </div>
        <strong>${candidates.length} 間候選</strong>
      </div>
      <div class="map-canvas">
        <span class="map-label station">新竹車站</span>
        <span class="map-label city">城隍廟商圈</span>
        <span class="map-label mall">巨城周邊</span>
        <span class="user-dot" aria-label="目前位置"></span>
        ${pins}
      </div>
    </section>
  `;
}

function nearbyTemplate(candidates, selected) {
  const rows = candidates.map((restaurant, index) => `
    <button class="restaurant-row ${restaurant.id === selected?.id ? "active" : ""}" type="button" data-restaurant="${restaurant.id}">
      <span class="rank">${index + 1}</span>
      <img src="${restaurant.image}" alt="${restaurant.name}" />
      <span class="restaurant-copy">
        <b>${restaurant.name}</b>
        <small>${restaurant.signature} / ${formatDistance(restaurant)} / ${restaurant.price}</small>
      </span>
      <span class="${restaurant.open ? "open-copy" : "closed-copy"}">${restaurant.open ? "營業中" : "休息"}</span>
    </button>
  `).join("");

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
        <span><b>${restaurant.closesAt}</b> 打烊</span>
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
      <p>目前資料是 MVP 假資料，可以先清空搜尋或切回全部類型。</p>
    </section>
  `;
}

function formatDistance(restaurant) {
  const meters = distanceMeters(userLocation, { lat: restaurant.lat, lng: restaurant.lng });
  return `${Math.round(meters)} 公尺`;
}

function pinPosition(restaurant, index) {
  const left = 50 + (restaurant.lng - userLocation.lng) * 2300 + index * 2;
  const top = 52 - (restaurant.lat - userLocation.lat) * 2300 + index * 1.5;

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
