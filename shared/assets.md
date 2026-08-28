# Shared Assets

## Existing Assets

The Mini Game currently includes:

- `mini-program/images/animal.png`
- `mini-program/images/rank-bird.png`
- `mini-program/images/crown.png`
- `mini-program/images/bg.jpg`
- `mini-program/images/share.jpg`
- `mini-program/images/store-cover.jpg`
- `mini-program/images/tile-bird-{2,4,8,16,32,64,128,256,512,1024,2048,4096}.png`
  (compressed 192px copies of the iOS bird art; originals stay in the iOS asset catalog / design-assets)
- `mini-program/audio/bird.mp3`
- `mini-program/audio/move.mp3`
- `mini-program/audio/merge.mp3`

These can be reused as temporary iOS assets.

Short term, the binary asset source of truth remains under `mini-program/`.
When iOS needs an asset, copy it into the iOS project and record that usage here.
Do not edit Mini Game assets as a side effect of iOS work.

If assets later move into `shared/assets/`, update this file first and migrate
each platform in separate pull requests.

## iOS Asset Guidance

For iOS production quality:

- Export images as `@2x` and `@3x` raster assets, or use vector/PDF assets where
  appropriate.
- Keep text and UI shapes native whenever possible instead of baking them into
  images.
- Avoid rendering the whole app as a low-resolution bitmap.
- Use platform-native text rendering for scores, labels, and buttons.
