let loaderPromise = null;
let hiddenMap = null;
let visibleMap = null;
let visibleMapElement = null;
let visibleInfoWindow = null;
let visibleMarkers = [];

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

export async function fetchRestaurantDetail(placeId, userLocation) {
  const apiKey = getStoredGoogleMapsApiKey();
  if (!apiKey) {
    throw new Error("請先設定 Google Maps API key。");
  }

  await loadGoogleMaps(apiKey);
  const service = new window.google.maps.places.PlacesService(getHiddenMap(userLocation));
  const place = await placeDetails(service, {
    placeId,
    language: "zh-TW",
    region: "TW",
    fields: [
      "place_id",
      "name",
      "formatted_address",
      "geometry.location",
      "rating",
      "user_ratings_total",
      "price_level",
      "opening_hours",
      "formatted_phone_number",
      "website",
      "url",
      "photos",
      "reviews",
      "types",
      "vicinity"
    ]
  });

  return placeToRestaurantDetail(place, userLocation);
}

export async function renderGoogleRestaurantMap(element, options) {
  const apiKey = getStoredGoogleMapsApiKey();
  if (!apiKey) {
    throw new Error("請先設定 Google Maps API key。");
  }

  await loadGoogleMaps(apiKey);

  const { userLocation, restaurants, selectedRestaurant, onSelect } = options;
  const center = selectedRestaurant
    ? { lat: selectedRestaurant.lat, lng: selectedRestaurant.lng }
    : { lat: userLocation.lat, lng: userLocation.lng };

  if (!visibleMap || visibleMapElement !== element) {
    visibleMapElement = element;
    visibleMap = new window.google.maps.Map(element, {
      center,
      zoom: selectedRestaurant ? 16 : 15,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false
    });
    visibleInfoWindow = new window.google.maps.InfoWindow();
  } else {
    visibleMap.setCenter(center);
    visibleMap.setZoom(selectedRestaurant ? 16 : 15);
  }

  visibleMarkers.forEach((marker) => marker.setMap(null));
  visibleMarkers = [];

  const userMarker = new window.google.maps.Marker({
    position: { lat: userLocation.lat, lng: userLocation.lng },
    map: visibleMap,
    title: "目前位置",
    icon: {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: "#2167c7",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 3
    },
    zIndex: 10
  });
  visibleMarkers.push(userMarker);

  const bounds = new window.google.maps.LatLngBounds();
  bounds.extend(userMarker.getPosition());

  restaurants.slice(0, 20).forEach((restaurant) => {
    const isSelected = restaurant.id === selectedRestaurant?.id;
    const marker = new window.google.maps.Marker({
      position: { lat: restaurant.lat, lng: restaurant.lng },
      map: visibleMap,
      title: restaurant.name,
      label: {
        text: isSelected ? "✓" : "•",
        color: "#ffffff",
        fontWeight: "900"
      },
      icon: {
        path: window.google.maps.SymbolPath.CIRCLE,
        scale: isSelected ? 13 : 10,
        fillColor: isSelected ? "#e84242" : "#bc7b12",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3
      },
      zIndex: isSelected ? 9 : 5
    });

    marker.addListener("click", () => {
      onSelect?.(restaurant.id);
      visibleInfoWindow.setContent(infoWindowTemplate(restaurant));
      visibleInfoWindow.open({ map: visibleMap, anchor: marker });
      window.open(buildGoogleMapsUrl(restaurant), "_blank", "noopener,noreferrer");
    });

    visibleMarkers.push(marker);
    bounds.extend(marker.getPosition());
  });

  if (restaurants.length > 0 && !selectedRestaurant) {
    visibleMap.fitBounds(bounds, 48);
  }
}

