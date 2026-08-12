import Foundation

enum Direction {
    case left
    case right
    case up
    case down
}

struct MoveResult: Equatable {
    let moved: Bool
    let scoreDelta: Int
}

struct GameBoard: Equatable {
    private(set) var cells: [[Int]]
    private(set) var score: Int

    init(cells: [[Int]], score: Int = 0) {
        self.cells = cells
        self.score = score
    }

    static func empty() -> GameBoard {
        GameBoard(cells: Array(repeating: Array(repeating: 0, count: 4), count: 4))
    }

    static func newGame(random: inout some RandomNumberGenerator) -> GameBoard {
        var board = GameBoard.empty()
        board.addRandomTile(random: &random)
        board.addRandomTile(random: &random)
        return board
    }

    static func newGame() -> GameBoard {
        var random = SystemRandomNumberGenerator()
        return newGame(random: &random)
    }

    var hasWon: Bool {
        cells.contains { row in row.contains(2048) }
    }

    var isGameOver: Bool {
        if cells.contains(where: { row in row.contains(0) }) {
            return false
        }

        for row in 0..<4 {
            for column in 0..<4 {
                let value = cells[row][column]
                if column < 3, cells[row][column + 1] == value {
                    return false
                }
                if row < 3, cells[row + 1][column] == value {
                    return false
                }
            }
        }

        return true
    }

    @discardableResult
    mutating func move(_ direction: Direction) -> MoveResult {
        let previousCells = cells
        var scoreDelta = 0

        switch direction {
        case .left:
            for row in 0..<4 {
                let result = Self.mergedLine(cells[row])
                cells[row] = result.line
                scoreDelta += result.scoreDelta
            }
        case .right:
            for row in 0..<4 {
                let result = Self.mergedLine(cells[row].reversed())
                cells[row] = Array(result.line.reversed())
                scoreDelta += result.scoreDelta
            }
        case .up:
            for column in 0..<4 {
                let result = Self.mergedLine((0..<4).map { cells[$0][column] })
                for row in 0..<4 {
                    cells[row][column] = result.line[row]
                }
                scoreDelta += result.scoreDelta
            }
        case .down:
            for column in 0..<4 {
                let result = Self.mergedLine((0..<4).map { cells[$0][column] }.reversed())
                let reversed = Array(result.line.reversed())
                for row in 0..<4 {
                    cells[row][column] = reversed[row]
                }
                scoreDelta += result.scoreDelta
            }
        }

        let moved = cells != previousCells
        if moved {
            score += scoreDelta
        }

        return MoveResult(moved: moved, scoreDelta: moved ? scoreDelta : 0)
    }

    @discardableResult
    mutating func addRandomTile(random: inout some RandomNumberGenerator) -> Bool {
        let emptyCells = cells.enumerated().flatMap { rowIndex, row in
            row.enumerated().compactMap { columnIndex, value in
                value == 0 ? (rowIndex, columnIndex) : nil
            }
        }

        guard !emptyCells.isEmpty else {
            return false
        }

        let position = emptyCells[Int.random(in: 0..<emptyCells.count, using: &random)]
        let roll = Double.random(in: 0..<1, using: &random)
        let value: Int
        if roll < 0.6 {
            value = 2
        } else if roll < 0.8 {
            value = 4
        } else {
            value = 8
        }

        cells[position.0][position.1] = value
        return true
    }

    private static func mergedLine(_ values: some Sequence<Int>) -> (line: [Int], scoreDelta: Int) {
        let compacted = values.filter { $0 != 0 }
        var merged: [Int] = []
        var scoreDelta = 0
        var index = 0

        while index < compacted.count {
            if index + 1 < compacted.count, compacted[index] == compacted[index + 1] {
                let value = compacted[index] * 2
                merged.append(value)
                scoreDelta += value
                index += 2
            } else {
                merged.append(compacted[index])
                index += 1
            }
        }

        while merged.count < 4 {
            merged.append(0)
        }

        return (merged, scoreDelta)
    }
}
