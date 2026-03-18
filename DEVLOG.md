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

## 2026-03-07 07:59 (local) - commit

### Summary
- Replaced summary CSV exports with XLSX exports.

### Changes
- `src/lib/export.ts`: replaced CSV formatter with XLSX workbook export helper and added blob download helper.
- `src/routes/DailySummaryPage.tsx`: switched summary export action/button from CSV to XLSX.
- `src/routes/IntervalReportPage.tsx`: switched summary export action/button from CSV to XLSX.
- `package.json`, `package-lock.json`: added `xlsx` dependency.
- `README.md`: updated export format documentation from CSV to XLSX.

### Verification
- `npm run lint`: pass
- `npm run build`: pass

### Notes
- JSON full export remains unchanged.

## 2026-03-07 07:59 (local) - deploy

### Summary
- Deploy updated XLSX export build to GitHub Pages.

### Changes
- Deploy target: `gh-pages` branch from local `dist/` build.
- Includes replacement of summary CSV exports with XLSX exports.

### Verification
- `npm run predeploy`: pass
- `npm run deploy`: pass (`Published`)

### Notes
- Source branch push follows deployment in this release step.

## 2026-03-09 22:59 (local) - release prep

### Summary
- Added contribution workflow documentation and surfaced app semantic version in the UI.

### Changes
- `CONTRIBUTING.md`: added branching, PR, release, and deploy workflow.
- `README.md`: linked to contribution and release workflow documentation.
- `vite.config.ts`: injected app version from `package.json` at build time.
- `src/globals.d.ts`: declared global build-time app version constant.
- `src/App.tsx`: rendered bottom-right version badge.
- `src/index.css`: styled fixed version badge to match tile text sizing.

### Verification
- `npm run build`: pass

### Notes
- Version badge renders `v<package.json version>`.

## 2026-03-18 20:34 (local) - commit

### Summary
- Prepared `v0.2.0` with duplicate-project support, short internal project keys, export key toggle, and Daily/Tracker UI refinements.

### Changes
- `package.json`, `package-lock.json`: bumped app version to `0.2.0`.
- `src/types.ts`, `src/context/TrackerContext.tsx`, `src/context/trackerContextShared.ts`, `src/context/sessionLifecycle.ts`: moved project/session identity to internal project keys and persisted export-key settings in app meta.
- `src/lib/db.ts`, `src/lib/validation.ts`, `src/lib/reporting.ts`, `src/lib/export.ts`, `src/lib/projectIdentity.ts`: added project-key migration/normalization, duplicate `Project ID + Project Name` validation, report grouping by internal key, short-key generation, and optional `Project Key` export columns.
- `src/routes/TrackerPage.tsx`, `src/routes/DailySummaryPage.tsx`, `src/routes/IntervalReportPage.tsx`, `src/routes/SettingsPage.tsx`, `src/index.css`: updated project creation rules, combined project labels, Daily sessions display, export setting UI, and fixed tracker banner sizing.
- `tests/reporting.test.ts`, `tests/tracker-context.test.ts`, `tests/export.test.ts`, `tests/validation.test.ts`, `tests/project-identity.test.ts`: added regression coverage for duplicate visible IDs, export column toggling, backup compatibility, and key-migration preservation of visible totals.

### Verification
- `npm test`: pass
- `npm run lint`: pass
- `npm run build`: pass

### Notes
- Build still emits the existing `exceljs` chunk-size warning; release build completes successfully.

## 2026-03-18 20:35 (local) - deploy

### Summary
- Deployed `v0.2.0` to GitHub Pages.

### Changes
- Deploy target: `gh-pages` branch from local `dist/` build.
- Includes project identity migration, duplicate `Project ID + Project Name` support, export key toggle, shorter internal keys, and Daily/Tracker UI updates.

### Verification
- `npm run deploy`: pass (`Published`)

### Notes
- Source branch push and version tag follow deployment in this release step.
