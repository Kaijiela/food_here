import FoodMapCore
import SwiftUI

struct RestaurantDetailView: View {
    let restaurantID: String
    let placesService: PlacesServicing

    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var detail: RestaurantDetail?
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Group {
                if let detail {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 18) {
                            titleSection(detail)
                            RestaurantPhotoStrip(
                                references: detail.photoReferences,
                                placesService: placesService
                            )
                            reviewSection(detail)
                            hoursSection(detail)
                        }
                        .padding(20)
                    }
                } else if let errorMessage {
                    EmptyStateView(title: "詳情載入失敗", message: errorMessage)
                        .padding()
                } else {
                    ProgressView("載入餐廳詳情")
                }
            }
            .navigationTitle("餐廳詳情")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("完成") { dismiss() }
                }
            }
            .task {
                await load()
            }
        }
    }

    private func load() async {
        do {
            detail = try await placesService.fetchRestaurantDetail(placeID: restaurantID)
        } catch is CancellationError {
            return
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func titleSection(_ detail: RestaurantDetail) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(detail.summary.name)
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundStyle(.foodInk)

            Text(detail.summary.address ?? "新竹市附近")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            HStack {
                Label(ratingText(detail.summary), systemImage: "star.fill")
                if detail.summary.isOpenNow == true {
                    Label("營業中", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(.foodGreen)
                }
            }
            .font(.footnote.weight(.semibold))
            .foregroundStyle(.secondary)

            if let url = detail.googleMapsURL {
                Button {
                    openURL(url)
                } label: {
                    Label("用 Google Maps 導航", systemImage: "arrow.triangle.turn.up.right.diamond.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.foodPrimary)
            }
        }
    }

    private func reviewSection(_ detail: RestaurantDetail) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("評價")
                .font(.headline)
                .foregroundStyle(.foodInk)

            if detail.reviews.isEmpty {
                Text(detail.summary.reviewSnippet ?? "Google 目前沒有提供可顯示的評論摘要。")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(detail.reviews) { review in
                    VStack(alignment: .leading, spacing: 6) {
                        Text(review.authorName)
                            .font(.subheadline.weight(.semibold))
                        Text(review.text)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(12)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                }
            }
        }
    }

    private func hoursSection(_ detail: RestaurantDetail) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("營業時間")
                .font(.headline)
                .foregroundStyle(.foodInk)

            if detail.weekdayText.isEmpty {
                Text("尚無營業時間資料")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            } else {
                ForEach(detail.weekdayText, id: \.self) { line in
                    Text(line)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private func ratingText(_ restaurant: RestaurantSummary) -> String {
        guard let rating = restaurant.rating else { return "評價 --" }
        return String(format: "評價 %.1f (%d)", rating, restaurant.userRatingCount)
    }
}
