import Foundation

public struct RecommendationEngine: Sendable {
    private let randomSeed: Int

    public init(randomSeed: Int = Int(Date().timeIntervalSince1970)) {
        self.randomSeed = randomSeed
    }

    public func nextRecommendation(
        from restaurants: [RestaurantSummary],
        userLocation: Coordinate,
        alreadySeenIDs: Set<String>
    ) -> RestaurantSummary? {
        let candidates = restaurants.filter { !alreadySeenIDs.contains($0.id) }
        guard !candidates.isEmpty else { return nil }

        return candidates.max { lhs, rhs in
            score(lhs, userLocation: userLocation) < score(rhs, userLocation: userLocation)
        }
    }

    public func nextRecommendation(
        from restaurants: [RestaurantSummary],
        userLocation: Coordinate,
        alreadySeenIDs: [String]
    ) -> RestaurantSummary? {
        nextRecommendation(from: restaurants, userLocation: userLocation, alreadySeenIDs: Set(alreadySeenIDs))
    }

    public func rankedRestaurants(
        from restaurants: [RestaurantSummary],
        userLocation: Coordinate
    ) -> [RestaurantSummary] {
        restaurants.sorted {
            score($0, userLocation: userLocation) > score($1, userLocation: userLocation)
        }
    }

    public func score(_ restaurant: RestaurantSummary, userLocation: Coordinate) -> Double {
        let distance = userLocation.distance(to: restaurant.coordinate)
        let ratingScore = ((restaurant.rating ?? 3.5) - 3.0) / 2.0
        let reviewConfidence = min(log10(Double(max(restaurant.userRatingCount, 1))) / 3.0, 1.0)
        let distanceScore = max(0, 1 - (distance / Double(Hsinchu.defaultSearchRadiusMeters)))
        let openScore: Double

        switch restaurant.isOpenNow {
        case true:
            openScore = 1.0
        case false:
            openScore = -0.75
        case nil:
            openScore = 0.2
        }

        return ratingScore * 0.42
            + reviewConfidence * 0.18
            + distanceScore * 0.30
            + openScore * 0.08
            + jitter(for: restaurant.id) * 0.02
    }

    private func jitter(for id: String) -> Double {
        var hash = randomSeed
        for scalar in id.unicodeScalars {
            hash = hash &* 31 &+ Int(scalar.value)
        }
        return Double(abs(hash % 1_000)) / 1_000
    }
}
