import Foundation

@Observable
final class GameViewModel {
    static let highScoreStorageKey = "highScore"

    private let defaults: UserDefaults
    private(set) var game: GameBoard
    private(set) var highScore: Int
    private(set) var remainingRevives = 3
    private(set) var isChoosingReviveTile = false

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

        game.play(direction)
        if game.score > highScore {
            highScore = game.score
            defaults.set(highScore, forKey: Self.highScoreStorageKey)
        }
    }

    func restart() {
        game = GameBoard.newGame()
        remainingRevives = 3
        isChoosingReviveTile = false
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
        return true
    }
}
