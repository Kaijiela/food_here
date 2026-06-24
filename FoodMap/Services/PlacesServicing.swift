import FoodMapCore
import UIKit

protocol PlacesServicing {
    func searchNearbyRestaurants(
        around coordinate: Coordinate,
        radiusMeters: Int
    ) async throws -> [RestaurantSummary]

    func fetchRestaurantDetail(placeID: String) async throws -> RestaurantDetail

    func fetchPhoto(reference: String, maxSize: CGSize) async throws -> UIImage?
}
