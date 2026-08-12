# Bird 2048 iOS

This directory is reserved for the native iOS version of Bird 2048.

## Recommended Stack

- Swift
- SwiftUI for app structure and screens
- SpriteKit or SwiftUI Canvas for the game board
- Native asset catalogs for images and icons

## First Build Target

Create a native, clear Retina-rendered 2048 game that follows
`../shared/game-rules.md`.

Do not import or execute the Mini Game JavaScript code in the iOS app. Use it only
as a reference for behavior and product decisions.

## Suggested Initial Modules

- `GameBoard`: board state and move/merge logic.
- `GameViewModel`: score, high score, win/loss state, sound setting.
- `GameScene` or `GameCanvasView`: board rendering and animations.
- `AssetCatalog`: bird, flower, app icon, and audio resources.

## Local Development

Generate the Xcode project:

```bash
cd ios
xcodegen generate
```

Run tests on an available simulator:

```bash
xcodebuild test -project Bird2048.xcodeproj -scheme Bird2048 -destination 'platform=iOS Simulator,name=iPhone 17,OS=26.5'
```
