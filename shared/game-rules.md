# Bird 2048 Game Rules

This file is the shared behavioral source of truth for the WeChat Mini Game and
native iOS versions.

## Board

- The game uses a 4 by 4 grid.
- Each cell contains either `0` for empty or a power-of-two tile value.
- A new game starts with two random tiles.

## Tile Generation

- A new tile is added only after a valid move changes the board.
- The current Mini Game version generates:
  - `2` with about 60% probability.
  - `4` with about 20% probability.
  - `8` with about 20% probability.
- The tile is placed in a randomly selected empty cell.

## Movement

- The player can move left, right, up, or down.
- On each move, all non-empty tiles slide as far as possible in that direction.
- Adjacent equal tiles merge once per move.
- A merged tile cannot merge again during the same move.
- The score increases by the value of each newly merged tile.

## Win and Loss

- The player wins when a `2048` tile appears.
- The game is over when the board has no empty cells and no adjacent equal cells
  horizontally or vertically.
- Winning does not have to stop the game unless the platform UI explicitly chooses
  to show a blocking win state.

## Revive

- The current Mini Game version allows up to 3 revives per game.
- A revive lets the player remove one non-empty tile after game over.
- After removing a tile, the game resumes without immediately adding a new tile.

## Persistence

- Each platform stores the local high score.
- Sound enabled/disabled state should also persist locally.
