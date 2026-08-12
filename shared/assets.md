# Shared Assets

## Existing Assets

The Mini Game currently includes:

- `mini-program/images/animal.png`
- `mini-program/images/flower.png`
- `mini-program/audio/bird.mp3`
- `mini-program/audio/move.mp3`
- `mini-program/audio/merge.mp3`

These can be reused as temporary iOS assets.

## iOS Asset Guidance

For iOS production quality:

- Export images as `@2x` and `@3x` raster assets, or use vector/PDF assets where
  appropriate.
- Keep text and UI shapes native whenever possible instead of baking them into
  images.
- Avoid rendering the whole app as a low-resolution bitmap.
- Use platform-native text rendering for scores, labels, and buttons.
