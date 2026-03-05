# project_context.md — MUST READ FIRST

## 0) Prime directive
You MUST read this file before making any decisions, writing code, or proposing changes.
If any instruction elsewhere conflicts with this file, THIS FILE WINS.

## 1) Product vision
Build a lightweight project time tracker for a user who switches between 5–10 projects per day.
Only one project can be active at a time. Switching projects stops the previous one and starts the new one.

## 2) MVP scope (non-negotiable)
### Required features
- Manage projects: add project number/id + project name to a visible list.
- Project tiles:
  - Inactive: greyed/neutral.
  - Active: green.
  - Only one active at a time.
- Time tracking:
  - Show hh:mm:ss for current active session.
  - Log sessions with timestamps.
  - Persist data locally (IndexedDB preferred).
- Daily summary:
  - Totals per project for selected date.
  - Show minutes, hours rounded to 1 decimal, and % split for that day.
- Interval report:
  - Choose start/end date.
  - Show accumulated hours per project + % split + total hours.
  - Provide print-friendly view and a Print button.
- Export:
  - CSV export for summaries (human/Excel).
  - JSON export for full fidelity sessions/projects.

### Out of scope for MVP (can propose later but do NOT implement first)
- Accounts, cloud sync, login
- Team features
- Server/backend
- Complex analytics dashboards

## 3) Behavior rules
- Timing MUST rely on timestamps (Date.now), not on setInterval accuracy.
- On refresh/reopen while tracking:
  - Use a SAFE recovery method:
    - stop session at last known heartbeat OR
    - prompt the user to confirm how to close the gap
  - Do NOT silently invent time.
- The app must remain usable as a normal web app (browser-independent).
- Extension packaging should be possible later without rewriting core logic.

## 4) Data model (baseline)
- Project:
  - id: string
  - name: string
  - createdAt: number (ms)
- Session:
  - id: string
  - projectId: string
  - startTs: number (ms)
  - endTs: number (ms)
  - durationSec: number
  - dateKey: string (YYYY-MM-DD, local)

## 5) UI/UX constraints
- Minimalistic UI, fast interactions.
- Make project switching obvious and safe.
- Provide clear “Currently tracking” indicator.
- Provide a Recent Sessions list for today.

## 6) Implementation constraints
- Prefer: React + TypeScript + Vite.
- Keep logic in services/hooks; UI components should stay thin.
- Use IndexedDB via a small wrapper (idb) unless you have a strong reason not to.

## 7) Definition of done
- Clean repo with README instructions.
- Runs locally via npm scripts.
- Data persists across reload.
- Summaries and interval report match stored sessions.
- Print view looks clean and fits on one page when possible.
- Exports produce correct data.

## 8) How to proceed (build order)
1) Set up scaffold + routing + global state for active session.
2) Implement IndexedDB schema + repos.
3) Implement Tracker page + session recording.
4) Implement Daily Summary computations + view.
5) Implement Interval Report computations + print layout.
6) Implement CSV + JSON export.
7) Polish UI + keyboard shortcuts (optional).