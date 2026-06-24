import XCTest
@testable import FoodMapCore

final class HsinchuLocationTests: XCTestCase {
    func testFallbackLocationIsHsinchuCityCenter() {
        XCTAssertEqual(Hsinchu.defaultCoordinate.latitude, 24.8039, accuracy: 0.0001)
        XCTAssertEqual(Hsinchu.defaultCoordinate.longitude, 120.9647, accuracy: 0.0001)
    }

    func testDefaultSearchRadiusIsThreeKilometers() {
        XCTAssertEqual(Hsinchu.defaultSearchRadiusMeters, 3_000)
    }
}
