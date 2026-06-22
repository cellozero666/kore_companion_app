// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "NotificationWatcher",
    products: [
        .library(
            name: "NotificationWatcher",
            type: .static,
            targets: ["NotificationWatcher"]
        )
    ],
    targets: [
        .target(
            name: "NotificationWatcher",
            path: ".",
            sources: ["NotificationWatcher.swift"]
        )
    ]
)