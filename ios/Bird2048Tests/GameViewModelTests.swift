import Foundation
import Testing
@testable import Bird2048

struct GameViewModelTests {
    @Test
    func loadsHighScoreFromStorage() {
        let defaults = makeDefaults()
        defaults.set(128, forKey: GameViewModel.highScoreStorageKey)

        let viewModel = GameViewModel(defaults: defaults)

        #expect(viewModel.highScore == 128)
    }

    @Test
    func persistsHighScoreWhenScoreBeatsStoredValue() {
        let defaults = makeDefaults()
        defaults.set(4, forKey: GameViewModel.highScoreStorageKey)
        let game = GameBoard(cells: [
            [8, 8, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ])
        let viewModel = GameViewModel(game: game, defaults: defaults)

        viewModel.move(direction: .left)

        #expect(viewModel.highScore == 16)
        #expect(defaults.integer(forKey: GameViewModel.highScoreStorageKey) == 16)
    }

    @Test
    func keepsStoredHighScoreWhenCurrentScoreIsLower() {
        let defaults = makeDefaults()
        defaults.set(64, forKey: GameViewModel.highScoreStorageKey)
        let game = GameBoard(cells: [
            [8, 8, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ])
        let viewModel = GameViewModel(game: game, defaults: defaults)

        viewModel.move(direction: .left)

        #expect(viewModel.highScore == 64)
        #expect(defaults.integer(forKey: GameViewModel.highScoreStorageKey) == 64)
    }

    @Test
    func exposesGameOverStateForBlockingUi() {
        let game = GameBoard(cells: [
            [2, 4, 2, 4],
            [4, 2, 4, 2],
            [2, 4, 2, 4],
            [4, 2, 4, 2]
        ])
        let viewModel = GameViewModel(game: game, defaults: makeDefaults())

        #expect(viewModel.isGameOver)
        #expect(viewModel.showsStatusOverlay)
        #expect(viewModel.statusTitle == "游戏结束")
    }

    @Test
    func exposesWinStateForStatusUi() {
        let game = GameBoard(cells: [
            [2048, 4, 2, 4],
            [4, 2, 4, 2],
            [2, 4, 2, 4],
            [4, 2, 4, 2]
        ])
        let viewModel = GameViewModel(game: game, defaults: makeDefaults())

        #expect(viewModel.hasWon)
        #expect(viewModel.showsStatusOverlay)
        #expect(viewModel.statusTitle == "达成 2048")
    }

    @Test
    func ignoresMoveAfterGameOver() {
        let game = GameBoard(cells: [
            [2, 4, 2, 4],
            [4, 2, 4, 2],
            [2, 4, 2, 4],
            [4, 2, 4, 2]
        ])
        let viewModel = GameViewModel(game: game, defaults: makeDefaults())
        let before = viewModel.board

        viewModel.move(direction: .left)

        #expect(viewModel.board == before)
    }

    @Test
    func playsFeedbackAfterEffectiveMoveOnly() {
        let recorder = FeedbackRecorder()
        let game = GameBoard(cells: [
            [2, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ])
        let viewModel = GameViewModel(game: game, defaults: makeDefaults(), feedback: recorder.feedback)

        viewModel.move(direction: .left)
        viewModel.move(direction: .right)

        #expect(recorder.events == [.move])
    }

    @Test
    func startsWithThreeRevivesAvailable() {
        let viewModel = GameViewModel(defaults: makeDefaults())

        #expect(viewModel.remainingRevives == 3)
        #expect(!viewModel.isChoosingReviveTile)
    }

    @Test
    func activateReviveModeOnlyAfterGameOverWhenRevivesRemain() {
        let game = GameBoard(cells: [
            [2, 4, 2, 4],
            [4, 2, 4, 2],
            [2, 4, 2, 4],
            [4, 2, 4, 2]
        ])
        let viewModel = GameViewModel(game: game, defaults: makeDefaults())

        let activated = viewModel.activateReviveMode()

        #expect(activated)
        #expect(viewModel.isChoosingReviveTile)
        #expect(!viewModel.showsStatusOverlay)
    }

    @Test
    func selectingReviveTileRemovesTileAndConsumesRevive() {
        let game = GameBoard(cells: [
            [2, 4, 2, 4],
            [4, 2, 4, 2],
            [2, 4, 2, 4],
            [4, 2, 4, 2]
        ])
        let viewModel = GameViewModel(game: game, defaults: makeDefaults())
        _ = viewModel.activateReviveMode()

        let revived = viewModel.selectReviveTile(row: 1, column: 2)

        #expect(revived)
        #expect(viewModel.board[1][2] == 0)
        #expect(viewModel.remainingRevives == 2)
        #expect(!viewModel.isChoosingReviveTile)
        #expect(!viewModel.isGameOver)
    }

    @Test
    func playsFeedbackAfterSuccessfulReviveSelectionOnly() {
        let recorder = FeedbackRecorder()
        let game = GameBoard(cells: [
            [2, 4, 2, 4],
            [4, 2, 4, 2],
            [2, 4, 2, 4],
            [4, 2, 4, 2]
        ])
        let viewModel = GameViewModel(game: game, defaults: makeDefaults(), feedback: recorder.feedback)

        _ = viewModel.selectReviveTile(row: 1, column: 2)
        _ = viewModel.activateReviveMode()
        _ = viewModel.selectReviveTile(row: 1, column: 2)

        #expect(recorder.events == [.revive])
    }

    private func makeDefaults() -> UserDefaults {
        let suiteName = "Bird2048Tests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defaults.removePersistentDomain(forName: suiteName)
        return defaults
    }
}

private final class FeedbackRecorder: @unchecked Sendable {
    private let lock = NSLock()
    private var recordedEvents: [GameFeedback.Event] = []

    var feedback: GameFeedback {
        GameFeedback { [self] event in
            lock.withLock {
                recordedEvents.append(event)
            }
        }
    }

    var events: [GameFeedback.Event] {
        lock.withLock {
            recordedEvents
        }
    }
}
