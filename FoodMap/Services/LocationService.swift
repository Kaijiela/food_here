import CoreLocation
import FoodMapCore
import Foundation

protocol LocationProviding: AnyObject {
    func currentCoordinate() async -> Coordinate
}

final class LocationService: NSObject, ObservableObject, LocationProviding {
    private let manager = CLLocationManager()
    private var continuation: CheckedContinuation<Coordinate, Never>?

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
    }

    func currentCoordinate() async -> Coordinate {
        if let location = manager.location {
            return Coordinate(latitude: location.coordinate.latitude, longitude: location.coordinate.longitude)
        }

        return await withCheckedContinuation { continuation in
            self.continuation = continuation

            switch manager.authorizationStatus {
            case .notDetermined:
                manager.requestWhenInUseAuthorization()
            case .authorizedAlways, .authorizedWhenInUse:
                manager.requestLocation()
            case .denied, .restricted:
                resume(with: Hsinchu.defaultCoordinate)
            @unknown default:
                resume(with: Hsinchu.defaultCoordinate)
            }
        }
    }

    private func resume(with coordinate: Coordinate) {
        continuation?.resume(returning: coordinate)
        continuation = nil
    }
}

extension LocationService: CLLocationManagerDelegate {
    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedAlways, .authorizedWhenInUse:
            manager.requestLocation()
        case .denied, .restricted:
            resume(with: Hsinchu.defaultCoordinate)
        case .notDetermined:
            break
        @unknown default:
            resume(with: Hsinchu.defaultCoordinate)
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else {
            resume(with: Hsinchu.defaultCoordinate)
            return
        }

        resume(with: Coordinate(latitude: location.coordinate.latitude, longitude: location.coordinate.longitude))
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        resume(with: Hsinchu.defaultCoordinate)
    }
}
