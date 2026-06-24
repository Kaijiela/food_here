import Foundation

public struct RestaurantSummary: Identifiable, Equatable, Sendable {
    public let id: String
    public let name: String
    public let coordinate: Coordinate
    public let rating: Double?
    public let userRatingCount: Int
    public let priceLevel: Int?
    public let isOpenNow: Bool?
    public let photoReference: String?
    public let reviewSnippet: String?
    public let address: String?

    public init(
        id: String,
        name: String,
        coordinate: Coordinate,
        rating: Double?,
        userRatingCount: Int,
        priceLevel: Int?,
        isOpenNow: Bool?,
        photoReference: String?,
        reviewSnippet: String?,
        address: String?
    ) {
        self.id = id
        self.name = name
        self.coordinate = coordinate
        self.rating = rating
        self.userRatingCount = userRatingCount
        self.priceLevel = priceLevel
        self.isOpenNow = isOpenNow
        self.photoReference = photoReference
        self.reviewSnippet = reviewSnippet
        self.address = address
    }
}

public extension RestaurantSummary {
    static let fixtures: [RestaurantSummary] = [
        RestaurantSummary(
            id: "hsinchu-noodles",
            name: "新竹米粉小館",
            coordinate: Coordinate(latitude: 24.8022, longitude: 120.9721),
            rating: 4.6,
            userRatingCount: 450,
            priceLevel: 1,
            isOpenNow: true,
            photoReference: nil,
            reviewSnippet: "湯頭清爽，米粉香氣很足。",
            address: "新竹市東區"
        ),
        RestaurantSummary(
            id: "east-district-cafe",
            name: "東門市場咖啡",
            coordinate: Coordinate(latitude: 24.8046, longitude: 120.9702),
            rating: 4.4,
            userRatingCount: 280,
            priceLevel: 2,
            isOpenNow: true,
            photoReference: nil,
            reviewSnippet: "適合想輕鬆吃點東西的下午。",
            address: "新竹市東區"
        )
    ]
}
