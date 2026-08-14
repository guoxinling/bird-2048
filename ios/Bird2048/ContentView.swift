import SwiftUI

struct ContentView: View {
    @State private var viewModel = GameViewModel()

    var body: some View {
        ZStack {
            GameTheme.background
                .ignoresSafeArea()

            VStack(spacing: 18) {
                HeaderView(score: viewModel.score, highScore: viewModel.highScore)

                ZStack {
                    GameBoardView(
                        board: viewModel.board,
                        isChoosingReviveTile: viewModel.isChoosingReviveTile,
                        selectTile: viewModel.selectReviveTile
                    )

                    if viewModel.isChoosingReviveTile {
                        VStack {
                            Spacer()

                            Button {
                                _ = viewModel.cancelReviveMode()
                            } label: {
                                Label("取消复活", systemImage: "xmark")
                            }
                            .buttonStyle(PrimaryGameButtonStyle(tint: GameTheme.ink.opacity(0.78)))
                            .padding(.bottom, 16)
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
                .frame(maxWidth: 390)

                ControlBar(
                    canUndo: viewModel.canUndo,
                    isFeedbackEnabled: viewModel.isFeedbackEnabled,
                    statusText: viewModel.statusText,
                    restart: viewModel.restart,
                    undo: viewModel.undo,
                    setFeedbackEnabled: viewModel.setFeedbackEnabled
                )
                .frame(maxWidth: 390)

                Spacer(minLength: 0)
            }
            .padding(.horizontal, 22)
            .padding(.top, 20)
            .padding(.bottom, 18)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .gesture(
            DragGesture(minimumDistance: 20)
                .onEnded { value in
                    viewModel.move(direction: Direction.fromDrag(value.translation))
                }
        )
    }
}

private struct HeaderView: View {
    let score: Int
    let highScore: Int

    var body: some View {
        HStack(alignment: .bottom, spacing: 14) {
            VStack(alignment: .leading, spacing: 4) {
                Text("合合小鸟")
                    .font(.system(size: 38, weight: .black, design: .rounded))
                    .foregroundStyle(GameTheme.ink)
                    .lineLimit(1)
                    .minimumScaleFactor(0.72)

                Text("2048")
                    .font(.system(size: 15, weight: .heavy, design: .rounded))
                    .foregroundStyle(GameTheme.accent)
            }

            Spacer(minLength: 8)

            HStack(spacing: 8) {
                ScorePill(title: "分数", value: score)
                ScorePill(title: "最高分", value: highScore)
            }
        }
        .frame(maxWidth: 390)
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
        VStack(spacing: 12) {
            Text(title)
                .font(.system(size: 25, weight: .heavy, design: .rounded))
            Text("分数 \(score.formatted())")
                .font(.subheadline)

            if canContinueAfterWin {
                Button {
                    _ = continueAfterWin()
                } label: {
                    Label("继续挑战", systemImage: "play.fill")
                }
                .buttonStyle(PrimaryGameButtonStyle(tint: GameTheme.accent))
            }

            if canRevive {
                Button {
                    _ = revive()
                } label: {
                    Label("移除方块复活 \(remainingRevives)", systemImage: "heart.fill")
                }
                .buttonStyle(PrimaryGameButtonStyle(tint: GameTheme.green))
            }

            Button(action: restart) {
                Label("再来一次", systemImage: "arrow.clockwise")
            }
            .buttonStyle(SecondaryGameButtonStyle())
        }
        .padding(20)
        .foregroundStyle(GameTheme.ink)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(.thinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

private struct ScorePill: View {
    let title: String
    let value: Int

    var body: some View {
        VStack(spacing: 3) {
            Text(title)
                .font(.system(size: 12, weight: .semibold, design: .rounded))
            Text(value.formatted())
                .font(.system(size: 22, weight: .heavy, design: .rounded))
        }
        .foregroundStyle(GameTheme.ink)
        .frame(width: 76, height: 58)
        .background(GameTheme.scoreBackground)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay {
            RoundedRectangle(cornerRadius: 8)
                .stroke(.white.opacity(0.55), lineWidth: 1)
        }
        .shadow(color: GameTheme.shadow, radius: 10, y: 5)
    }
}

private struct ControlBar: View {
    let canUndo: Bool
    let isFeedbackEnabled: Bool
    let statusText: String
    let restart: () -> Void
    let undo: () -> Bool
    let setFeedbackEnabled: (Bool) -> Void

    var body: some View {
        VStack(spacing: 12) {
            HStack(spacing: 10) {
                Button(action: restart) {
                    Label("重开", systemImage: "arrow.clockwise")
                }
                .buttonStyle(PrimaryGameButtonStyle(tint: GameTheme.accent))

                Button {
                    _ = undo()
                } label: {
                    Label("撤销", systemImage: "arrow.uturn.backward")
                }
                .buttonStyle(SecondaryGameButtonStyle())
                .disabled(!canUndo)

                Toggle("触感", isOn: Binding(
                    get: { isFeedbackEnabled },
                    set: { setFeedbackEnabled($0) }
                ))
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(GameTheme.ink.opacity(0.82))
                .toggleStyle(.switch)
                .fixedSize()
            }

            Text(statusText)
                .font(.system(size: 15, weight: .semibold, design: .rounded))
                .foregroundStyle(GameTheme.ink.opacity(0.55))
                .frame(maxWidth: .infinity, alignment: .center)
        }
    }
}

private struct GameBoardView: View {
    let board: [[Int]]
    let isChoosingReviveTile: Bool
    let selectTile: (Int, Int) -> Bool

    var body: some View {
        LazyVGrid(columns: columns, spacing: 10) {
            ForEach(0..<16, id: \.self) { index in
                let row = index / 4
                let column = index % 4

                TileView(
                    value: board[row][column],
                    isSelectable: isChoosingReviveTile && board[row][column] != 0
                )
                .onTapGesture {
                    _ = selectTile(row, column)
                }
            }
        }
        .padding(10)
        .background {
            RoundedRectangle(cornerRadius: 8)
                .fill(GameTheme.boardBackground)
                .overlay {
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(.white.opacity(0.5), lineWidth: 1)
                }
                .shadow(color: GameTheme.shadow, radius: 18, y: 10)
        }
    }

    private var columns: [GridItem] {
        Array(repeating: GridItem(.flexible(), spacing: 10), count: 4)
    }
}

private struct PrimaryGameButtonStyle: ButtonStyle {
    let tint: Color

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .heavy, design: .rounded))
            .lineLimit(1)
            .minimumScaleFactor(0.82)
            .foregroundStyle(.white)
            .padding(.horizontal, 13)
            .frame(height: 42)
            .background {
                RoundedRectangle(cornerRadius: 8)
                    .fill(tint)
                    .overlay {
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(.white.opacity(0.35), lineWidth: 1)
                    }
                    .shadow(color: tint.opacity(0.28), radius: 10, y: 5)
            }
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
    }
}

private struct SecondaryGameButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 15, weight: .heavy, design: .rounded))
            .lineLimit(1)
            .minimumScaleFactor(0.82)
            .foregroundStyle(GameTheme.ink.opacity(configuration.isPressed ? 0.55 : 0.78))
            .padding(.horizontal, 13)
            .frame(height: 42)
            .background {
                RoundedRectangle(cornerRadius: 8)
                    .fill(.white.opacity(configuration.isPressed ? 0.54 : 0.76))
                    .overlay {
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(.white.opacity(0.65), lineWidth: 1)
                    }
            }
            .opacity(configuration.isPressed ? 0.82 : 1)
    }
}

