import Foundation

public struct RestaurantDetail: Identifiable, Equatable, Sendable {
    public let summary: RestaurantSummary
    public let phoneNumber: String?
    public let websiteURL: URL?
    public let googleMapsURL: URL?
    public let weekdayText: [String]
    public let photoReferences: [String]
    public let reviews: [RestaurantReview]

    public var id: String { summary.id }

    public init(
        summary: RestaurantSummary,
        phoneNumber: String?,
        websiteURL: URL?,
        googleMapsURL: URL?,
        weekdayText: [String],
        photoReferences: [String],
        reviews: [RestaurantReview]
    ) {
        self.summary = summary
        self.phoneNumber = phoneNumber
        self.websiteURL = websiteURL
        self.googleMapsURL = googleMapsURL
        self.weekdayText = weekdayText
        self.photoReferences = photoReferences
        self.reviews = reviews
    }
}

public struct RestaurantReview: Identifiable, Equatable, Sendable {
    public let id: String
    public let authorName: String
    public let rating: Double?
    public let relativePublishTimeDescription: String?
    public let text: String

    public init(
        id: String,
        authorName: String,
        rating: Double?,
        relativePublishTimeDescription: String?,
        text: String
    ) {
        self.id = id
        self.authorName = authorName
        self.rating = rating
        self.relativePublishTimeDescription = relativePublishTimeDescription
        self.text = text
    }
}
