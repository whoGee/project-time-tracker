import { useTracker } from "../context/useTracker";
import { downloadText, fullDataToJson } from "../lib/export";

export default function SettingsPage() {
  const { projects, sessions, activeSession, exportFullData } = useTracker();

  async function exportJson() {
    const { projects: allProjects, sessions: allSessions, meta } = await exportFullData();
    const json = fullDataToJson(allProjects, allSessions, meta);
    downloadText("tracker-full-export.json", json, "application/json");
  }

  return (
    <section>
      <h1>Settings</h1>
      <div className="card">
        <div className="settings-list">
          <div>
            <strong>Projects:</strong> {projects.length}
          </div>
          <div>
            <strong>Completed sessions:</strong> {sessions.length}
          </div>
          <div>
            <strong>Active session:</strong> {activeSession ? "Yes" : "No"}
          </div>
        </div>
      </div>
      <div className="card no-print">
        <button className="secondary-btn" onClick={() => void exportJson()}>
          Export full JSON backup
        </button>
      </div>
    </section>
  );
}
