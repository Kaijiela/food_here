import SwiftUI

struct LoadingRecommendationCard: View {
    let state: HomeViewState

    var body: some View {
        VStack(spacing: 14) {
            ProgressView()
                .tint(.foodCoral)
            Text(state == .requestingLocation ? "正在確認你附近的位置" : "正在尋找新竹好吃的餐廳")
                .font(.headline)
                .foregroundStyle(.foodInk)
            Text("等一下下，等等就不用再想要吃什麼。")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
        .shadow(color: .black.opacity(0.10), radius: 16, x: 0, y: 8)
    }
}
