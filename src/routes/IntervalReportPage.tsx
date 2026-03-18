import { useMemo, useState } from "react";
import { useTracker } from "../context/useTracker";
import { downloadBlob, downloadText, fullDataToJson, intervalDataToXlsx } from "../lib/export";
import { buildSummaryRows, totalHours } from "../lib/reporting";
import { dateKeyDaysAgo, monthStartDateKey, todayDateKey } from "../lib/time";

export default function IntervalReportPage() {
  const { projects, sessions, exportFullData, includeProjectKeyInExports } = useTracker();
  const [startDate, setStartDate] = useState(todayDateKey());
  const [endDate, setEndDate] = useState(todayDateKey());
  const [appliedStartDate, setAppliedStartDate] = useState(todayDateKey());
  const [appliedEndDate, setAppliedEndDate] = useState(todayDateKey());
  const [error, setError] = useState("");

  const filteredSessions = useMemo(
    () =>
      sessions.filter(
        (session) => session.dateKey >= appliedStartDate && session.dateKey <= appliedEndDate
      ),
    [appliedEndDate, appliedStartDate, sessions]
  );

  const rows = useMemo(
    () => buildSummaryRows(projects, filteredSessions),
    [filteredSessions, projects]
  );
  const total = useMemo(() => totalHours(rows), [rows]);
  const scopeLabel = `${appliedStartDate} to ${appliedEndDate}`;

  function applyPreset(nextStartDate: string, nextEndDate: string) {
    setError("");
    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
    setAppliedStartDate(nextStartDate);
    setAppliedEndDate(nextEndDate);
  }

  function runReport() {
    if (!startDate || !endDate) {
      setError("Select both start and end dates.");
      return;
    }
    if (startDate > endDate) {
      setError("Start date must be on or before end date.");
      return;
    }

    setError("");
    setAppliedStartDate(startDate);
    setAppliedEndDate(endDate);
  }

  async function exportXlsx() {
    const workbook = await intervalDataToXlsx(
      projects,
      sessions,
      appliedStartDate,
      appliedEndDate,
      includeProjectKeyInExports
    );
    downloadBlob(`interval-report-${appliedStartDate}-to-${appliedEndDate}.xlsx`, workbook);
  }

  async function exportJson() {
    const { projects: allProjects, sessions: allSessions, meta } = await exportFullData();
    const json = fullDataToJson(allProjects, allSessions, meta);
    downloadText(`tracker-export-${appliedStartDate}-to-${appliedEndDate}.json`, json, "application/json");
  }

  return (
    <section>
      <h1>Interval Report</h1>

      <div className="card no-print">
        <div className="interval-controls">
          <div className="interval-field">
            <label htmlFor="interval-start">Start date</label>
            <input
              id="interval-start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="interval-field">
            <label htmlFor="interval-end">End date</label>
            <input
              id="interval-end"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
          <button className="secondary-btn interval-run-btn" onClick={runReport}>
            Fetch report
          </button>
          <div className="interval-presets">
            <button
              className="secondary-btn compact-btn"
              onClick={() => applyPreset(todayDateKey(), todayDateKey())}
            >
              Today
            </button>
            <button
              className="secondary-btn compact-btn"
              onClick={() => applyPreset(dateKeyDaysAgo(6), todayDateKey())}
            >
              Last 7 days
            </button>
            <button
              className="secondary-btn compact-btn"
              onClick={() => applyPreset(monthStartDateKey(), todayDateKey())}
            >
              This month
            </button>
          </div>
        </div>
        {error ? <div className="error-text">{error}</div> : null}
      </div>

      <div className="card print-area">
        <div className="toolbar no-print">
          <button className="secondary-btn compact-btn" onClick={() => void exportXlsx()}>
            Export XLSX
          </button>
          <button className="secondary-btn compact-btn" onClick={() => void exportJson()}>
            Export JSON
          </button>
          <button className="secondary-btn compact-btn" onClick={() => window.print()}>
            Print
          </button>
        </div>

        <div className="muted">Range: {scopeLabel}</div>
        {rows.length === 0 ? (
          <div className="empty">No tracked sessions in this date range.</div>
        ) : (
          <table className="data-table daily-summary-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Hours (1 dp)</th>
                <th>% of range</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.projectKey}>
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
