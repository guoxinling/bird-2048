import Foundation

@Observable
final class GameViewModel {
    private(set) var game = GameBoard.newGame()
    private(set) var highScore = 0

    var board: [[Int]] {
        game.cells
    }

    var score: Int {
        game.score
    }

    var statusText: String {
        if game.hasWon {
            return "已达成 2048"
        }

        if game.isGameOver {
            return "游戏结束"
        }

        return "滑动合并数字"
    }

    func move(direction: Direction) {
        game.move(direction)
        highScore = max(highScore, game.score)
    }

    func restart() {
        game = GameBoard.newGame()
    }
}
