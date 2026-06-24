import FoodMapCore
import UIKit

final class PreviewPlacesService: PlacesServicing {
    var restaurants: [RestaurantSummary]

    init(restaurants: [RestaurantSummary] = RestaurantSummary.fixtures) {
        self.restaurants = restaurants
    }

    func searchNearbyRestaurants(
        around coordinate: Coordinate,
        radiusMeters: Int
    ) async throws -> [RestaurantSummary] {
        restaurants
    }

    func fetchRestaurantDetail(placeID: String) async throws -> RestaurantDetail {
        let summary = restaurants.first { $0.id == placeID } ?? restaurants[0]
        return RestaurantDetail(
            summary: summary,
            phoneNumber: "03-123-4567",
            websiteURL: nil,
            googleMapsURL: URL(string: "https://www.google.com/maps/search/?api=1&query=\(summary.name)"),
            weekdayText: ["星期一至星期日 11:00-21:00"],
            photoReferences: [],
            reviews: [
                RestaurantReview(
                    id: "preview-review",
                    authorName: "在地食客",
                    rating: 5,
                    relativePublishTimeDescription: "最近",
                    text: summary.reviewSnippet ?? "餐點穩定，適合不知道吃什麼的時候。"
                )
            ]
        )
    }

    func fetchPhoto(reference: String, maxSize: CGSize) async throws -> UIImage? {
        nil
    }
}
