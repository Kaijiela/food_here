import SwiftUI

struct EmptyStateView: View {
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "fork.knife.circle")
                .font(.system(size: 36, weight: .medium))
                .foregroundStyle(.foodCoral)
            Text(title)
                .font(.headline)
                .foregroundStyle(.foodInk)
            Text(message)
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(24)
        .background(.white)
        .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}
