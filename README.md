# Project Time Tracker (MVP)

Lightweight single-user tracker for switching between multiple projects during the day.

## Stack

- React + TypeScript + Vite
- React Router
- IndexedDB via `idb`

## Features

- Project management: add/remove projects (`id` + name)
- Tracker screen with project tiles
  - inactive projects = neutral/grey
  - active project = green
  - only one active project at a time
- Timestamp-based session tracking (`Date.now`)
- Active timer display (`hh:mm:ss`)
- Safe recovery after reload:
  - keeps heartbeat while tracking
  - closes interrupted session at last heartbeat on next load
- Daily summary:
  - per-project totals
  - minutes
  - hours rounded to 1 decimal
  - percent split
- Interval report:
  - selectable start/end dates
  - per-project hours and percent split
  - total hours
  - print button + print stylesheet
- Exports:
  - CSV for summary tables
  - JSON full export (`projects`, `sessions`, `meta`)

## Run locally

```bash
npm install
npm run dev
```

Then open the local Vite URL printed in the terminal.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Notes

- Data is stored locally in browser IndexedDB (`project-time-tracker-db`).
- No backend or cloud sync in MVP.
- Update [DEVLOG.md](/Users/jvprivat/project-time-tracker/DEVLOG.md) before each commit and deployment.
