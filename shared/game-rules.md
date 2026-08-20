# Bird 2048 Game Rules

This file is the shared behavioral source of truth for the WeChat Mini Game and
native iOS versions.

Mini Game 1.2.0 implements the rules below. iOS may lag until it is updated;
document any platform deviation before changing implementation code.

## Board

- The game uses a 4 by 4 grid.
- Each cell contains either `0` for empty or a power-of-two tile value.
- A new game starts with two random tiles.

## Tile Generation

- A new tile is added only after a valid move changes the board.
- New tiles are:
  - `2` with about 90% probability
  - `4` with about 10% probability
- Regular `8` spawns are not used.
- The tile is placed in a randomly selected empty cell.

## Movement

- The player can move left, right, up, or down.
- On each move, all non-empty tiles slide as far as possible in that direction.
- Adjacent equal tiles merge once per move.
- A merged tile cannot merge again during the same move.
- The score increases by the value of each newly merged tile.

## Bird Fetch (Undo)

- The Mini Game grants 2 undos per game, presented as the bird "fetching back"
  the last action.
- An undo restores the board and score from before the last valid swipe,
  including the tile that spawned after that swipe.
- Players may undo up to two successive moves if both charges remain.
- Undo is available during play, not during revive tile selection.
- After undos are spent, the remaining-count badge is hidden. Tapping the bird
  still plays a hop and shows a speech bubble with flavor copy.

## Milestones

- Reaching 512, 1024, or 2048 is tracked internally for later features.
- The Mini Game does not show a top banner for milestones; play continues
  without an extra tap.
- Winning does not stop the game unless the platform UI explicitly chooses
  to show a blocking win state.

## Win and Loss

- The player wins when a `2048` tile appears.
- The game is over when the board has no empty cells and no adjacent equal cells
  horizontally or vertically.

## Revive

- The Mini Game allows 1 free revive per game.
- A revive lets the player remove one non-empty tile after game over.
- After removing a tile, the game resumes without immediately adding a new tile.

## Persistence

- Each platform stores the local high score.
- Sound enabled/disabled state should also persist locally.
