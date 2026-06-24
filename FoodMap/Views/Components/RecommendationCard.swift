import FoodMapCore
import SwiftUI

struct RecommendationCard: View {
    let restaurant: RestaurantSummary
    let userLocation: Coordinate
    let onAccept: () -> Void
    let onShuffle: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("今天吃這間")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(.foodCoral)

            VStack(alignment: .leading, spacing: 8) {
                Text(restaurant.name)
                    .font(.system(size: 26, weight: .bold, design: .rounded))
                    .foregroundStyle(.foodInk)
                    .lineLimit(2)

                HStack(spacing: 10) {
                    Label(ratingText, systemImage: "star.fill")
                    Label(distanceText, systemImage: "figure.walk")
                    if restaurant.isOpenNow == true {
                        Label("營業中", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(.foodGreen)
                    }
                }
                .font(.footnote.weight(.semibold))
                .foregroundStyle(.secondary)
            }

            if let snippet = restaurant.reviewSnippet {
                Text(snippet)
                    .font(.callout)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }

            HStack(spacing: 10) {
                Button(action: onAccept) {
                    Label("就吃這間", systemImage: "fork.knife")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.foodPrimary)

                Button(action: onShuffle) {
                    Label("換一家", systemImage: "shuffle")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.foodSecondary)
            }
        }
        .padding(18)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .shadow(color: .black.opacity(0.12), radius: 18, x: 0, y: 10)
    }

    private var ratingText: String {
        guard let rating = restaurant.rating else { return "評價 --" }
        return String(format: "評價 %.1f (%d)", rating, restaurant.userRatingCount)
    }

    private var distanceText: String {
        let meters = userLocation.distance(to: restaurant.coordinate)
        if meters >= 1_000 {
            return String(format: "%.1f km", meters / 1_000)
        }
        return "\(Int(meters.rounded())) m"
    }
}
