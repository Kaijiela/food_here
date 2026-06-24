import FoodMapCore
import Foundation

@MainActor
final class HomeViewModel: ObservableObject {
    @Published private(set) var state: HomeViewState = .idle
    @Published private(set) var userLocation: Coordinate = Hsinchu.defaultCoordinate
    @Published private(set) var restaurants: [RestaurantSummary] = []
    @Published private(set) var selectedRestaurant: RestaurantSummary?
    var detailPlacesService: PlacesServicing { placesService }

    private let locationService: LocationProviding
    private let placesService: PlacesServicing
    private let recommendationEngine: RecommendationEngine
    private var alreadySeenIDs: Set<String> = []

    init(
        locationService: LocationProviding,
        placesService: PlacesServicing,
        recommendationEngine: RecommendationEngine = RecommendationEngine()
    ) {
        self.locationService = locationService
        self.placesService = placesService
        self.recommendationEngine = recommendationEngine
    }

    static func live() -> HomeViewModel {
        HomeViewModel(
            locationService: LocationService(),
            placesService: GooglePlacesService()
        )
    }

    static func preview() -> HomeViewModel {
        HomeViewModel(
            locationService: PreviewLocationService(),
            placesService: PreviewPlacesService(),
            recommendationEngine: RecommendationEngine(randomSeed: 7)
        )
    }

    func load() async {
        state = .requestingLocation
        userLocation = await locationService.currentCoordinate()

        state = .loadingPlaces
        do {
            let results = try await placesService.searchNearbyRestaurants(
                around: userLocation,
                radiusMeters: Hsinchu.defaultSearchRadiusMeters
            )
            restaurants = recommendationEngine.rankedRestaurants(from: results, userLocation: userLocation)
            pickNextRestaurant()
            state = restaurants.isEmpty ? .empty : .ready
        } catch is CancellationError {
            return
        } catch {
            state = .failed(error.localizedDescription)
        }
    }

    func pickNextRestaurant() {
        if alreadySeenIDs.count >= restaurants.count {
            alreadySeenIDs.removeAll()
        }

        guard let next = recommendationEngine.nextRecommendation(
            from: restaurants,
            userLocation: userLocation,
            alreadySeenIDs: alreadySeenIDs
        ) else {
            selectedRestaurant = nil
            return
        }

        selectedRestaurant = next
        alreadySeenIDs.insert(next.id)
    }
}

private final class PreviewLocationService: LocationProviding {
    func currentCoordinate() async -> Coordinate {
        Hsinchu.defaultCoordinate
    }
}
