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
    func restoresSavedGameFromStorage() throws {
        let defaults = makeDefaults()
        let savedGame = GameBoard(cells: [
            [2, 4, 8, 16],
            [32, 64, 128, 256],
            [512, 1024, 2, 4],
            [8, 16, 32, 64]
        ], score: 4096)
        try GameViewModel.saveGameForTesting(
            game: savedGame,
            remainingRevives: 1,
            defaults: defaults
        )

        let viewModel = GameViewModel(defaults: defaults)

        #expect(viewModel.board == savedGame.cells)
        #expect(viewModel.score == 4096)
        #expect(viewModel.remainingRevives == 1)
    }

    @Test
    func restoresLegacySavedGameWithoutContinueFlag() throws {
        let defaults = makeDefaults()
        let legacySavedGame: [String: Any] = [
            "game": [
                "cells": [
                    [2, 4, 8, 16],
                    [32, 64, 128, 256],
                    [512, 1024, 2, 4],
                    [8, 16, 32, 64]
                ],
                "score": 4096
            ],
            "remainingRevives": 1
        ]
        let data = try JSONSerialization.data(withJSONObject: legacySavedGame)
        defaults.set(data, forKey: GameViewModel.savedGameStorageKey)

        let viewModel = GameViewModel(defaults: defaults)

        #expect(viewModel.score == 4096)
        #expect(viewModel.remainingRevives == 1)
        #expect(!viewModel.didContinueAfterWin)
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
    func persistsGameAfterEffectiveMove() {
        let defaults = makeDefaults()
        let game = GameBoard(cells: [
            [8, 8, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ])
        let viewModel = GameViewModel(game: game, defaults: defaults, feedback: GameFeedback(record: { _ in }))

        viewModel.move(direction: .left)
        let restoredViewModel = GameViewModel(defaults: defaults, feedback: GameFeedback(record: { _ in }))

        #expect(restoredViewModel.score == viewModel.score)
        #expect(restoredViewModel.board == viewModel.board)
        #expect(restoredViewModel.remainingRevives == viewModel.remainingRevives)
    }

    @Test
    func undoRestoresBoardBeforeEffectiveMove() {
        let game = GameBoard(cells: [
            [8, 8, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ], score: 32)
        let viewModel = GameViewModel(game: game, defaults: makeDefaults(), feedback: GameFeedback(record: { _ in }))

        viewModel.move(direction: .left)
        let undone = viewModel.undo()

        #expect(undone)
        #expect(viewModel.board == game.cells)
        #expect(viewModel.score == 32)
        #expect(!viewModel.canUndo)
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
    func continueAfterWinDismissesWinOverlayAndAllowsMoves() {
        let game = GameBoard(cells: [
            [2048, 4, 0, 0],
            [2, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ])
        let viewModel = GameViewModel(game: game, defaults: makeDefaults(), feedback: GameFeedback(record: { _ in }))

        let continued = viewModel.continueAfterWin()
        viewModel.move(direction: .right)

        #expect(continued)
        #expect(viewModel.hasWon)
        #expect(!viewModel.showsStatusOverlay)
        #expect(viewModel.statusText == "继续挑战")
        #expect(viewModel.board != game.cells)
    }

    @Test
    func persistsContinueAfterWinState() {
        let defaults = makeDefaults()
        let game = GameBoard(cells: [
            [2048, 4, 0, 0],
            [2, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ])
        let viewModel = GameViewModel(game: game, defaults: defaults, feedback: GameFeedback(record: { _ in }))

        _ = viewModel.continueAfterWin()
        let restoredViewModel = GameViewModel(defaults: defaults, feedback: GameFeedback(record: { _ in }))

        #expect(restoredViewModel.didContinueAfterWin)
        #expect(!restoredViewModel.showsStatusOverlay)
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
    func undoRestoresBoardBeforeSuccessfulReviveSelection() {
        let game = GameBoard(cells: [
            [2, 4, 2, 4],
            [4, 2, 4, 2],
            [2, 4, 2, 4],
            [4, 2, 4, 2]
        ])
        let viewModel = GameViewModel(game: game, defaults: makeDefaults(), feedback: GameFeedback(record: { _ in }))

        _ = viewModel.activateReviveMode()
        _ = viewModel.selectReviveTile(row: 1, column: 2)
        let undone = viewModel.undo()

        #expect(undone)
        #expect(viewModel.board == game.cells)
        #expect(viewModel.remainingRevives == 3)
        #expect(!viewModel.canUndo)
    }

    @Test
    func restartClearsUndoState() {
        let game = GameBoard(cells: [
            [8, 8, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ])
        let viewModel = GameViewModel(game: game, defaults: makeDefaults(), feedback: GameFeedback(record: { _ in }))

        viewModel.move(direction: .left)
        viewModel.restart()
        let undone = viewModel.undo()

        #expect(!undone)
        #expect(!viewModel.canUndo)
    }

    @Test
    func persistsGameAfterSuccessfulReviveSelection() {
        let defaults = makeDefaults()
        let game = GameBoard(cells: [
            [2, 4, 2, 4],
            [4, 2, 4, 2],
            [2, 4, 2, 4],
            [4, 2, 4, 2]
        ])
        let viewModel = GameViewModel(game: game, defaults: defaults, feedback: GameFeedback(record: { _ in }))
        _ = viewModel.activateReviveMode()
        _ = viewModel.selectReviveTile(row: 1, column: 2)

        let restoredViewModel = GameViewModel(defaults: defaults, feedback: GameFeedback(record: { _ in }))

        #expect(restoredViewModel.board == viewModel.board)
        #expect(restoredViewModel.remainingRevives == 2)
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
