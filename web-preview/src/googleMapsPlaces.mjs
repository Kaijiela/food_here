let loaderPromise = null;
let hiddenMap = null;

export function hasGoogleMapsApiKey() {
  return Boolean(getStoredGoogleMapsApiKey());
}

export function getStoredGoogleMapsApiKey() {
  return window.localStorage.getItem("foodmap.googleMapsApiKey")?.trim() ?? "";
}

export function storeGoogleMapsApiKey(apiKey) {
  const value = apiKey.trim();

  if (value.length === 0) {
    window.localStorage.removeItem("foodmap.googleMapsApiKey");
    return;
  }

  window.localStorage.setItem("foodmap.googleMapsApiKey", value);
}

export async function searchNearbyRestaurants(location, options = {}) {
  const apiKey = getStoredGoogleMapsApiKey();
  if (!apiKey) {
    throw new Error("請先設定 Google Maps API key。");
  }

  await loadGoogleMaps(apiKey);
  const service = new window.google.maps.places.PlacesService(getHiddenMap(location));

  const results = await nearbySearch(service, {
    location: new window.google.maps.LatLng(location.lat, location.lng),
    radius: options.radius ?? 1500,
    type: "restaurant",
    keyword: options.keyword ?? "餐廳"
  });

  return results
    .filter((place) => place.geometry?.location && place.place_id && place.name)
    .slice(0, options.limit ?? 12)
    .map((place, index) => placeToRestaurant(place, location, index));
}

function loadGoogleMaps(apiKey) {
  if (window.google?.maps?.places) return Promise.resolve();
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise((resolve, reject) => {
    const callbackName = "__foodMapGoogleMapsReady";
    const existingScript = document.querySelector("script[data-foodmap-google-maps]");

    window[callbackName] = () => {
      resolve();
      delete window[callbackName];
    };

    if (existingScript) return;

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      libraries: "places",
      language: "zh-TW",
      region: "TW",
      loading: "async",
      callback: callbackName
    });

    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.dataset.foodmapGoogleMaps = "true";
    script.onerror = () => {
      loaderPromise = null;
      reject(new Error("Google Maps JavaScript API 載入失敗，請確認 API key、網域限制與網路狀態。"));
    };

    document.head.append(script);
  });

  return loaderPromise;
}

function getHiddenMap(location) {
  if (hiddenMap) return hiddenMap;

  const element = document.createElement("div");
  element.hidden = true;
  document.body.append(element);

  hiddenMap = new window.google.maps.Map(element, {
    center: { lat: location.lat, lng: location.lng },
    zoom: 15,
    disableDefaultUI: true
  });

  return hiddenMap;
}

function nearbySearch(service, request) {
  return new Promise((resolve, reject) => {
    service.nearbySearch(request, (results, status) => {
      const placesStatus = window.google.maps.places.PlacesServiceStatus;

      if (status === placesStatus.OK || status === placesStatus.ZERO_RESULTS) {
        resolve(results ?? []);
        return;
      }

      reject(new Error(`Google Places Nearby Search 失敗：${status}`));
    });
  });
}

function placeToRestaurant(place, userLocation, index) {
  const lat = place.geometry.location.lat();
  const lng = place.geometry.location.lng();
  const photo = place.photos?.[0]?.getUrl({ maxWidth: 900, maxHeight: 700 });
  const fallbackImages = [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=900&q=80"
  ];
  const distance = distanceMeters(userLocation, { lat, lng });
  const open = place.opening_hours?.isOpen?.() ?? place.opening_hours?.open_now;

  return {
    id: `google-${place.place_id}`,
    placeId: place.place_id,
    name: place.name,
    category: categoryFromTypes(place.types),
    signature: place.vicinity ?? "Google Places 附近餐廳",
    lat,
    lng,
    rating: place.rating ?? 4,
    reviews: place.user_ratings_total ?? 0,
    open: typeof open === "boolean" ? open : undefined,
    closesAt: "Google 資料",
    price: priceFromLevel(place.price_level),
    walkMinutes: Math.max(1, Math.round(distance / 80)),
    tags: ["Google Places", "附近", `${Math.round(distance)} 公尺`],
    image: photo ?? fallbackImages[index % fallbackImages.length],
    photos: [photo ?? fallbackImages[index % fallbackImages.length]],
    review: {
      author: "Google Places",
      rating: place.rating ?? 4,
      time: "即時附近搜尋",
      text: place.vicinity
        ? `地址或商圈：${place.vicinity}`
        : "這筆資料由 Google Places Nearby Search 回傳。"
    }
  };
}

function categoryFromTypes(types = []) {
  if (types.includes("cafe")) return "咖啡";
  if (types.includes("bakery")) return "麵包甜點";
  if (types.includes("meal_takeaway")) return "外帶";
  if (types.includes("bar")) return "酒吧";
  return "餐廳";
}

function priceFromLevel(level) {
  if (typeof level !== "number") return "NT$";
  return "NT" + "$".repeat(Math.max(1, Math.min(level, 4)));
}

function distanceMeters(from, to) {
  const radius = 6371000;
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return radius * c;
}

function toRadians(value) {
  return value * Math.PI / 180;
}
