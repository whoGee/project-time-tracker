import { useMemo, useState } from "react";
import { useTracker } from "../context/useTracker";
import { downloadText, fullDataToJson, summaryRowsToCsv } from "../lib/export";
import { buildSummaryRows, totalHours } from "../lib/reporting";
import { endOfDayTs, startOfDayTs, todayDateKey } from "../lib/time";

function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function IntervalReportPage() {
  const { projects, sessions, exportFullData } = useTracker();
  const today = todayDateKey();
  const [startDate, setStartDate] = useState(shiftDateKey(today, -6));
  const [endDate, setEndDate] = useState(today);
  const [appliedRange, setAppliedRange] = useState({ startDate: shiftDateKey(today, -6), endDate: today });

  const rows = useMemo(() => {
    const start = startOfDayTs(appliedRange.startDate);
    const end = endOfDayTs(appliedRange.endDate);
    const filtered = sessions.filter((session) => session.startTs >= start && session.startTs <= end);
    return buildSummaryRows(projects, filtered);
  }, [appliedRange.endDate, appliedRange.startDate, projects, sessions]);

  const total = useMemo(() => totalHours(rows), [rows]);

  function runReport() {
    setAppliedRange({ startDate, endDate });
  }

  async function exportJson() {
    const { projects: allProjects, sessions: allSessions, meta } = await exportFullData();
    const json = fullDataToJson(allProjects, allSessions, meta);
    downloadText(
      `interval-full-export-${appliedRange.startDate}-to-${appliedRange.endDate}.json`,
      json,
      "application/json"
    );
  }

  function exportCsv() {
    const csv = summaryRowsToCsv(
      rows,
      `Interval ${appliedRange.startDate} to ${appliedRange.endDate} (hours=${total.toFixed(1)})`
    );
    downloadText(
      `interval-summary-${appliedRange.startDate}-to-${appliedRange.endDate}.csv`,
      csv,
      "text/csv;charset=utf-8"
    );
  }

  return (
    <section>
      <h1>Interval Report</h1>

      <div className="card no-print">
        <div className="inline-fields">
          <div>
            <label htmlFor="report-start">Start date</label>
            <input
              id="report-start"
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="report-end">End date</label>
            <input
              id="report-end"
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <button className="primary-btn" onClick={runReport}>
            Run report
          </button>
        </div>
      </div>

      <div className="card print-area">
        <div className="print-heading">
          <strong>Range:</strong> {appliedRange.startDate} to {appliedRange.endDate}
        </div>
        <div className="toolbar no-print">
          <button className="secondary-btn" onClick={() => window.print()}>
            Print
          </button>
          <button className="secondary-btn" onClick={exportCsv} disabled={rows.length === 0}>
            Export CSV
          </button>
          <button className="secondary-btn" onClick={() => void exportJson()}>
            Export JSON
          </button>
        </div>

        {rows.length === 0 ? (
          <div className="empty">No sessions in selected interval.</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Hours (1 dp)</th>
                <th>% split</th>
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
