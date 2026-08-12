import SwiftUI

struct ContentView: View {
    @State private var viewModel = GameViewModel()

    var body: some View {
        VStack(spacing: 24) {
            HStack(alignment: .top) {
                Text("合合小鸟")
                    .font(.largeTitle.bold())

                Spacer()

                VStack(alignment: .trailing, spacing: 8) {
                    ScorePill(title: "分数", value: viewModel.score)
                    ScorePill(title: "最高分", value: viewModel.highScore)
                }
            }

            ZStack {
                GameBoardView(
                    board: viewModel.board,
                    isChoosingReviveTile: viewModel.isChoosingReviveTile,
                    selectTile: viewModel.selectReviveTile
                )

                if viewModel.isChoosingReviveTile {
                    VStack {
                        Spacer()

                        Button("取消复活") {
                            _ = viewModel.cancelReviveMode()
                        }
                        .buttonStyle(.borderedProminent)
                        .padding(.bottom, 18)
                    }
                }

                if viewModel.showsStatusOverlay {
                    StatusOverlay(
                        title: viewModel.statusTitle,
                        score: viewModel.score,
                        canContinueAfterWin: viewModel.hasWon && !viewModel.didContinueAfterWin,
                        canRevive: viewModel.isGameOver && viewModel.remainingRevives > 0,
                        remainingRevives: viewModel.remainingRevives,
                        continueAfterWin: viewModel.continueAfterWin,
                        revive: viewModel.activateReviveMode,
                        restart: viewModel.restart
                    )
                }
            }

            HStack {
                HStack(spacing: 8) {
                    Button("重新开始") {
                        viewModel.restart()
                    }
                    .buttonStyle(.borderedProminent)

                    Button("撤销") {
                        _ = viewModel.undo()
                    }
                    .buttonStyle(.bordered)
                    .disabled(!viewModel.canUndo)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 6) {
                    Toggle("触感", isOn: Binding(
                        get: { viewModel.isFeedbackEnabled },
                        set: { viewModel.setFeedbackEnabled($0) }
                    ))
                    .font(.caption)
                    .toggleStyle(.switch)

                    Text(viewModel.statusText)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(24)
        .background(Color(red: 0.97, green: 0.96, blue: 0.93))
        .gesture(
            DragGesture(minimumDistance: 20)
                .onEnded { value in
                    viewModel.move(direction: Direction.fromDrag(value.translation))
                }
        )
    }
}

private struct StatusOverlay: View {
    let title: String
    let score: Int
    let canContinueAfterWin: Bool
    let canRevive: Bool
    let remainingRevives: Int
    let continueAfterWin: () -> Bool
    let revive: () -> Bool
    let restart: () -> Void

    var body: some View {
        VStack(spacing: 14) {
            Text(title)
                .font(.title2.bold())
            Text("分数 \(score.formatted())")
                .font(.subheadline)

            if canContinueAfterWin {
                Button("继续挑战") {
                    _ = continueAfterWin()
                }
                .buttonStyle(.borderedProminent)
            }

            if canRevive {
                Button("移除一个方块复活 (\(remainingRevives))") {
                    _ = revive()
                }
                .buttonStyle(.borderedProminent)
            }

            Button("再来一次", action: restart)
                .buttonStyle(.bordered)
        }
        .foregroundStyle(Color(red: 0.17, green: 0.25, blue: 0.38))
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

private struct ScorePill: View {
    let title: String
    let value: Int

    var body: some View {
        VStack(spacing: 2) {
            Text(title)
                .font(.caption)
            Text(value.formatted())
                .font(.headline.bold())
        }
        .foregroundStyle(Color(red: 0.17, green: 0.25, blue: 0.38))
        .frame(width: 92, height: 54)
        .background(Color(red: 0.84, green: 0.89, blue: 0.94))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

private struct GameBoardView: View {
    let board: [[Int]]
    let isChoosingReviveTile: Bool
    let selectTile: (Int, Int) -> Bool

    var body: some View {
        Grid(horizontalSpacing: 10, verticalSpacing: 10) {
            ForEach(0..<4, id: \.self) { row in
                GridRow {
                    ForEach(0..<4, id: \.self) { column in
                        TileView(
                            value: board[row][column],
                            isSelectable: isChoosingReviveTile && board[row][column] != 0
                        )
                        .onTapGesture {
                            _ = selectTile(row, column)
                        }
                    }
                }
            }
        }
        .padding(10)
        .background(Color(red: 0.91, green: 0.89, blue: 0.84))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

private struct TileView: View {
    let value: Int
    let isSelectable: Bool

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(TileStyle.color(for: value))
                .overlay {
                    if isSelectable {
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(Color(red: 0.29, green: 0.63, blue: 0.55), lineWidth: 3)
                    }
                }

            if value > 0 {
                Text("\(value)")
                    .font(.system(size: value < 1000 ? 30 : 24, weight: .bold))
                    .foregroundStyle(TileStyle.textColor(for: value))
                    .minimumScaleFactor(0.6)
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .frame(maxWidth: .infinity)
        .contentShape(RoundedRectangle(cornerRadius: 8))
    }
}

private enum TileStyle {
    static func color(for value: Int) -> Color {
        switch value {
        case 0: return Color.white.opacity(0.35)
        case 2: return Color(red: 1.0, green: 0.90, blue: 0.85)
        case 4: return Color(red: 1.0, green: 0.82, blue: 0.73)
        case 8: return Color(red: 0.97, green: 0.90, blue: 0.70)
        case 16: return Color(red: 0.78, green: 0.90, blue: 0.85)
        case 32: return Color(red: 0.64, green: 0.84, blue: 0.78)
        case 64: return Color(red: 0.47, green: 0.78, blue: 0.76)
        case 128: return Color(red: 0.29, green: 0.63, blue: 0.55)
        case 256: return Color(red: 0.18, green: 0.53, blue: 0.45)
        case 512: return Color(red: 0.85, green: 0.78, blue: 0.68)
        case 1024: return Color(red: 1.0, green: 0.75, blue: 0.61)
        default: return Color(red: 1.0, green: 0.66, blue: 0.66)
        }
    }

    static func textColor(for value: Int) -> Color {
        value <= 16 ? Color(red: 0.36, green: 0.28, blue: 0.23) : .white
    }
}

extension Direction {
    static func fromDrag(_ translation: CGSize) -> Direction {
        if abs(translation.width) > abs(translation.height) {
            return translation.width > 0 ? .right : .left
        }

        return translation.height > 0 ? .down : .up
    }
}

#Preview {
    ContentView()
}
