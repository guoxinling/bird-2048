import Foundation
import UIKit

struct GameFeedback: Sendable {
    enum Event: Equatable {
        case move
        case revive
    }

    private let record: @Sendable (Event) -> Void

    init(record: @escaping @Sendable (Event) -> Void) {
        self.record = record
    }

    func play(_ event: Event) {
        record(event)
    }
}

extension GameFeedback {
    static let live = GameFeedback { event in
        Task { @MainActor in
            switch event {
            case .move:
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
            case .revive:
                UINotificationFeedbackGenerator().notificationOccurred(.success)
            }
        }
    }
}
