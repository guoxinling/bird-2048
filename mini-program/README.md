# Bird 2048 WeChat Mini Game

This is the existing WeChat Mini Game version.

## Entry Points

- `game.js`: main game logic and Canvas rendering.
- `game.json`: Mini Game runtime configuration.
- `project.config.json`: WeChat Developer Tools project configuration.

## Current Maintenance Priorities

1. Fix Canvas clarity by applying device pixel ratio scaling.
2. Simplify touch event registration.
3. Clean up audio initialization and debug logging.
4. Keep platform-specific Mini Game ads and WeChat APIs in this directory.

## Boundary

Do not move iOS implementation code into this project. Shared product behavior
belongs in `../shared/`.
