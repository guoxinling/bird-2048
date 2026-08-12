# Bird 2048 WeChat Mini Game

This is the existing WeChat Mini Game version.

## Entry Points

- `game.js`: main game logic and Canvas rendering.
- `game.json`: Mini Game runtime configuration.
- `project.config.json`: WeChat Developer Tools project configuration.

## Open in WeChat DevTools

Open the `mini-program/` directory (not the repository root).

## Current Status (v1.0.1)

Shipped quality fixes in this tree:

1. Canvas clarity via device pixel ratio scaling.
2. Single global touch listener set (no nested re-registration).
3. Non-blocking 2048 win banner; game-over check no longer skipped.
4. Tile colors for 4096+ with fallback styling.
5. Leaner audio unlock on first gesture; upload pack ignores backups.

## Next Up

- Rewarded-ad revive (after gameplay stays stable).
- Optional motion polish (only if product asks for it).

## Boundary

Do not move iOS implementation code into this project. Shared product behavior
belongs in `../shared/`.
