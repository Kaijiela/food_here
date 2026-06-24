import Foundation
import GoogleMaps
import GooglePlaces

enum GoogleSDKConfigurator {
    static func configure() {
        guard let apiKey = Bundle.main.object(forInfoDictionaryKey: "GOOGLE_MAPS_API_KEY") as? String,
              !apiKey.isEmpty,
              apiKey != "$(GOOGLE_MAPS_API_KEY)" else {
            assertionFailure("Missing GOOGLE_MAPS_API_KEY build setting.")
            return
        }

        GMSServices.provideAPIKey(apiKey)
        GMSPlacesClient.provideAPIKey(apiKey)
    }
}
