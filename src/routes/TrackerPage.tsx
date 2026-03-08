import { type FormEvent, useMemo, useState } from "react";
import { useTracker } from "../context/useTracker";
import { formatHhMmSs } from "../lib/time";

export default function TrackerPage() {
  const {
    ready,
    projects,
    sessions,
    activeProject,
    activeElapsedSec,
    addProject,
    removeProject,
    hideProjectFromTracker,
    deleteProjectWithSavedData,
    switchProject,
    stopTracking,
  } = useTracker();
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectId, setNewProjectId] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [error, setError] = useState("");
  const [deletePromptProjectId, setDeletePromptProjectId] = useState<string | null>(null);
  const [dragOrderProjectIds, setDragOrderProjectIds] = useState<string[]>([]);
  const [draggingProjectId, setDraggingProjectId] = useState<string | null>(null);

  const alphabeticalProjects = useMemo(
    () =>
      [...projects]
        .filter((project) => !project.hiddenFromTracker)
        .sort((a, b) =>
        a.id.localeCompare(b.id, undefined, { sensitivity: "base", numeric: true })
      ),
    [projects]
  );

  const alphabeticalIds = useMemo(
    () => alphabeticalProjects.map((project) => project.id),
    [alphabeticalProjects]
  );

  const orderedProjectIds = useMemo(() => {
    const stillExisting = dragOrderProjectIds.filter((id) => alphabeticalIds.includes(id));
    const added = alphabeticalIds.filter((id) => !stillExisting.includes(id));
    return [...stillExisting, ...added];
  }, [alphabeticalIds, dragOrderProjectIds]);

  const orderedProjects = useMemo(
    () =>
      orderedProjectIds
        .map((id) => alphabeticalProjects.find((project) => project.id === id))
        .filter((project): project is (typeof projects)[number] => Boolean(project)),
    [alphabeticalProjects, orderedProjectIds]
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
    const hasSessions = sessions.some((session) => session.projectId === projectId);
    if (hasSessions) {
      setDeletePromptProjectId(projectId);
      return;
    }
    const ok = window.confirm(`Remove project "${projectId}"?`);
    if (!ok) {
      return;
    }
    try {
      await removeProject(projectId);
      setError("");
    } catch {
      setDeletePromptProjectId(projectId);
    }
  }

  async function handleDeleteTileOnly() {
    if (!deletePromptProjectId) {
      return;
    }
    try {
      await hideProjectFromTracker(deletePromptProjectId);
      setDeletePromptProjectId(null);
      setError("");
    } catch {
      setError("Failed to delete project tile.");
    }
  }

  async function handleDeleteTileAndData() {
    if (!deletePromptProjectId) {
      return;
    }
    const ok = window.confirm(
      `Delete project "${deletePromptProjectId}" and all saved sessions for this project?`
    );
    if (!ok) {
      return;
    }
    try {
      await deleteProjectWithSavedData(deletePromptProjectId);
      setDeletePromptProjectId(null);
      setError("");
    } catch {
      setError("Failed to delete project and saved data.");
    }
  }

  async function handleProjectTileTap(projectId: string) {
    setError("");
    if (activeProject?.id === projectId) {
      await stopTracking();
      return;
    }
    await switchProject(projectId);
  }

  function moveProjectTile(fromId: string, toId: string) {
    if (fromId === toId) {
      return;
    }
    setDragOrderProjectIds((prev) => {
      const next = prev.length === 0 ? [...orderedProjectIds] : [...prev];
      const fromIndex = next.indexOf(fromId);
      const toIndex = next.indexOf(toId);
      if (fromIndex < 0 || toIndex < 0) {
        return prev;
      }
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  return (
    <section className="tracker-layout">
      <div className="tracker-top">
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
      </div>

      <div className="card no-print tracker-middle">
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

      <div className="project-grid tracker-bottom">
        {!ready ? (
          <div className="card muted project-grid-placeholder">Loading projects...</div>
        ) : orderedProjects.length === 0 ? (
          <div className="card empty project-grid-placeholder">
            No projects yet. Use + to add your first project.
          </div>
        ) : (
          orderedProjects.map((project) => {
            const isActive = project.id === activeProject?.id;
            return (
              <div
                key={project.id}
                className={`project-tile ${isActive ? "active" : "inactive"} ${
                  draggingProjectId === project.id ? "dragging" : ""
                }`}
                role="button"
                tabIndex={0}
                draggable
                onClick={() => void handleProjectTileTap(project.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    void handleProjectTileTap(project.id);
                  }
                }}
                onDragStart={() => setDraggingProjectId(project.id)}
                onDragEnd={() => setDraggingProjectId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (!draggingProjectId) {
                    return;
                  }
                  moveProjectTile(draggingProjectId, project.id);
                  setDraggingProjectId(null);
                }}
              >
                <div className="tile-inline">
                  {project.id} - {project.name}
                </div>
                <div className="tile-actions">
                  <span className="tile-status">tap to start/stop</span>
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

      {deletePromptProjectId ? (
        <div className="modal-backdrop no-print" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-title">
              Time has already been reported on this project. Choose the following:
            </div>
            <div className="delete-choice-grid">
              <button className="delete-choice-box" type="button" onClick={() => void handleDeleteTileOnly()}>
                Delete project tile from list only
              </button>
              <button
                className="delete-choice-box danger-choice-box"
                type="button"
                onClick={() => void handleDeleteTileAndData()}
              >
                Delete project tile and saved data
              </button>
            </div>
            <div className="inline-fields">
              <button
                className="secondary-btn compact-btn"
                type="button"
                onClick={() => setDeletePromptProjectId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
