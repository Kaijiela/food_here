import SwiftUI
import UIKit

extension Color {
    static var foodInk: Color { Color(red: 0.10, green: 0.12, blue: 0.11) }
    static var foodCoral: Color { Color(red: 0.92, green: 0.27, blue: 0.20) }
    static var foodGreen: Color { Color(red: 0.16, green: 0.55, blue: 0.31) }
}

extension UIColor {
    static var foodCoral: UIColor { UIColor(red: 0.92, green: 0.27, blue: 0.20, alpha: 1) }
    static var foodGreen: UIColor { UIColor(red: 0.16, green: 0.55, blue: 0.31, alpha: 1) }
}

struct FoodPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.bold))
            .foregroundStyle(.white)
            .padding(.vertical, 12)
            .padding(.horizontal, 14)
            .background(Color.foodCoral.opacity(configuration.isPressed ? 0.82 : 1))
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

struct FoodSecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.bold))
            .foregroundStyle(.foodInk)
            .padding(.vertical, 12)
            .padding(.horizontal, 14)
            .background(Color.white.opacity(configuration.isPressed ? 0.75 : 1))
            .overlay(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .stroke(Color.black.opacity(0.10), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

struct FoodIconButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .foregroundStyle(.foodInk)
            .background(Color.white.opacity(configuration.isPressed ? 0.75 : 1))
            .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
            .shadow(color: .black.opacity(0.08), radius: 10, x: 0, y: 4)
    }
}

extension ButtonStyle where Self == FoodPrimaryButtonStyle {
    static var foodPrimary: FoodPrimaryButtonStyle { FoodPrimaryButtonStyle() }
}

extension ButtonStyle where Self == FoodSecondaryButtonStyle {
    static var foodSecondary: FoodSecondaryButtonStyle { FoodSecondaryButtonStyle() }
}

extension ButtonStyle where Self == FoodIconButtonStyle {
    static var foodIcon: FoodIconButtonStyle { FoodIconButtonStyle() }
}
