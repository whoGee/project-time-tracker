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

## 2026-03-06 23:25 (local) - commit

### Summary
- Restored all main routes that were replaced by placeholders and shipped backup/security prep notes.

### Changes
- `src/routes/TrackerPage.tsx`: restored full tracker UI (active timer, project switching, add/remove project flow).
- `src/routes/IntervalReportPage.tsx`: restored date-range report, print, CSV/JSON export.
- `src/routes/SettingsPage.tsx`: restored settings features (overview, JSON backup export/import, clear local data).
- `src/lib/db.ts`: added `clearAllData` and `importAllData` helpers.
- `src/context/trackerContextShared.ts`: added context API for clear/import.
- `src/context/TrackerContext.tsx`: wired clear/import to IndexedDB and in-memory state.
- `forNextRelease.md`: added security audit findings and next-release hardening recommendations.

### Verification
- `npm run lint`: pass
- `npm run build`: pass

### Notes
- Data remains browser-local in IndexedDB and isolated per origin/profile.

## 2026-03-06 23:27 (local) - deploy

### Summary
- Deployed latest fixes to GitHub Pages.

### Changes
- Deploy target: `gh-pages` branch from local `dist/` build.
- Includes restored Tracker/Interval/Settings pages and security notes file.

### Verification
- `npm run predeploy`: pass
- `npm run deploy`: pass (`Published`)

### Notes
- Source branch pushed: `main` at commit `457f9c0`.
