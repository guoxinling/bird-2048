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

## Maintenance Boundaries

- Cursor owns `mini-program/**` and must not submit `ios/**` changes unless
  explicitly authorized.
- Codex owns `ios/**` and `shared/**` and must not submit `mini-program/**`
  changes unless explicitly asked to fix the Mini Game.
- `shared/**`, `README.md`, and `.gitignore` are coordination files. Changes
  should be called out in the conversation and kept in focused commits.
- Runtime code is not shared between platforms. Shared behavior belongs in
  `shared/game-rules.md`.

## Branches and Pull Requests

- Use `main` as the stable branch.
- Prefer short-lived feature branches such as `cursor/fix-mini-program-dpr`,
  `cursor/feat-mini-program-ads`, `codex/feat-ios-initial-app`, and
  `codex/docs-shared-rules`.
- Pull request titles should start with `mp:`, `ios:`, or `shared:`.
- Avoid direct pushes to `main` after the GitHub remote is created.
