import Foundation

@Observable
final class GameViewModel {
    static let highScoreStorageKey = "highScore"
    static let savedGameStorageKey = "savedGame"

    private let defaults: UserDefaults
    private let feedback: GameFeedback
    private(set) var game: GameBoard
    private(set) var highScore: Int
    private(set) var remainingRevives = 3
    private(set) var isChoosingReviveTile = false

    init(game: GameBoard? = nil, defaults: UserDefaults = .standard, feedback: GameFeedback = .live) {
        self.defaults = defaults
        self.feedback = feedback
        let savedGame = Self.loadSavedGame(defaults: defaults)
        self.game = game ?? savedGame?.game ?? GameBoard.newGame()
        highScore = defaults.integer(forKey: Self.highScoreStorageKey)
        remainingRevives = savedGame?.remainingRevives ?? 3
    }

    var board: [[Int]] {
        game.cells
    }

    var score: Int {
        game.score
    }

    var hasWon: Bool {
        game.hasWon
    }

    var isGameOver: Bool {
        game.isGameOver
    }

    var showsStatusOverlay: Bool {
        !isChoosingReviveTile && (hasWon || isGameOver)
    }

    var statusTitle: String {
        if hasWon {
            return "达成 2048"
        }

        if isGameOver {
            return "游戏结束"
        }

        return ""
    }

    var statusText: String {
        if isChoosingReviveTile {
            return "选择一个方块移除"
        }

        if hasWon {
            return "已达成 2048"
        }

        if isGameOver {
            return "游戏结束"
        }

        return "滑动合并数字"
    }

    func move(direction: Direction) {
        guard !isChoosingReviveTile, !isGameOver else {
            return
        }

        let result = game.play(direction)
        if result.moved {
            feedback.play(.move)
            saveGame()
        }

        if game.score > highScore {
            highScore = game.score
            defaults.set(highScore, forKey: Self.highScoreStorageKey)
        }
    }

    func restart() {
        game = GameBoard.newGame()
        remainingRevives = 3
        isChoosingReviveTile = false
        saveGame()
    }

    @discardableResult
    func activateReviveMode() -> Bool {
        guard isGameOver, remainingRevives > 0 else {
            return false
        }

        isChoosingReviveTile = true
        return true
    }

    @discardableResult
    func selectReviveTile(row: Int, column: Int) -> Bool {
        guard isChoosingReviveTile, remainingRevives > 0 else {
            return false
        }

        guard game.removeTile(row: row, column: column) else {
            return false
        }

        remainingRevives -= 1
        isChoosingReviveTile = false
        feedback.play(.revive)
        saveGame()
        return true
    }

    static func saveGameForTesting(game: GameBoard, remainingRevives: Int, defaults: UserDefaults) throws {
        let savedGame = SavedGame(game: game, remainingRevives: remainingRevives)
        let data = try JSONEncoder().encode(savedGame)
        defaults.set(data, forKey: Self.savedGameStorageKey)
    }

    private func saveGame() {
        try? Self.saveGameForTesting(game: game, remainingRevives: remainingRevives, defaults: defaults)
    }

    private static func loadSavedGame(defaults: UserDefaults) -> SavedGame? {
        guard let data = defaults.data(forKey: savedGameStorageKey) else {
            return nil
        }

        return try? JSONDecoder().decode(SavedGame.self, from: data)
    }
}

private struct SavedGame: Codable {
    let game: GameBoard
    let remainingRevives: Int
}
