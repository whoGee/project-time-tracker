import { type FormEvent, useMemo, useState } from "react";
import { useTracker } from "../context/useTracker";
import { formatHhMmSs, todayDateKey } from "../lib/time";

export default function TrackerPage() {
  const {
    ready,
    projects,
    sessions,
    activeProject,
    activeElapsedSec,
    addProject,
    removeProject,
    switchProject,
    stopTracking,
  } = useTracker();
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectId, setNewProjectId] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [error, setError] = useState("");

  const todaySessions = useMemo(
    () => sessions.filter((session) => session.dateKey === todayDateKey()),
    [sessions]
  );

  async function handleAddProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const id = newProjectId.trim();
    const name = newProjectName.trim();

    if (!id || !name) {
      setError("Project id and name are required.");
      return;
    }
    if (projects.some((project) => project.id === id)) {
      setError("Project id already exists.");
      return;
    }

    setError("");
    await addProject(id, name);
    setNewProjectId("");
    setNewProjectName("");
    setShowAddProject(false);
  }

  async function handleRemoveProject(projectId: string) {
    const ok = window.confirm(`Remove project "${projectId}"?`);
    if (!ok) {
      return;
    }
    await removeProject(projectId);
  }

  return (
    <section>
      <h1>Tracker</h1>

      <div className={`card tracking-banner ${activeProject ? "active" : "inactive"}`}>
        {activeProject ? (
          <>
            <div className="tracking-project">
              {activeProject.id} - {activeProject.name}
            </div>
            <div className="timer">{formatHhMmSs(activeElapsedSec)}</div>
            <button className="secondary-btn compact-btn no-print" onClick={() => void stopTracking()}>
              Stop
            </button>
          </>
        ) : (
          <div className="muted">No active project.</div>
        )}
      </div>

      <div className="card no-print">
        <div className="section-title-row">
          <h2 className="compact-heading">Projects</h2>
          <button
            className="round-plus-btn"
            aria-label="Add project"
            onClick={() => {
              setError("");
              setShowAddProject((prev) => !prev);
            }}
          >
            +
          </button>
        </div>

        {showAddProject ? (
          <form className="form-grid" onSubmit={(event) => void handleAddProject(event)}>
            <div>
              <label htmlFor="project-id">Project id</label>
              <input
                id="project-id"
                value={newProjectId}
                onChange={(event) => setNewProjectId(event.target.value)}
                placeholder="e.g. PRJ-101"
              />
            </div>
            <div>
              <label htmlFor="project-name">Project name</label>
              <input
                id="project-name"
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                placeholder="e.g. Customer redesign"
              />
            </div>
            {error ? <div className="error-text">{error}</div> : null}
            <div className="inline-fields">
              <button className="primary-btn compact-btn" type="submit">
                Add
              </button>
              <button
                className="secondary-btn compact-btn"
                type="button"
                onClick={() => {
                  setShowAddProject(false);
                  setError("");
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </div>

      <div className="project-grid">
        {!ready ? (
          <div className="card muted">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="card empty">No projects yet. Use + to add your first project.</div>
        ) : (
          projects.map((project) => {
            const isActive = project.id === activeProject?.id;
            return (
              <div
                key={project.id}
                className={`project-tile ${isActive ? "active" : "inactive"}`}
                role="button"
                tabIndex={0}
                onClick={() => void switchProject(project.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    void switchProject(project.id);
                  }
                }}
              >
                <div className="tile-inline">
                  {project.id} - {project.name}
                </div>
                <div className="tile-actions">
                  <span className="tile-status">{isActive ? "Active" : "Switch to start"}</span>
                  <button
                    className="mini-btn"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleRemoveProject(project.id);
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="card muted">Today sessions: {todaySessions.length}</div>
    </section>
  );
}
