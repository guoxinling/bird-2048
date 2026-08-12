import Testing
@testable import Bird2048

struct GameBoardTests {
    @Test
    func moveLeftSlidesAndMergesEachPairOnce() {
        var board = GameBoard(cells: [
            [2, 0, 2, 2],
            [4, 4, 4, 4],
            [0, 0, 8, 8],
            [16, 0, 0, 0]
        ])

        let result = board.move(.left)

        #expect(result == MoveResult(moved: true, scoreDelta: 36))
        #expect(board.cells == [
            [4, 2, 0, 0],
            [8, 8, 0, 0],
            [16, 0, 0, 0],
            [16, 0, 0, 0]
        ])
        #expect(board.score == 36)
    }

    @Test
    func moveRightSlidesAndMergesTowardRightEdge() {
        var board = GameBoard(cells: [
            [2, 0, 2, 2],
            [4, 4, 4, 4],
            [0, 0, 8, 8],
            [16, 0, 0, 0]
        ])

        let result = board.move(.right)

        #expect(result == MoveResult(moved: true, scoreDelta: 36))
        #expect(board.cells == [
            [0, 0, 2, 4],
            [0, 0, 8, 8],
            [0, 0, 0, 16],
            [0, 0, 0, 16]
        ])
    }

    @Test
    func moveUpMergesColumns() {
        var board = GameBoard(cells: [
            [2, 0, 2, 4],
            [2, 4, 2, 4],
            [0, 4, 8, 0],
            [2, 0, 8, 4]
        ])

        let result = board.move(.up)

        #expect(result == MoveResult(moved: true, scoreDelta: 40))
        #expect(board.cells == [
            [4, 8, 4, 8],
            [2, 0, 16, 4],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ])
    }

    @Test
    func moveDownMergesColumns() {
        var board = GameBoard(cells: [
            [2, 0, 2, 4],
            [2, 4, 2, 4],
            [0, 4, 8, 0],
            [2, 0, 8, 4]
        ])

        let result = board.move(.down)

        #expect(result == MoveResult(moved: true, scoreDelta: 40))
        #expect(board.cells == [
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [2, 0, 4, 4],
            [4, 8, 16, 8]
        ])
    }

    @Test
    func unchangedMoveDoesNotAddScore() {
        var board = GameBoard(cells: [
            [2, 4, 8, 16],
            [32, 64, 128, 256],
            [512, 1024, 2, 4],
            [8, 16, 32, 64]
        ], score: 100)

        let result = board.move(.left)

        #expect(result == MoveResult(moved: false, scoreDelta: 0))
        #expect(board.score == 100)
    }

    @Test
    func playAddsOneTileAfterValidMove() {
        var board = GameBoard(cells: [
            [2, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ])
        var random = SeededRandom(seed: 1)

        let result = board.play(.right, random: &random)

        #expect(result.moved)
        #expect(board.nonEmptyTileCount == 2)
        #expect(board.cells[0][3] == 2)
    }

    @Test
    func playDoesNotAddTileAfterInvalidMove() {
        var board = GameBoard(cells: [
            [2, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 0, 0]
        ])
        var random = SeededRandom(seed: 1)

        let result = board.play(.left, random: &random)

        #expect(!result.moved)
        #expect(board.nonEmptyTileCount == 1)
        #expect(board.cells[0][0] == 2)
    }

    @Test
    func detectsGameOverOnlyWhenNoMovesRemain() {
        let gameOverBoard = GameBoard(cells: [
            [2, 4, 2, 4],
            [4, 2, 4, 2],
            [2, 4, 2, 4],
            [4, 2, 4, 2]
        ])
        let playableBoard = GameBoard(cells: [
            [2, 4, 2, 4],
            [4, 2, 4, 2],
            [2, 4, 2, 4],
            [4, 2, 4, 4]
        ])

        #expect(gameOverBoard.isGameOver)
        #expect(!playableBoard.isGameOver)
    }

    @Test
    func detectsWinningTile() {
        let board = GameBoard(cells: [
            [2, 4, 8, 16],
            [32, 64, 128, 256],
            [512, 1024, 2048, 4],
            [8, 16, 32, 64]
        ])

        #expect(board.hasWon)
    }
}

private struct SeededRandom: RandomNumberGenerator {
    var seed: UInt64

    mutating func next() -> UInt64 {
        seed = seed &* 6_364_136_223_846_793_005 &+ 1
        return seed
    }
}
