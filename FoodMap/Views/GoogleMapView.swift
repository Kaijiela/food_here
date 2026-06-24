import CoreLocation
import FoodMapCore
import GoogleMaps
import SwiftUI

struct GoogleMapView: UIViewRepresentable {
    let userLocation: Coordinate
    let restaurants: [RestaurantSummary]
    let selectedRestaurant: RestaurantSummary?

    func makeUIView(context: Context) -> GMSMapView {
        let camera = GMSCameraPosition.camera(
            withLatitude: userLocation.latitude,
            longitude: userLocation.longitude,
            zoom: 14
        )
        let mapView = GMSMapView(frame: .zero, camera: camera)
        mapView.isMyLocationEnabled = true
        mapView.settings.myLocationButton = false
        mapView.padding = UIEdgeInsets(top: 260, left: 0, bottom: 220, right: 0)
        return mapView
    }

    func updateUIView(_ mapView: GMSMapView, context: Context) {
        mapView.clear()

        for restaurant in restaurants {
            let marker = GMSMarker()
            marker.position = CLLocationCoordinate2D(
                latitude: restaurant.coordinate.latitude,
                longitude: restaurant.coordinate.longitude
            )
            marker.title = restaurant.name
            marker.icon = GMSMarker.markerImage(
                with: restaurant.id == selectedRestaurant?.id ? UIColor.foodCoral : UIColor.foodGreen
            )
            marker.map = mapView
        }

        let focus = selectedRestaurant?.coordinate ?? userLocation
        mapView.animate(to: GMSCameraPosition.camera(
            withLatitude: focus.latitude,
            longitude: focus.longitude,
            zoom: 15
        ))
    }
}
