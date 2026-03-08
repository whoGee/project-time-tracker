import { useMemo, useState } from "react";
import { useTracker } from "../context/useTracker";
import { buildSummaryRows, totalHours } from "../lib/reporting";
import {
  formatHhMmSs,
  parseLocalDateTimeInputValue,
  toLocalDateTimeInputValue,
  todayDateKey,
} from "../lib/time";
import type { Session } from "../types";

export default function DailySummaryPage() {
  const {
    projects,
    sessions,
    deleteSessionsForDate,
    updateSessionRecord,
    deleteSessionRecord,
  } = useTracker();
  const [dateKey, setDateKey] = useState(todayDateKey());
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editProjectId, setEditProjectId] = useState("");
  const [editStartValue, setEditStartValue] = useState("");
  const [editEndValue, setEditEndValue] = useState("");
  const [editError, setEditError] = useState("");

  const daySessions = useMemo(
    () => sessions.filter((session) => session.dateKey === dateKey),
    [dateKey, sessions]
  );

  const rows = useMemo(() => buildSummaryRows(projects, daySessions), [daySessions, projects]);

  const total = useMemo(() => totalHours(rows), [rows]);

  async function eraseDay() {
    const ok = window.confirm(`Delete all session records for ${dateKey}?`);
    if (!ok) {
      return;
    }
    await deleteSessionsForDate(dateKey);
  }

  function openEditSession(session: Session) {
    setEditError("");
    setEditingSessionId(session.id);
    setEditProjectId(session.projectId);
    setEditStartValue(toLocalDateTimeInputValue(session.startTs));
    setEditEndValue(toLocalDateTimeInputValue(session.endTs));
  }

  async function saveSessionEdit() {
    if (!editingSessionId) {
      return;
    }
    const startTs = parseLocalDateTimeInputValue(editStartValue);
    const endTs = parseLocalDateTimeInputValue(editEndValue);
    if (startTs === null || endTs === null) {
      setEditError("Choose valid start/end timestamps.");
      return;
    }

    try {
      await updateSessionRecord(editingSessionId, {
        projectId: editProjectId,
        startTs,
        endTs,
      });
      setEditingSessionId(null);
      setEditError("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update session.";
      setEditError(message);
    }
  }

  async function removeSession(sessionId: string) {
    const ok = window.confirm("Delete this session?");
    if (!ok) {
      return;
    }
    await deleteSessionRecord(sessionId);
  }

  return (
    <section>
      <h1>Daily Summary</h1>

      <div className="card no-print">
        <label htmlFor="daily-date">Date</label>
        <input id="daily-date" type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
      </div>

      <div className="card">
        <div className="toolbar no-print">
          <button
            className="danger-btn compact-btn"
            onClick={() => void eraseDay()}
            disabled={daySessions.length === 0}
          >
            Erase day records
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="empty">No tracked sessions for this date.</div>
        ) : (
          <table className="data-table daily-summary-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Hours (1 dp)</th>
                <th>% of day</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.projectId}>
                  <td>
                    {row.projectId} - {row.projectName}
                  </td>
                  <td>{row.hours.toFixed(1)}</td>
                  <td>{row.percent.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="report-total">Total hours: {total.toFixed(1)}</div>
      </div>

      <div className="card">
        <h2 className="compact-heading">Sessions ({daySessions.length})</h2>
        {daySessions.length === 0 ? (
          <div className="muted">No sessions for this day.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Start</th>
                <th>End</th>
                <th>Duration</th>
                <th className="no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {daySessions.map((session) => (
                <tr key={session.id}>
                  <td>{session.projectId}</td>
                  <td>{new Date(session.startTs).toLocaleTimeString()}</td>
                  <td>{new Date(session.endTs).toLocaleTimeString()}</td>
                  <td>{formatHhMmSs(session.durationSec)}</td>
                  <td className="no-print">
                    <div className="inline-fields">
                      <button className="mini-btn" type="button" onClick={() => openEditSession(session)}>
                        Edit
                      </button>
                      <button
                        className="mini-btn"
                        type="button"
                        onClick={() => void removeSession(session.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingSessionId ? (
        <div className="modal-backdrop no-print" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-title">Edit Session</div>
            <div className="form-grid">
              <div>
                <label htmlFor="daily-edit-session-project">Project</label>
                <select
                  id="daily-edit-session-project"
                  value={editProjectId}
                  onChange={(event) => setEditProjectId(event.target.value)}
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.id} - {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="daily-edit-session-start">Start</label>
                <input
                  id="daily-edit-session-start"
                  type="datetime-local"
                  value={editStartValue}
                  onChange={(event) => setEditStartValue(event.target.value)}
                />
              </div>
              <div>
                <label htmlFor="daily-edit-session-end">End</label>
                <input
                  id="daily-edit-session-end"
                  type="datetime-local"
                  value={editEndValue}
                  onChange={(event) => setEditEndValue(event.target.value)}
                />
              </div>
              {editError ? <div className="error-text">{editError}</div> : null}
              <div className="inline-fields">
                <button className="primary-btn compact-btn" type="button" onClick={() => void saveSessionEdit()}>
                  Save
                </button>
                <button
                  className="secondary-btn compact-btn"
                  type="button"
                  onClick={() => setEditingSessionId(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
