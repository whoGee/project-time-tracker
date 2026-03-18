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
  const [deletePromptProjectKey, setDeletePromptProjectKey] = useState<string | null>(null);
  const [dragOrderProjectKeys, setDragOrderProjectKeys] = useState<string[]>([]);
  const [draggingProjectKey, setDraggingProjectKey] = useState<string | null>(null);

  const alphabeticalProjects = useMemo(
    () =>
      [...projects]
        .filter((project) => !project.hiddenFromTracker)
        .sort((a, b) => {
          const byId = a.id.localeCompare(b.id, undefined, { sensitivity: "base", numeric: true });
          if (byId !== 0) {
            return byId;
          }
          return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        }),
    [projects]
  );

  const alphabeticalKeys = useMemo(
    () => alphabeticalProjects.map((project) => project.key),
    [alphabeticalProjects]
  );

  const orderedProjectKeys = useMemo(() => {
    const stillExisting = dragOrderProjectKeys.filter((key) => alphabeticalKeys.includes(key));
    const added = alphabeticalKeys.filter((key) => !stillExisting.includes(key));
    return [...stillExisting, ...added];
  }, [alphabeticalKeys, dragOrderProjectKeys]);

  const orderedProjects = useMemo(
    () =>
      orderedProjectKeys
        .map((key) => alphabeticalProjects.find((project) => project.key === key))
        .filter((project): project is (typeof projects)[number] => Boolean(project)),
    [alphabeticalProjects, orderedProjectKeys]
  );

  async function handleAddProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const id = newProjectId.trim();
    const name = newProjectName.trim();

    if (!id || !name) {
      setError("Project id and name are required.");
      return;
    }
    if (projects.some((project) => project.id === id && project.name === name)) {
      setError("Project id and project name combination already exists.");
      return;
    }

    setError("");
    await addProject(id, name);
    setNewProjectId("");
    setNewProjectName("");
    setShowAddProject(false);
  }

  async function handleRemoveProject(projectKey: string) {
    const project = projects.find((entry) => entry.key === projectKey);
    if (!project) {
      return;
    }

    const hasSessions = sessions.some((session) => session.projectKey === projectKey);
    if (hasSessions) {
      setDeletePromptProjectKey(projectKey);
      return;
    }
    const ok = window.confirm(`Remove project "${project.id} - ${project.name}"?`);
    if (!ok) {
      return;
    }
    try {
      await removeProject(projectKey);
      setError("");
    } catch {
      setDeletePromptProjectKey(projectKey);
    }
  }

  async function handleDeleteTileOnly() {
    if (!deletePromptProjectKey) {
      return;
    }
    try {
      await hideProjectFromTracker(deletePromptProjectKey);
      setDeletePromptProjectKey(null);
      setError("");
    } catch {
      setError("Failed to delete project tile.");
    }
  }

  async function handleDeleteTileAndData() {
    if (!deletePromptProjectKey) {
      return;
    }
    const project = projects.find((entry) => entry.key === deletePromptProjectKey);
    if (!project) {
      return;
    }
    const ok = window.confirm(
      `Delete project "${project.id} - ${project.name}" and all saved sessions for this project?`
    );
    if (!ok) {
      return;
    }
    try {
      await deleteProjectWithSavedData(deletePromptProjectKey);
      setDeletePromptProjectKey(null);
      setError("");
    } catch {
      setError("Failed to delete project and saved data.");
    }
  }

  async function handleProjectTileTap(projectKey: string) {
    setError("");
    if (activeProject?.key === projectKey) {
      await stopTracking();
      return;
    }
    await switchProject(projectKey);
  }

  function moveProjectTile(fromKey: string, toKey: string) {
    if (fromKey === toKey) {
      return;
    }
    setDragOrderProjectKeys((prev) => {
      const next = prev.length === 0 ? [...orderedProjectKeys] : [...prev];
      const fromIndex = next.indexOf(fromKey);
      const toIndex = next.indexOf(toKey);
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
            const isActive = project.key === activeProject?.key;
            return (
              <div
                key={project.key}
                className={`project-tile ${isActive ? "active" : "inactive"} ${
                  draggingProjectKey === project.key ? "dragging" : ""
                }`}
                role="button"
                tabIndex={0}
                draggable
                onClick={() => void handleProjectTileTap(project.key)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    void handleProjectTileTap(project.key);
                  }
                }}
                onDragStart={() => setDraggingProjectKey(project.key)}
                onDragEnd={() => setDraggingProjectKey(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (!draggingProjectKey) {
                    return;
                  }
                  moveProjectTile(draggingProjectKey, project.key);
                  setDraggingProjectKey(null);
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
                      void handleRemoveProject(project.key);
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

      {deletePromptProjectKey ? (
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
                onClick={() => setDeletePromptProjectKey(null)}
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
