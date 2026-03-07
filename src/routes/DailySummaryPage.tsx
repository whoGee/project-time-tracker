import { useMemo, useState } from "react";
import { useTracker } from "../context/useTracker";
import { downloadBlob, downloadText, fullDataToJson, summaryRowsToXlsx } from "../lib/export";
import { buildSummaryRows, totalHours } from "../lib/reporting";
import { todayDateKey } from "../lib/time";

export default function DailySummaryPage() {
  const {
    projects,
    sessions,
    deleteSessionsForDate,
    exportFullData,
  } = useTracker();
  const [dateKey, setDateKey] = useState(todayDateKey());

  const daySessions = useMemo(
    () => sessions.filter((session) => session.dateKey === dateKey),
    [dateKey, sessions]
  );

  const rows = useMemo(() => buildSummaryRows(projects, daySessions), [daySessions, projects]);

  const total = useMemo(() => totalHours(rows), [rows]);

  async function exportJson() {
    const { projects: allProjects, sessions: allSessions, meta } = await exportFullData();
    const json = fullDataToJson(allProjects, allSessions, meta);
    downloadText(`tracker-export-${dateKey}.json`, json, "application/json");
  }

  function exportXlsx() {
    const workbook = summaryRowsToXlsx(rows, `Daily summary ${dateKey}`);
    downloadBlob(`daily-summary-${dateKey}.xlsx`, workbook);
  }

  async function eraseDay() {
    const ok = window.confirm(`Delete all session records for ${dateKey}?`);
    if (!ok) {
      return;
    }
    await deleteSessionsForDate(dateKey);
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
          <button className="secondary-btn compact-btn" onClick={exportXlsx} disabled={rows.length === 0}>
            Export XLSX
          </button>
          <button className="secondary-btn compact-btn" onClick={() => void exportJson()}>
            Export JSON
          </button>
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
    </section>
  );
}
