import XCTest
@testable import FoodMapCore

final class RecommendationEngineTests: XCTestCase {
    func testDistanceUsesHaversineMeters() {
        let hsinchuStation = Coordinate(latitude: 24.8016, longitude: 120.9714)
        let bigCity = Coordinate(latitude: 24.8094, longitude: 120.9749)

        let distance = hsinchuStation.distance(to: bigCity)

        XCTAssertEqual(distance, 920, accuracy: 80)
    }

    func testRecommendationPrefersOpenHighlyRatedNearbyRestaurants() {
        let user = Coordinate(latitude: 24.8016, longitude: 120.9714)
        let engine = RecommendationEngine(randomSeed: 42)
        let restaurants = [
            RestaurantSummary(
                id: "far",
                name: "遠但熱門",
                coordinate: Coordinate(latitude: 24.8500, longitude: 120.9900),
                rating: 4.8,
                userRatingCount: 1_200,
                priceLevel: 2,
                isOpenNow: true,
                photoReference: nil,
                reviewSnippet: nil,
                address: "新竹市"
            ),
            RestaurantSummary(
                id: "balanced",
                name: "剛剛好小館",
                coordinate: Coordinate(latitude: 24.8021, longitude: 120.9720),
                rating: 4.5,
                userRatingCount: 320,
                priceLevel: 2,
                isOpenNow: true,
                photoReference: nil,
                reviewSnippet: nil,
                address: "新竹市"
            ),
            RestaurantSummary(
                id: "closed",
                name: "打烊美食",
                coordinate: Coordinate(latitude: 24.8019, longitude: 120.9719),
                rating: 4.9,
                userRatingCount: 900,
                priceLevel: 2,
                isOpenNow: false,
                photoReference: nil,
                reviewSnippet: nil,
                address: "新竹市"
            )
        ]

        let recommendation = engine.nextRecommendation(
            from: restaurants,
            userLocation: user,
            alreadySeenIDs: []
        )

        XCTAssertEqual(recommendation?.id, "balanced")
    }

    func testRecommendationExcludesAlreadySeenRestaurants() {
        let user = Coordinate(latitude: 24.8016, longitude: 120.9714)
        let engine = RecommendationEngine(randomSeed: 7)
        let restaurants = RestaurantSummary.fixtures

        let recommendation = engine.nextRecommendation(
            from: restaurants,
            userLocation: user,
            alreadySeenIDs: ["hsinchu-noodles"]
        )

        XCTAssertNotEqual(recommendation?.id, "hsinchu-noodles")
    }

    func testRecommendationReturnsNilForEmptyOrFullySeenLists() {
        let user = Coordinate(latitude: 24.8016, longitude: 120.9714)
        let engine = RecommendationEngine(randomSeed: 7)

        XCTAssertNil(engine.nextRecommendation(from: [], userLocation: user, alreadySeenIDs: []))
        XCTAssertNil(engine.nextRecommendation(
            from: RestaurantSummary.fixtures,
            userLocation: user,
            alreadySeenIDs: Set(RestaurantSummary.fixtures.map(\.id))
        ))
    }
}
