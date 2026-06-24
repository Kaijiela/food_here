import FoodMapCore
import SwiftUI

struct HomeView: View {
    @StateObject private var viewModel: HomeViewModel
    @State private var detailRestaurant: RestaurantSummary?

    init(viewModel: HomeViewModel = .live()) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                GoogleMapView(
                    userLocation: viewModel.userLocation,
                    restaurants: viewModel.restaurants,
                    selectedRestaurant: viewModel.selectedRestaurant
                )
                .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 14) {
                        header
                        content
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                    .padding(.bottom, 28)
                }
                .background(
                    LinearGradient(
                        colors: [.white.opacity(0.96), .white.opacity(0.88), .clear],
                        startPoint: .top,
                        endPoint: .bottom
                    )
                    .ignoresSafeArea()
                )
            }
            .navigationBarHidden(true)
            .task {
                await viewModel.load()
            }
            .sheet(item: $detailRestaurant) { restaurant in
                RestaurantDetailView(
                    restaurantID: restaurant.id,
                    placesService: viewModel.detailPlacesService
                )
            }
        }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("美食地圖")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundStyle(.foodInk)
                Text("新竹市附近")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Button {
                Task { await viewModel.load() }
            } label: {
                Image(systemName: "location.fill")
                    .font(.system(size: 16, weight: .semibold))
                    .frame(width: 40, height: 40)
            }
            .buttonStyle(.foodIcon)
            .accessibilityLabel("重新定位")
        }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.state {
        case .idle, .requestingLocation, .loadingPlaces:
            LoadingRecommendationCard(state: viewModel.state)
        case .ready:
            if let restaurant = viewModel.selectedRestaurant {
                RecommendationCard(
                    restaurant: restaurant,
                    userLocation: viewModel.userLocation,
                    onAccept: { detailRestaurant = restaurant },
                    onShuffle: viewModel.pickNextRestaurant
                )

                NearbyRestaurantList(
                    restaurants: viewModel.restaurants,
                    selectedID: restaurant.id,
                    userLocation: viewModel.userLocation,
                    onSelect: { detailRestaurant = $0 }
                )
            }
        case .empty:
            EmptyStateView(
                title: "附近暫時找不到餐廳",
                message: "可以稍後再試，或把搜尋範圍往新竹市中心移動。"
            )
        case .failed(let message):
            EmptyStateView(title: "載入失敗", message: message)
        }
    }
}

#Preview("Ready") {
    HomeView(viewModel: .preview())
}
