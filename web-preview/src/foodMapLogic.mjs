const EARTH_RADIUS_METERS = 6371000;

export function distanceMeters(from, to) {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);

  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export function rankRestaurants(restaurants, userLocation) {
  return [...restaurants].sort((left, right) => score(right, userLocation) - score(left, userLocation));
}

export function nextRecommendation(restaurants, userLocation, alreadySeenIds) {
  const candidates = restaurants.filter((restaurant) => !alreadySeenIds.has(restaurant.id));
  if (candidates.length === 0) return null;
  return rankRestaurants(candidates, userLocation)[0];
}

export function restaurantById(restaurants, id) {
  return restaurants.find((restaurant) => restaurant.id === id) ?? null;
}

export function locationLabel(location) {
  if (location.label) return location.label;
  return `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`;
}

export function score(restaurant, userLocation) {
  const distance = distanceMeters(userLocation, { lat: restaurant.lat, lng: restaurant.lng });
  const ratingScore = ((restaurant.rating ?? 3.5) - 3) / 2;
  const confidenceScore = Math.min(Math.log10(Math.max(restaurant.reviews ?? 1, 1)) / 3, 1);
  const distanceScore = Math.max(0, 1 - distance / 3000);
  const openScore = restaurant.open === true ? 1 : restaurant.open === false ? -0.75 : 0.2;

  return ratingScore * 0.42
    + confidenceScore * 0.18
    + distanceScore * 0.3
    + openScore * 0.08;
}

function toRadians(value) {
  return value * Math.PI / 180;
}
