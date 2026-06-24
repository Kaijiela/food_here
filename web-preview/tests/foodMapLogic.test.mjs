import assert from "node:assert/strict";
import {
  distanceMeters,
  nextRecommendation,
  rankRestaurants,
  restaurantById
} from "../src/foodMapLogic.mjs";

const userLocation = { lat: 24.8016, lng: 120.9714 };

const restaurants = [
  {
    id: "far",
    name: "遠但熱門",
    lat: 24.85,
    lng: 120.99,
    rating: 4.9,
    reviews: 1500,
    open: true
  },
  {
    id: "balanced",
    name: "剛剛好小館",
    lat: 24.8021,
    lng: 120.972,
    rating: 4.5,
    reviews: 320,
    open: true
  },
  {
    id: "closed",
    name: "打烊美食",
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

assert.equal(restaurantById(restaurants, "closed").name, "打烊美食");
assert.equal(restaurantById(restaurants, "missing"), null);

console.log("foodMapLogic tests passed");
