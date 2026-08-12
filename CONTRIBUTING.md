# Contributing

## Ownership

- `mini-program/**`: Cursor-owned Mini Game implementation.
- `ios/**`: Codex-owned native iOS implementation.
- `shared/**`: shared product rules, product notes, and asset guidance.
- `README.md`, `.gitignore`, `.github/**`: coordination and repository files.

Cursor must not submit `ios/**` changes unless explicitly authorized.
Codex must not submit `mini-program/**` changes unless explicitly asked to fix
the Mini Game.

## Shared Files

Changes to `shared/**`, `README.md`, `.gitignore`, or `.github/**` should be
small, intentional, and called out before committing.

`shared/game-rules.md` is the behavior source of truth. If one platform needs to
deviate, document the deviation before changing implementation code.

`shared/` is for documentation, product rules, and asset guidance. Do not put
cross-platform runtime business code here unless the repository strategy is
explicitly changed later.

## Assets

Short term, the Mini Game assets remain the source files:

- `mini-program/images/**`
- `mini-program/audio/**`

iOS may copy those assets into its own native asset catalog when needed. When an
asset is copied or replaced, update `shared/assets.md` in the same focused
change.

If assets are later moved into `shared/assets/`, update `shared/assets.md` first
and migrate each platform in separate pull requests.

## Branches

Use `main` as the stable branch. Use short-lived branches:

- `cursor/fix-mini-program-dpr`
- `cursor/feat-mini-program-ads`
- `codex/feat-ios-initial-app`
- `codex/docs-shared-rules`

Pull request titles should start with one of:

- `mp:`
- `ios:`
- `shared:`

Before merging, check `git diff main --stat` and confirm the changed paths match
the branch purpose.

## Merge Policy

After the GitHub remote is created, `main` should receive changes through pull
requests or explicit local review. Avoid direct pushes to `main`.
