import { distanceMeters, nextRecommendation, rankRestaurants, restaurantById } from "./foodMapLogic.mjs";
import { restaurants, userLocation } from "./restaurants.mjs";

const state = {
  seen: new Set(),
  selected: null,
  detail: null,
  ranked: rankRestaurants(restaurants, userLocation)
};

const app = document.querySelector("#app");

function init() {
  state.selected = nextRecommendation(restaurants, userLocation, state.seen);
  if (state.selected) state.seen.add(state.selected.id);
  render();
}

function pickNext() {
  if (state.seen.size >= restaurants.length) state.seen.clear();
  state.selected = nextRecommendation(restaurants, userLocation, state.seen);
  if (state.selected) state.seen.add(state.selected.id);
  state.detail = null;
  render();
}

function showDetail(id) {
  state.detail = restaurantById(restaurants, id);
  render();
}

function closeDetail() {
  state.detail = null;
  render();
}

function render() {
  const selected = state.selected;
  app.innerHTML = `
    <header class="status-bar" aria-hidden="true">
      <span>9:41</span>
      <span class="status-icons">●●●  Wi-Fi  ▰</span>
    </header>
    <header class="top-bar">
      <h1>美食地圖</h1>
      <nav aria-label="工具">
        <button class="icon-tab" type="button" aria-label="地圖"><span>♢</span><small>地圖</small></button>
        <button class="icon-tab" type="button" aria-label="篩選"><span>☷</span><small>篩選</small></button>
      </nav>
    </header>
    <section class="location-row">
      <div class="location-copy"><span class="pin">●</span>${userLocation.label}<span class="chevron">⌄</span></div>
      <button class="text-action" id="refresh" type="button">↻ 重新推薦</button>
    </section>
    ${selected ? recommendationTemplate(selected) : emptyTemplate()}
    ${mapTemplate(selected)}
    ${nearbyTemplate(selected)}
    ${detailTemplate(state.detail ?? selected)}
  `;

  document.querySelector("#refresh")?.addEventListener("click", pickNext);
  document.querySelector("#accept")?.addEventListener("click", () => showDetail(selected.id));
  document.querySelector("#shuffle")?.addEventListener("click", pickNext);
  document.querySelectorAll("[data-restaurant]").forEach((button) => {
    button.addEventListener("click", () => showDetail(button.dataset.restaurant));
  });
  document.querySelector("#close-detail")?.addEventListener("click", closeDetail);
}

function recommendationTemplate(restaurant) {
  return `
    <section class="recommendation-section">
      <div class="section-title">
        <strong>今天吃這間</strong>
        <span>為你精選，不用再想！</span>
      </div>
      <article class="hero-card">
        <img src="${restaurant.image}" alt="${restaurant.name} 招牌餐點" />
        <div class="hero-info">
          <h2>${restaurant.name}</h2>
          <p>${restaurant.category} ・ ${restaurant.signature}</p>
          <div class="metric star">★ <b>${restaurant.rating.toFixed(1)}</b><span>(${restaurant.reviews.toLocaleString()} 則評論)</span></div>
          <div class="metric open">◷ <b>營業中</b><span>營業至 ${restaurant.closesAt}</span></div>
          <div class="metric">● <span>距離 ${formatDistance(restaurant)} ・ 步行 ${restaurant.walkMinutes} 分鐘</span></div>
          <div class="metric">ⓘ <span>${restaurant.price} ・ 平價</span></div>
          <div class="hero-actions">
            <button class="primary-button" id="accept" type="button">就吃這間</button>
            <button class="secondary-button" id="shuffle" type="button">↻ 換一家</button>
          </div>
        </div>
      </article>
    </section>
  `;
}

function mapTemplate(selected) {
  return `
    <section class="map-card" aria-label="附近地圖示意">
      <div class="map-grid"></div>
      <span class="map-label city">新竹市政府</span>
      <span class="map-label mall">遠東巨城購物中心</span>
      <span class="map-pin selected" style="left: 52%; top: 36%;">🍴</span>
      <span class="map-pin" style="left: 24%; top: 68%;">🍴</span>
      <span class="map-pin orange" style="left: 78%; top: 48%;">🍴</span>
      <span class="user-dot" style="left: 43%; top: 62%;"></span>
      <strong>${selected?.name ?? "新竹市中心"}</strong>
    </section>
  `;
}

function nearbyTemplate(selected) {
  const rows = state.ranked
    .filter((restaurant) => restaurant.id !== selected?.id)
    .slice(0, 3)
    .map((restaurant) => `
      <button class="nearby-row" type="button" data-restaurant="${restaurant.id}">
        <img src="${restaurant.image}" alt="${restaurant.name}" />
        <span class="nearby-copy">
          <b>${restaurant.name}</b>
          <small>★ ${restaurant.rating.toFixed(1)} (${restaurant.reviews.toLocaleString()}) ・ ${formatDistance(restaurant)} ・ ${restaurant.price}</small>
        </span>
        <span class="open-copy">營業中</span>
        <span class="row-chevron">›</span>
      </button>
    `)
    .join("");

  return `
    <section class="nearby-card">
      <div class="card-heading">
        <h3>附近其他選擇</h3>
        <button type="button">查看全部</button>
      </div>
      ${rows}
    </section>
  `;
}

function detailTemplate(restaurant) {
  if (!restaurant) return "";
  return `
    <section class="detail-sheet" aria-label="店家照片與評論">
      <div class="grabber"></div>
      <div class="card-heading">
        <h3>店家照片與評論</h3>
        <button id="close-detail" type="button">${state.detail ? "收合" : "全部評論"}</button>
      </div>
      <div class="photo-strip">
        ${restaurant.photos.map((photo) => `<img src="${photo}" alt="${restaurant.name} 照片" />`).join("")}
      </div>
      <article class="review-card">
        <div class="avatar"></div>
        <div>
          <strong>${restaurant.review.author}</strong>
          <span>★ ${restaurant.review.rating.toFixed(1)}　${restaurant.review.time}</span>
          <p>${restaurant.review.text}</p>
        </div>
        <button type="button" aria-label="更多評論">•••</button>
      </article>
    </section>
  `;
}

function emptyTemplate() {
  return `<section class="empty-card">附近暫時找不到餐廳，稍後再試。</section>`;
}

function formatDistance(restaurant) {
  const meters = distanceMeters(userLocation, { lat: restaurant.lat, lng: restaurant.lng });
  return `${Math.round(meters)} 公尺`;
}

init();
