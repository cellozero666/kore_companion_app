import Foundation
import AppKit
import ApplicationServices

private var observer: AXObserver?

@_silgen_name("emit_notification")
func emit_notification(
    _ app: UnsafePointer<CChar>,
    _ title: UnsafePointer<CChar>,
    _ body: UnsafePointer<CChar>
)

// --------------------------------------------------
// CHECK NOTIFICATION CENTER
// --------------------------------------------------

@_cdecl("is_notification_center_running")
public func is_notification_center_running() -> Bool {

    NSWorkspace.shared.runningApplications.contains {
        $0.bundleIdentifier == "com.apple.notificationcenterui"
    }
}

// --------------------------------------------------
// START WATCHER
// --------------------------------------------------

@_cdecl("start_notification_watcher_native")
public func start_notification_watcher_native() {

    guard let app = NSWorkspace.shared.runningApplications.first(
        where: {
            $0.bundleIdentifier == "com.apple.notificationcenterui"
        }
    ) else {

        print("Notification Center not found")
        return
    }

    let pid = app.processIdentifier

    let result = AXObserverCreate(
        pid,
        notificationCallback,
        &observer
    )

    guard result == .success,
          let observer = observer
    else {

        print("Failed to create AXObserver")
        return
    }

    let element = AXUIElementCreateApplication(pid)

    AXObserverAddNotification(
        observer,
        element,
        kAXCreatedNotification as CFString,
        nil
    )

    CFRunLoopAddSource(
        CFRunLoopGetMain(),
        AXObserverGetRunLoopSource(observer),
        .defaultMode
    )

    print("Notification watcher started")
}

// --------------------------------------------------
// EXTRACT NOTIFICATION
// --------------------------------------------------

private func extractNotification(
    from element: AXUIElement
) {

    var description: CFTypeRef?

    let result = AXUIElementCopyAttributeValue(
        element,
        kAXDescriptionAttribute as CFString,
        &description
    )

    if result == .success,
       let text = description as? String {

        let parts = text.components(
            separatedBy: ", "
        )

        if parts.count >= 3 {

            let app = parts[0]
                .trimmingCharacters(
                    in: .whitespacesAndNewlines
                )
                .replacingOccurrences(
                    of: "\u{200E}",
                    with: ""
                )

            let title = parts[1]

            let body = parts
                .dropFirst(2)
                .joined(separator: ", ")

            app.withCString { appCString in
                title.withCString { titleCString in
                    body.withCString { bodyCString in

                        emit_notification(
                            appCString,
                            titleCString,
                            bodyCString
                        )
                    }
                }
            }

            return
        }
    }

    var children: CFTypeRef?

    let childResult = AXUIElementCopyAttributeValue(
        element,
        kAXChildrenAttribute as CFString,
        &children
    )

    guard childResult == .success,
          let array = children as? [AXUIElement]
    else {
        return
    }

    for child in array {
        extractNotification(
            from: child
        )
    }
}

// --------------------------------------------------
// CALLBACK
// --------------------------------------------------

private let notificationCallback: AXObserverCallback = {
    (_, element, notification, _) in

    guard notification as String ==
          kAXCreatedNotification as String
    else {
        return
    }

    extractNotification(
        from: element
    )
}