export function buildGoogleMapsUrl(restaurant) {
  if (restaurant.googleMapsUrl) return restaurant.googleMapsUrl;
  if (restaurant.placeId) {
    return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(restaurant.placeId)}`;
  }

  const query = [restaurant.name, restaurant.lat, restaurant.lng].filter(Boolean).join(" ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function formatGooglePriceLevel(level) {
  if (level === null || level === undefined || Number.isNaN(Number(level))) return "未提供";
  const normalized = Number(level);
  if (normalized <= 0) return "免費或未標示";
  return `NT${"$".repeat(Math.max(1, Math.min(normalized, 4)))}`;
}

export function mergeRestaurantDetail(restaurants, selectedRestaurant, detail) {
  const merged = {
    ...selectedRestaurant,
    ...detail,
    id: selectedRestaurant.id,
    placeId: selectedRestaurant.placeId ?? detail.placeId,
    image: detail.image ?? selectedRestaurant.image,
    photos: detail.photos?.length ? detail.photos : selectedRestaurant.photos,
    detailLoading: false,
    detailError: null
  };

  return {
    restaurants: restaurants.map((restaurant) => (
      restaurant.id === selectedRestaurant.id ? { ...restaurant, ...merged } : restaurant
    )),
    selected: merged,
    detail: merged
  };
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

function placeDetails(service, request) {
  return new Promise((resolve, reject) => {
    service.getDetails(request, (place, status) => {
      const placesStatus = window.google.maps.places.PlacesServiceStatus;

      if (status === placesStatus.OK && place) {
        resolve(place);
        return;
      }

      reject(new Error(`Google Place Details 失敗：${status}`));
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
    priceLevel: place.price_level,
    googleMapsUrl: buildGoogleMapsUrl({ placeId: place.place_id, name: place.name, lat, lng }),
    address: place.vicinity,
    walkMinutes: Math.max(1, Math.round(distance / 80)),
    tags: ["Google Places", "附近", `${Math.round(distance)} 公尺`],
    image: photo ?? fallbackImages[index % fallbackImages.length],
    photos: [photo ?? fallbackImages[index % fallbackImages.length]],
    reviewItems: [],
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

function placeToRestaurantDetail(place, userLocation) {
  const lat = place.geometry?.location?.lat?.() ?? userLocation.lat;
  const lng = place.geometry?.location?.lng?.() ?? userLocation.lng;
  const photos = (place.photos ?? [])
    .slice(0, 8)
    .map((photo) => photo.getUrl({ maxWidth: 1200, maxHeight: 900 }));
  const reviewItems = (place.reviews ?? [])
    .slice(0, 5)
    .map((review, index) => ({
      id: `${place.place_id ?? place.name}-review-${index}`,
      author: review.author_name ?? "Google 使用者",
      rating: review.rating,
      time: review.relative_time_description ?? "",
      text: stripHtml(review.text ?? "")
    }))
    .filter((review) => review.text.length > 0);
  const distance = distanceMeters(userLocation, { lat, lng });
  const open = place.opening_hours?.isOpen?.() ?? place.opening_hours?.open_now;

  return {
    placeId: place.place_id,
    name: place.name,
    category: categoryFromTypes(place.types),
    signature: place.formatted_address ?? place.vicinity ?? "Google Places 店家詳情",
    lat,
    lng,
    rating: place.rating ?? 0,
    reviews: place.user_ratings_total ?? 0,
    open: typeof open === "boolean" ? open : undefined,
    closesAt: place.opening_hours?.weekday_text?.[0] ?? "Google 營業資訊",
    price: priceFromLevel(place.price_level),
    priceLevel: place.price_level,
    googleMapsUrl: place.url ?? buildGoogleMapsUrl({ placeId: place.place_id, name: place.name, lat, lng }),
    address: place.formatted_address ?? place.vicinity,
    phone: place.formatted_phone_number,
    website: place.website,
    walkMinutes: Math.max(1, Math.round(distance / 80)),
    tags: ["Google Details", formatGooglePriceLevel(place.price_level), `${Math.round(distance)} 公尺`],
    image: photos[0],
    photos,
    reviewItems,
    review: reviewItems[0]
      ? {
          author: reviewItems[0].author,
          rating: reviewItems[0].rating ?? place.rating ?? 0,
          time: reviewItems[0].time,
          text: reviewItems[0].text
        }
      : {
          author: "Google Places",
          rating: place.rating ?? 0,
          time: "最相關評論",
          text: "Google 目前沒有提供可顯示評論。"
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

function infoWindowTemplate(restaurant) {
  return `
    <strong>${escapeHtml(restaurant.name)}</strong>
    <div>${escapeHtml(restaurant.signature ?? restaurant.address ?? "")}</div>
    <small>${escapeHtml(formatGooglePriceLevel(restaurant.priceLevel))} / ${escapeHtml(String(restaurant.rating ?? "--"))} 星</small>
  `;
}

function stripHtml(value) {
  const element = document.createElement("div");
  element.innerHTML = value;
  return element.textContent?.trim() ?? "";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
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
