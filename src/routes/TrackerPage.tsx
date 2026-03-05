import { useMemo, useState, type FormEvent } from "react";
import { useTracker } from "../context/useTracker";
import { formatHhMmSs } from "../lib/time";

export default function TrackerPage() {
  const {
    ready,
    projects,
    activeSession,
    activeProject,
    activeElapsedSec,
    addProject,
    removeProject,
    switchProject,
    stopTracking,
  } = useTracker();
  const [projectIdInput, setProjectIdInput] = useState("");
  const [projectNameInput, setProjectNameInput] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  const duplicateProjectId = useMemo(
    () => projects.some((project) => project.id === projectIdInput.trim()),
    [projects, projectIdInput]
  );

  async function handleAddProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (duplicateProjectId) {
      return;
    }
    await addProject(projectIdInput, projectNameInput);
    setProjectIdInput("");
    setProjectNameInput("");
    setShowAddModal(false);
  }

  if (!ready) {
    return <div>Loading tracker...</div>;
  }

  return (
    <section>
      <div className="section-title-row">
        <h1>Tracker</h1>
        <button
          className="round-plus-btn no-print"
          aria-label="Add new project"
          onClick={() => setShowAddModal(true)}
        >
          +
        </button>
      </div>

      <div className={`card tracking-banner ${activeSession ? "active" : "inactive"}`}>
        <div>
          <div className="muted">Currently tracking</div>
          <div className="tracking-project">{activeProject ? activeProject.name : "Nothing active"}</div>
        </div>
        <div className="timer">{formatHhMmSs(activeElapsedSec)}</div>
        <button className="secondary-btn" onClick={() => void stopTracking()} disabled={!activeSession}>
          Stop
        </button>
      </div>

      <h2>Projects</h2>
      {projects.length === 0 ? <div className="empty">No projects yet. Press + to add one.</div> : null}
      <div className="project-grid">
        {projects.map((project) => {
          const isActive = activeSession?.projectId === project.id;
          return (
            <div
              key={project.id}
              className={`project-tile ${isActive ? "active" : "inactive"}`}
              role="button"
              tabIndex={0}
              onClick={() => void switchProject(project.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void switchProject(project.id);
                }
              }}
            >
              <div className="tile-inline">
                <strong>{project.id}</strong>
                <span>{project.name}</span>
              </div>
              <div className="tile-actions">
                <span className="tile-status">{isActive ? "Active" : "Inactive"}</span>
                <button
                  className="mini-btn danger-link"
                  onClick={(e) => {
                    e.stopPropagation();
                    void removeProject(project.id);
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {showAddModal ? (
        <div className="modal-backdrop no-print" onClick={() => setShowAddModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Add Project</div>
            <form className="form-grid" onSubmit={handleAddProject}>
              <div>
                <label htmlFor="project-id">Project ID</label>
                <input
                  id="project-id"
                  value={projectIdInput}
                  onChange={(e) => setProjectIdInput(e.target.value)}
                  placeholder="e.g. 1024"
                  required
                />
              </div>
              <div>
                <label htmlFor="project-name">Project name</label>
                <input
                  id="project-name"
                  value={projectNameInput}
                  onChange={(e) => setProjectNameInput(e.target.value)}
                  placeholder="e.g. New Website"
                  required
                />
              </div>
              <button className="primary-btn" type="submit" disabled={duplicateProjectId}>
                Add project
              </button>
              <button className="secondary-btn" type="button" onClick={() => setShowAddModal(false)}>
                Cancel
              </button>
              {duplicateProjectId ? <div className="error-text">Project ID already exists.</div> : null}
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
