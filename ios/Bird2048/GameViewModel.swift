import Foundation

@Observable
final class GameViewModel {
    static let highScoreStorageKey = "highScore"

    private let defaults: UserDefaults
    private(set) var game: GameBoard
    private(set) var highScore: Int

    init(game: GameBoard = GameBoard.newGame(), defaults: UserDefaults = .standard) {
        self.defaults = defaults
        self.game = game
        highScore = defaults.integer(forKey: Self.highScoreStorageKey)
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
        hasWon || isGameOver
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
        if hasWon {
            return "已达成 2048"
        }

        if isGameOver {
            return "游戏结束"
        }

        return "滑动合并数字"
    }

    func move(direction: Direction) {
        guard !isGameOver else {
            return
        }

        game.play(direction)
        if game.score > highScore {
            highScore = game.score
            defaults.set(highScore, forKey: Self.highScoreStorageKey)
        }
    }

    func restart() {
        game = GameBoard.newGame()
    }
}
