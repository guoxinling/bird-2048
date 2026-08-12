# Bird 2048 Product Notes

## Platform Strategy

Maintain two platform projects:

- WeChat Mini Game for the existing launched mini program.
- Native iOS app for App Store release.

The projects share rules, product notes, audio, and visual direction. They do not
share runtime UI or platform integration code.

`shared/` is for product rules, notes, and asset guidance. It should not contain
cross-platform executable game code unless the repository strategy changes.

## Why Not Use a Game Engine Now

The game is lightweight and already launched as a Mini Game. Migrating to a
cross-platform engine now would add build, package, plugin, and review overhead
before the iOS version exists.

The near-term goal is faster iOS delivery with good native clarity.

## iOS MVP

The first iOS version should include:

- 4 by 4 2048 gameplay.
- Score and high score.
- Restart.
- Sound toggle.
- Clear native rendering on Retina screens.
- Bird visual identity using reusable image/audio assets.

Do not copy experimental Mini Game code directly into iOS.

## Monetization

Add monetization after the platform version is stable.

Recommended first ad placement:

- Rewarded revive after game over.

Avoid intrusive ads during active gameplay.
