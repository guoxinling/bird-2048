# Bird 2048

This repository is organized as a product workspace for the Bird 2048 game.

## Projects

- `mini-program/`: the existing WeChat Mini Game version.
- `ios/`: the native iOS app workspace.
- `shared/`: cross-platform product notes, game rules, and asset guidance.

## Development Strategy

The WeChat Mini Game and iOS app are maintained as separate platform projects.
They should share product decisions, game rules, copy, audio, and visual direction,
but they should not share runtime code.

This keeps platform-specific work clean:

- WeChat Mini Game: JavaScript, Canvas, WeChat APIs, mini game ads.
- iOS App: Swift/SwiftUI/SpriteKit, App Store requirements, iOS ads.

## Current Priorities

1. Keep the Mini Game stable and fix rendering clarity issues.
2. Build the iOS version as a native app.
3. Use `shared/game-rules.md` as the behavioral source of truth.
4. Add monetization only after each platform has a stable playable version.
