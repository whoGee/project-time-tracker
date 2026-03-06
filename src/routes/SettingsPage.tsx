import { type ChangeEvent, useMemo, useState } from "react";
import { useTracker } from "../context/useTracker";
import { downloadText, fullDataToJson } from "../lib/export";
import type { MetaState, Project, Session } from "../types";

interface ImportedData {
  projects: Project[];
  sessions: Session[];
  meta: MetaState;
}

function parseImportedData(input: string): ImportedData | null {
  const raw = JSON.parse(input) as Partial<ImportedData> & { meta?: Partial<MetaState> };

  if (!Array.isArray(raw.projects) || !Array.isArray(raw.sessions)) {
    return null;
  }

  return {
    projects: raw.projects as Project[],
    sessions: raw.sessions as Session[],
    meta: {
      activeSession: raw.meta?.activeSession ?? null,
    },
  };
}

export default function SettingsPage() {
  const {
    projects,
    sessions,
    activeSession,
    exportFullData,
    clearAllData,
    importFullData,
  } = useTracker();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const totalTrackedHours = useMemo(
    () => (sessions.reduce((acc, session) => acc + session.durationSec, 0) / 3600).toFixed(1),
    [sessions]
  );

  async function exportBackup() {
    const { projects: allProjects, sessions: allSessions, meta } = await exportFullData();
    const json = fullDataToJson(allProjects, allSessions, meta);
    const datePart = new Date().toISOString().slice(0, 10);
    downloadText(`tracker-backup-${datePart}.json`, json, "application/json");
    setError("");
    setStatus("Backup exported.");
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseImportedData(text);
      if (!parsed) {
        throw new Error("Invalid backup format.");
      }
      await importFullData(parsed.projects, parsed.sessions, parsed.meta);
      setError("");
      setStatus("Backup imported.");
    } catch {
      setStatus("");
      setError("Import failed. Use a valid JSON backup exported from this app.");
    } finally {
      event.target.value = "";
    }
  }

  async function clearLocalData() {
    const ok = window.confirm(
      "Delete all local projects, sessions, and active tracking state? This cannot be undone."
    );
    if (!ok) {
      return;
    }

    await clearAllData();
    setError("");
    setStatus("All local data deleted.");
  }

  return (
    <section>
      <h1>Settings</h1>

      <div className="card">
        <h2 className="compact-heading">Data overview</h2>
        <div className="settings-list">
          <div>Projects: {projects.length}</div>
          <div>Sessions: {sessions.length}</div>
          <div>Total tracked hours: {totalTrackedHours}</div>
          <div>Active session: {activeSession ? "Yes" : "No"}</div>
        </div>
      </div>

      <div className="card no-print">
        <h2 className="compact-heading">Backup</h2>
        <div className="toolbar">
          <button className="secondary-btn compact-btn" onClick={() => void exportBackup()}>
            Export JSON backup
          </button>
          <label className="secondary-btn compact-btn" htmlFor="import-backup">
            Import JSON backup
          </label>
          <input
            id="import-backup"
            type="file"
            accept="application/json,.json"
            onChange={(event) => void importBackup(event)}
            style={{ display: "none" }}
          />
        </div>
      </div>

      <div className="card no-print">
        <h2 className="compact-heading">Danger zone</h2>
        <button className="danger-btn compact-btn" onClick={() => void clearLocalData()}>
          Delete all local data
        </button>
      </div>

      {status ? <div className="card muted">{status}</div> : null}
      {error ? <div className="card error-text">{error}</div> : null}
    </section>
  );
}
