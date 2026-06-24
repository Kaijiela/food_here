import SwiftUI

struct RestaurantPhotoStrip: View {
    let references: [String]
    let placesService: PlacesServicing

    @State private var images: [UIImage] = []

    var body: some View {
        Group {
            if !images.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(Array(images.enumerated()), id: \.offset) { _, image in
                            Image(uiImage: image)
                                .resizable()
                                .scaledToFill()
                                .frame(width: 180, height: 128)
                                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                        }
                    }
                }
            }
        }
        .task(id: references) {
            await loadImages()
        }
    }

    private func loadImages() async {
        guard images.isEmpty else { return }
        var loaded: [UIImage] = []

        for reference in references.prefix(6) {
            do {
                if let image = try await placesService.fetchPhoto(
                    reference: reference,
                    maxSize: CGSize(width: 540, height: 384)
                ) {
                    loaded.append(image)
                }
            } catch is CancellationError {
                return
            } catch {
                continue
            }
        }

        images = loaded
    }
}
