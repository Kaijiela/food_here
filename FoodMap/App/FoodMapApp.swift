import SwiftUI

@main
struct FoodMapApp: App {
    init() {
        GoogleSDKConfigurator.configure()
    }

    var body: some Scene {
        WindowGroup {
            HomeView()
        }
    }
}
