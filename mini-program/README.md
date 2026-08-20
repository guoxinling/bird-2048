# Bird 2048 WeChat Mini Game

This is the existing WeChat Mini Game version.

## Entry Points

- `game.js`: main game logic and Canvas rendering.
- `game.json`: Mini Game runtime configuration.
- `project.config.json`: WeChat Developer Tools project configuration.

## Open in WeChat DevTools

Open the `mini-program/` directory (not the repository root).

## Current Status (v1.2.0)

UI refresh on top of the 1.1.0 play-feel rules:

1. Light full-screen scene background; bird-only sprite on the hill.
2. HUD layout dodges the WeChat capsule; board stays near visual center.
3. Restart / Settings capsules; sound and version live in Settings.
4. Undo badge hides at 0; tapping the bird still shows speech after fetches are spent.
5. Crown accent on the 鸟 in the title.

Rules live in `../shared/game-rules.md`.

## Next Up

- Rewarded-ad extra revive (after 1.2 feels stable).
- Optional motion polish (only if product asks for it).

## Boundary

Do not move iOS implementation code into this project. Shared product behavior
belongs in `../shared/`.