private struct TileView: View {
    let value: Int
    let isSelectable: Bool

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(TileStyle.color(for: value))
                .shadow(color: value > 0 ? GameTheme.shadow.opacity(0.75) : .clear, radius: 5, y: 2)
                .overlay {
                    if isSelectable {
                        RoundedRectangle(cornerRadius: 8)
                            .stroke(GameTheme.green, lineWidth: 3)
                    }
                }

            if value > 0 {
                Text("\(value)")
                    .font(.system(size: tileFontSize, weight: .black, design: .rounded))
                    .foregroundStyle(TileStyle.textColor(for: value))
                    .minimumScaleFactor(0.6)
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .frame(maxWidth: .infinity)
        .contentShape(RoundedRectangle(cornerRadius: 8))
    }

    private var tileFontSize: CGFloat {
        if value < 100 {
            return 30
        }

        if value < 1000 {
            return 26
        }

        return 21
    }
}

private enum TileStyle {
    static func color(for value: Int) -> Color {
        switch value {
        case 0: return .white.opacity(0.45)
        case 2: return Color(red: 1.0, green: 0.89, blue: 0.82)
        case 4: return Color(red: 1.0, green: 0.78, blue: 0.67)
        case 8: return Color(red: 1.0, green: 0.89, blue: 0.55)
        case 16: return Color(red: 0.63, green: 0.88, blue: 0.78)
        case 32: return Color(red: 0.40, green: 0.77, blue: 0.73)
        case 64: return Color(red: 0.31, green: 0.63, blue: 0.82)
        case 128: return Color(red: 0.37, green: 0.58, blue: 0.91)
        case 256: return Color(red: 0.55, green: 0.49, blue: 0.89)
        case 512: return Color(red: 0.95, green: 0.61, blue: 0.54)
        case 1024: return Color(red: 0.98, green: 0.48, blue: 0.48)
        case 2048: return GameTheme.accent
        default: return Color(red: 0.90, green: 0.36, blue: 0.42)
        }
    }

    static func textColor(for value: Int) -> Color {
        value <= 16 ? GameTheme.ink : .white
    }
}

private enum GameTheme {
    static let ink = Color(red: 0.12, green: 0.19, blue: 0.30)
    static let accent = Color(red: 1.0, green: 0.55, blue: 0.24)
    static let green = Color(red: 0.23, green: 0.72, blue: 0.54)
    static let scoreBackground = Color(red: 0.86, green: 0.93, blue: 0.98)
    static let boardBackground = Color(red: 0.89, green: 0.86, blue: 0.78)
    static let shadow = Color(red: 0.34, green: 0.31, blue: 0.25).opacity(0.16)

    static var background: LinearGradient {
        LinearGradient(
            colors: [
                Color(red: 0.80, green: 0.93, blue: 0.98),
                Color(red: 0.98, green: 0.95, blue: 0.87)
            ],
            startPoint: .top,
            endPoint: .bottom
        )
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
