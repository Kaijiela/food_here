// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "FoodMap",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(name: "FoodMapCore", targets: ["FoodMapCore"])
    ],
    targets: [
        .target(name: "FoodMapCore"),
        .testTarget(
            name: "FoodMapCoreTests",
            dependencies: ["FoodMapCore"]
        )
    ]
)
