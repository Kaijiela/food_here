import FoodMapCore
import SwiftUI

struct NearbyRestaurantList: View {
    let restaurants: [RestaurantSummary]
    let selectedID: String
    let userLocation: Coordinate
    let onSelect: (RestaurantSummary) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("附近也可以")
                .font(.headline)
                .foregroundStyle(.foodInk)

            ForEach(restaurants.prefix(5)) { restaurant in
                Button {
                    onSelect(restaurant)
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: restaurant.id == selectedID ? "mappin.circle.fill" : "circle")
                            .foregroundStyle(restaurant.id == selectedID ? .foodCoral : .secondary)

                        VStack(alignment: .leading, spacing: 4) {
                            Text(restaurant.name)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.foodInk)
                            Text(metaText(for: restaurant))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.bold))
                            .foregroundStyle(.secondary)
                    }
                    .padding(12)
                    .background(.white.opacity(0.94))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func metaText(for restaurant: RestaurantSummary) -> String {
        let distance = Int(userLocation.distance(to: restaurant.coordinate).rounded())
        let rating = restaurant.rating.map { String(format: "%.1f", $0) } ?? "--"
        return "評價 \(rating) · 距離 \(distance)m"
    }
}
