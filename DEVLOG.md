# DEVLOG

Purpose: track all updates before each commit and deployment.

## How to use

- Add a new entry before every commit.
- Add a new entry before every deployment.
- Keep entries short, factual, and timestamped.
- Include verification steps (lint/build/tests) and deployment target/status.

## Entry template

```md
## YYYY-MM-DD HH:mm (local) - [commit|deploy]

### Summary
- Short description of what changed.

### Changes
- File/path: what was updated.
- File/path: what was updated.

### Verification
- Command: result
- Command: result

### Notes
- Risks, follow-ups, or rollback notes.
```

## Entries

## 2026-03-06 00:00 (local) - commit

### Summary
- Implemented full MVP for project time tracking and reporting.

### Changes
- Added IndexedDB persistence (`idb`) for projects/sessions/meta.
- Implemented tracker state with single active session and heartbeat recovery.
- Built Tracker, Daily Summary, Interval Report, and Settings routes.
- Added CSV and JSON export support.
- Added print stylesheet for interval reports.
- Updated README with app usage and scripts.

### Verification
- `npm run lint`: pass
- `npm run build`: pass

### Notes
- Recovery behavior closes interrupted session at last heartbeat.

## 2026-03-06 00:00 (local) - commit

### Summary
- Refined compact/minimal UI and improved Daily page operations.

### Changes
- Reduced overall layout width and compacted project tiles.
- Converted "Add project" to modal opened via round `+` button in Tracker header.
- Removed Tracker "Recent Sessions (Today)" section.
- Added Daily actions for deleting day records.
- Simplified Daily summary table to hours + percent only.
- Removed on-screen Daily session records view while keeping stored logs.

### Verification
- `npm run lint`: pass
- `npm run build`: pass

### Notes
- Session data remains persisted in IndexedDB even when not shown in Daily UI.

## 2026-03-06 00:25 (local) - commit

### Summary
- Stabilized GitHub Pages routing and compacted UI adjustments.

### Changes
- Added `gh-pages` deployment setup and scripts in `package.json`.
- Updated Vite base path and router strategy for GitHub Pages reliability.
- Removed header subtitle and compacted Interval Report visuals to match Daily.
- Added README/DEVLOG workflow note.

### Verification
- `npm run lint`: pass
- `npm run build`: pass

### Notes
- Hash-based routing is used to avoid Pages route fallback issues.

## 2026-03-06 00:25 (local) - deploy

### Summary
- Prepare deployment to GitHub Pages.

### Changes
- Deploy target: `gh-pages` branch from local `dist/` build.

### Verification
- `npm run predeploy`: pass

### Notes
- Execute `npm run deploy` after commit is pushed.
