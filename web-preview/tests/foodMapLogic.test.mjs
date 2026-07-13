import assert from "node:assert/strict";
import {
  distanceMeters,
  locationLabel,
  nextRecommendation,
  rankRestaurants,
  restaurantById
} from "../src/foodMapLogic.mjs";
import {
  buildGoogleMapsUrl,
  formatGooglePriceLevel,
  mergeRestaurantDetail
} from "../src/googleMapsPlaces.mjs";

const userLocation = { lat: 24.8016, lng: 120.9714 };

const restaurants = [
  {
    id: "far",
    name: "High Rated Far Away",
    lat: 24.85,
    lng: 120.99,
    rating: 4.9,
    reviews: 1500,
    open: true
  },
  {
    id: "balanced",
    name: "Balanced Nearby",
    lat: 24.8021,
    lng: 120.972,
    rating: 4.5,
    reviews: 320,
    open: true
  },
  {
    id: "closed",
    name: "Closed But Good",
    lat: 24.8019,
    lng: 120.9719,
    rating: 4.9,
    reviews: 900,
    open: false
  }
];

assert.equal(Math.round(distanceMeters(userLocation, { lat: 24.8094, lng: 120.9749 })), 937);

const ranked = rankRestaurants(restaurants, userLocation);
assert.equal(ranked[0].id, "balanced");

assert.equal(nextRecommendation(restaurants, userLocation, new Set()).id, "balanced");
assert.notEqual(nextRecommendation(restaurants, userLocation, new Set(["balanced"])).id, "balanced");
assert.equal(nextRecommendation(restaurants, userLocation, new Set(restaurants.map((item) => item.id))), null);

assert.equal(restaurantById(restaurants, "closed").name, "Closed But Good");
assert.equal(restaurantById(restaurants, "missing"), null);
assert.equal(locationLabel({ lat: 24.8016, lng: 120.9714, label: "目前位置" }), "目前位置");
assert.equal(locationLabel({ lat: 24.8016, lng: 120.9714 }), "24.80160, 120.97140");

assert.equal(
  buildGoogleMapsUrl({ placeId: "abc 123", name: "Test Shop", lat: 24.1, lng: 120.2 }),
  "https://www.google.com/maps/search/?api=1&query_place_id=abc%20123"
);
assert.equal(
  buildGoogleMapsUrl({ name: "Test Shop", lat: 24.1, lng: 120.2 }),
  "https://www.google.com/maps/search/?api=1&query=Test%20Shop%2024.1%20120.2"
);

assert.equal(formatGooglePriceLevel(0), "免費或未標示");
assert.equal(formatGooglePriceLevel(1), "NT$");
assert.equal(formatGooglePriceLevel(2), "NT$$");
assert.equal(formatGooglePriceLevel(3), "NT$$$");
assert.equal(formatGooglePriceLevel(4), "NT$$$$");
assert.equal(formatGooglePriceLevel(null), "未提供");

const selectedRestaurant = {
  id: "google-1",
  placeId: "google-place-1",
  name: "Nearby Noodles",
  lat: 24.8,
  lng: 120.9,
  rating: 4.2,
  reviews: 12,
  image: "fallback.jpg",
  photos: ["fallback.jpg"]
};
const detail = {
  placeId: "google-place-1",
  name: "Nearby Noodles Detail",
  rating: 4.8,
  reviews: 99,
  photos: ["detail.jpg"],
  reviewItems: [{ id: "review-1", author: "A", rating: 5, time: "today", text: "great" }]
};
const merged = mergeRestaurantDetail([selectedRestaurant, restaurants[0]], selectedRestaurant, detail);
assert.equal(merged.restaurants.length, 2);
assert.equal(merged.restaurants[0].id, "google-1");
assert.equal(merged.restaurants[0].rating, 4.8);
assert.equal(merged.selected.id, "google-1");
assert.equal(merged.detail.reviewItems.length, 1);

console.log("foodMapLogic tests passed");
