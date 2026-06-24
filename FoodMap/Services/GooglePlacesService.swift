import CoreLocation
import FoodMapCore
import GooglePlaces
import UIKit

final class GooglePlacesService: PlacesServicing {
    private let client: GMSPlacesClient
    private var photoMetadataByReference: [String: GMSPlacePhotoMetadata] = [:]
    private var summariesByPlaceID: [String: RestaurantSummary] = [:]

    init(client: GMSPlacesClient = .shared()) {
        self.client = client
    }

    func searchNearbyRestaurants(
        around coordinate: Coordinate,
        radiusMeters: Int
    ) async throws -> [RestaurantSummary] {
        try await withCheckedThrowingContinuation { continuation in
            let center = CLLocationCoordinate2D(latitude: coordinate.latitude, longitude: coordinate.longitude)
            let restriction = GMSPlaceCircularLocationOption(center, Double(radiusMeters))
            let properties = [
                GMSPlaceProperty.placeID,
                GMSPlaceProperty.name,
                GMSPlaceProperty.coordinate,
                GMSPlaceProperty.rating,
                GMSPlaceProperty.userRatingsTotal,
                GMSPlaceProperty.priceLevel,
                GMSPlaceProperty.photos,
                GMSPlaceProperty.formattedAddress
            ].map(\.rawValue)

            let request = GMSPlaceSearchNearbyRequest(
                locationRestriction: restriction,
                placeProperties: properties
            )
            request.includedTypes = ["restaurant", "cafe", "meal_takeaway"]
            request.maxResultCount = 20

            client.searchNearby(with: request) { [weak self] places, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                let summaries = (places ?? []).compactMap { self?.makeSummary(from: $0) }
                continuation.resume(returning: summaries)
            }
        }
    }

    func fetchRestaurantDetail(placeID: String) async throws -> RestaurantDetail {
        let fields: GMSPlaceField = [
            .placeID,
            .name,
            .coordinate,
            .rating,
            .userRatingsTotal,
            .priceLevel,
            .photos,
            .formattedAddress,
            .phoneNumber,
            .website,
            .openingHours
        ]

        return try await withCheckedThrowingContinuation { continuation in
            client.fetchPlace(fromPlaceID: placeID, placeFields: fields, sessionToken: nil) { [weak self] place, error in
                if let error {
                    continuation.resume(throwing: error)
                    return
                }

                guard let self, let place else {
                    continuation.resume(throwing: PlacesServiceError.placeNotFound)
                    return
                }

                let summary = self.makeSummary(from: place)
                let detail = RestaurantDetail(
                    summary: summary,
                    phoneNumber: place.phoneNumber,
                    websiteURL: place.website,
                    googleMapsURL: URL(string: "https://www.google.com/maps/search/?api=1&query_place_id=\(placeID)"),
                    weekdayText: place.openingHours?.weekdayText ?? [],
                    photoReferences: self.photoReferences(for: place),
                    reviews: []
                )
                continuation.resume(returning: detail)
            }
        }
    }

    func fetchPhoto(reference: String, maxSize: CGSize) async throws -> UIImage? {
        guard let metadata = photoMetadataByReference[reference] else { return nil }

        return try await withCheckedThrowingContinuation { continuation in
            client.loadPlacePhoto(metadata) { image, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: image)
                }
            }
        }
    }

    private func makeSummary(from place: GMSPlace) -> RestaurantSummary {
        let placeID = place.placeID ?? UUID().uuidString
        let photoReference = photoReferences(for: place).first
        let summary = RestaurantSummary(
            id: placeID,
            name: place.name ?? "未命名餐廳",
            coordinate: Coordinate(latitude: place.coordinate.latitude, longitude: place.coordinate.longitude),
            rating: place.rating > 0 ? place.rating : nil,
            userRatingCount: place.userRatingsTotal > 0 ? Int(place.userRatingsTotal) : 0,
            priceLevel: place.priceLevel.rawValue >= 0 ? place.priceLevel.rawValue : nil,
            isOpenNow: nil,
            photoReference: photoReference,
            reviewSnippet: nil,
            address: place.formattedAddress
        )
        summariesByPlaceID[placeID] = summary
        return summary
    }

    private func photoReferences(for place: GMSPlace) -> [String] {
        guard let photos = place.photos else { return [] }
        let placeID = place.placeID ?? UUID().uuidString

        return photos.enumerated().map { index, metadata in
            let reference = "\(placeID)#photo-\(index)"
            photoMetadataByReference[reference] = metadata
            return reference
        }
    }
}

enum PlacesServiceError: LocalizedError {
    case placeNotFound

    var errorDescription: String? {
        switch self {
        case .placeNotFound:
            return "找不到這間餐廳的詳細資料。"
        }
    }
}
