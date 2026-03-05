# AGENT_TASK.md — Implementation Tasks

You MUST read and follow project_context.md before doing anything.

## Goal
Get the app from scaffold to a working MVP with:
- Routing (Tracker, Daily Summary, Interval Report, Settings)
- Project list (add/remove)
- Single active project at a time
- Timestamp-based session logging
- Local persistence using IndexedDB (idb)
- Daily summary with minutes, hours (1 decimal), and %
- Interval report with print-friendly view
- Export CSV (summaries) and JSON (full dump)

## Required stack
React + TypeScript + Vite, react-router-dom, idb.

## Build order (do not skip)
1) Verify baseline Vite React app renders (fix white page if needed).
2) Add routing with 4 pages + navigation.
3) Add storage layer using IndexedDB:
   - projects store
   - sessions store
   - meta store (activeSession + heartbeat)
4) Implement Tracker page:
   - Add project (id + name)
   - Grid of project tiles (inactive grey, active green)
   - Only one active at a time
   - Start/stop sessions on switch
   - Running hh:mm:ss display for active session
   - Recent sessions list (today)
5) Implement analytics:
   - daily totals per project
   - interval totals per project
   - total time and percent share
6) Implement Daily Summary page:
   - date picker
   - totals table
   - export buttons
7) Implement Interval Report page:
   - start/end date pickers
   - run report
   - print button (window.print)
   - export buttons
8) Implement exports:
   - CSV: interval totals and/or daily totals
   - JSON: projects + sessions + meta
9) Add print.css for clean printable report.
10) Update README with setup/run steps.

## Recovery behavior (required)
Use safe recovery:
- Maintain a heartbeat timestamp while tracking.
- If app reloads and an active session exists:
  - End it at last heartbeat OR prompt user (choose end-at-heartbeat for MVP).
- Never “invent” time silently.

## Definition of done
- npm install; npm run dev => app renders
- Data persists across refresh
- Switching projects creates correct sessions
- Summaries match sessions
- Print view works
- Exports download correctly