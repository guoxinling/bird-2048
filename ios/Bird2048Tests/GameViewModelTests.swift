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

    private func makeDefaults() -> UserDefaults {
        let suiteName = "Bird2048Tests.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        defaults.removePersistentDomain(forName: suiteName)
        return defaults
    }
}
