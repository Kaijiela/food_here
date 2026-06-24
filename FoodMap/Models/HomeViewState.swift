import Foundation
import FoodMapCore

enum HomeViewState: Equatable {
    case idle
    case requestingLocation
    case loadingPlaces
    case ready
    case empty
    case failed(String)

    var isLoading: Bool {
        switch self {
        case .requestingLocation, .loadingPlaces:
            return true
        case .idle, .ready, .empty, .failed:
            return false
        }
    }
}

struct RestaurantPhoto: Identifiable, Equatable {
    let id: String
    let reference: String
}
