# Bird 2048 WeChat Mini Game

This is the existing WeChat Mini Game version.

## Entry Points

- `game.js`: main game logic and Canvas rendering.
- `game.json`: Mini Game runtime configuration.
- `project.config.json`: WeChat Developer Tools project configuration.

## Open in WeChat DevTools

Open the `mini-program/` directory (not the repository root).

## Current Status (v1.1.0)

Play-feel update on top of the 1.0.1 quality baseline:

1. New tiles are `2` (~90%) or `4` (~10%); regular `8` spawns are gone.
2. Bird assist: 2 undos per game (`衔回上一步`), plus tip copy.
3. Silent milestone tracking (no top banner interrupting play).
4. Tile slide / merge pop / score +N, plus a simple bird idle motion.
5. Free revive reduced from 3 to 1 per game.

Rules live in `../shared/game-rules.md`.

## Next Up

- Rewarded-ad extra revive (after 1.1 feels stable).
- Optional motion polish (only if product asks for it).

## Boundary

Do not move iOS implementation code into this project. Shared product behavior
belongs in `../shared/`.
