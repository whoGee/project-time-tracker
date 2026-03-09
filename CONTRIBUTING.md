# Contributing

This repository uses a lightweight trunk-based Git workflow.

## Branching model

- `main` is the stable source-of-truth branch.
- Use short-lived branches for all work:
  - `feature/<topic>`
  - `fix/<topic>`
  - `hotfix/<topic>`
- Open a Pull Request into `main` for review and traceability (even for solo work).

## Day-to-day workflow

1. Sync `main` and create a branch:

```bash
git switch main
git pull
git switch -c feature/<topic>
```

2. Implement changes and run checks:

```bash
npm run lint
npm run test
npm run build
```

3. Commit and push:

```bash
git add .
git commit -m "<clear change summary>"
git push -u origin feature/<topic>
```

4. Open PR and merge to `main` (prefer squash merge for a clean history).

## Release and versioning

This project follows Semantic Versioning:

- `major`: breaking changes
- `minor`: backward-compatible features
- `patch`: backward-compatible fixes

Create a release from `main`:

```bash
git switch main
git pull
npm version patch -m "release: v%s"
git push origin main --follow-tags
```

Use `minor` or `major` instead of `patch` when appropriate.

## Deployment

Deployment uses GitHub Pages via the `gh-pages` branch.

```bash
npm run deploy
```

`npm run deploy` runs `predeploy` automatically, which builds the app and publishes `dist` to `gh-pages`.

## Notes

- Keep [DEVLOG.md](/Users/jvprivat/project-time-tracker/DEVLOG.md) updated for significant changes and releases.
- Keep commits focused and reversible.
