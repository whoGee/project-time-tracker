import { type DragEvent, type FormEvent, useEffect, useMemo, useState } from "react";
import { useTracker } from "../context/useTracker";
import { formatHhMmSs } from "../lib/time";

type ProjectColumnId = "left" | "right";

type ProjectColumns = Record<ProjectColumnId, string[]>;

type DropIndicator = {
  columnId: ProjectColumnId;
  projectKey: string | null;
  position: "before" | "after" | "end";
};

const PROJECT_COLUMN_IDS: ProjectColumnId[] = ["left", "right"];
const PROJECT_COLUMNS_STORAGE_KEY = "tracker-project-columns";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function loadStoredProjectColumns(): ProjectColumns {
  if (typeof window === "undefined") {
    return { left: [], right: [] };
  }

  try {
    const rawValue = window.localStorage.getItem(PROJECT_COLUMNS_STORAGE_KEY);
    if (!rawValue) {
      return { left: [], right: [] };
    }

    const parsed = JSON.parse(rawValue) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("left" in parsed) ||
      !("right" in parsed) ||
      !isStringArray(parsed.left) ||
      !isStringArray(parsed.right)
    ) {
      return { left: [], right: [] };
    }

    return {
      left: parsed.left,
      right: parsed.right,
    };
  } catch {
    return { left: [], right: [] };
  }
}

function projectColumnsEqual(a: ProjectColumns, b: ProjectColumns): boolean {
  return (
    a.left.length === b.left.length &&
    a.right.length === b.right.length &&
    a.left.every((key, index) => key === b.left[index]) &&
    a.right.every((key, index) => key === b.right[index])
  );
}

function syncProjectColumns(columns: ProjectColumns, keys: string[]): ProjectColumns {
  const existingKeys = new Set(keys);
  const left = columns.left.filter((key) => existingKeys.has(key));
  const assigned = new Set(left);
  const right = columns.right.filter((key) => existingKeys.has(key) && !assigned.has(key));

  for (const key of right) {
    assigned.add(key);
  }

  const missing = keys.filter((key) => !assigned.has(key));
  for (const key of missing) {
    if (left.length <= right.length) {
      left.push(key);
      continue;
    }
    right.push(key);
  }

  return { left, right };
}

function findProjectColumnId(columns: ProjectColumns, projectKey: string): ProjectColumnId | null {
  if (columns.left.includes(projectKey)) {
    return "left";
  }
  if (columns.right.includes(projectKey)) {
    return "right";
  }
  return null;
}

function applyProjectDrop(
  columns: ProjectColumns,
  fromKey: string,
  dropIndicator: DropIndicator
): ProjectColumns | null {
  const fromColumnId = findProjectColumnId(columns, fromKey);
  if (!fromColumnId || dropIndicator.projectKey === fromKey) {
    return null;
  }

  const next: ProjectColumns = {
    left: [...columns.left],
    right: [...columns.right],
  };

  next[fromColumnId] = next[fromColumnId].filter((key) => key !== fromKey);

  const targetColumn = next[dropIndicator.columnId];
  let insertionIndex = targetColumn.length;

  if (dropIndicator.projectKey) {
    const targetIndex = targetColumn.indexOf(dropIndicator.projectKey);
    if (targetIndex < 0) {
      return null;
    }
    insertionIndex = dropIndicator.position === "before" ? targetIndex : targetIndex + 1;
  }

  targetColumn.splice(insertionIndex, 0, fromKey);

  if (projectColumnsEqual(columns, next)) {
    return null;
  }

  return next;
}

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
  const [projectColumns, setProjectColumns] = useState<ProjectColumns>(() => loadStoredProjectColumns());
  const [draggingProjectKey, setDraggingProjectKey] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null);
  const [dropFlashProjectKey, setDropFlashProjectKey] = useState<string | null>(null);

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

  useEffect(() => {
    if (!dropFlashProjectKey) {
      return;
    }

    const timer = window.setTimeout(() => {
      setDropFlashProjectKey(null);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [dropFlashProjectKey]);

  const projectByKey = useMemo(
    () => new Map(alphabeticalProjects.map((project) => [project.key, project])),
    [alphabeticalProjects]
  );

  const effectiveProjectColumns = useMemo(
    () => syncProjectColumns(projectColumns, alphabeticalKeys),
    [alphabeticalKeys, projectColumns]
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(PROJECT_COLUMNS_STORAGE_KEY, JSON.stringify(effectiveProjectColumns));
  }, [effectiveProjectColumns]);

  const projectsByColumn = useMemo(
    () =>
      PROJECT_COLUMN_IDS.reduce<Record<ProjectColumnId, typeof alphabeticalProjects>>(
        (columns, columnId) => {
          columns[columnId] = effectiveProjectColumns[columnId]
            .map((key) => projectByKey.get(key))
            .filter((project): project is (typeof projects)[number] => Boolean(project));
          return columns;
        },
        { left: [], right: [] }
      ),
    [effectiveProjectColumns, projectByKey]
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

  function setNextDropIndicator(nextIndicator: DropIndicator) {
    setDropIndicator((prev) => {
      if (
        prev?.columnId === nextIndicator.columnId &&
        prev.projectKey === nextIndicator.projectKey &&
        prev.position === nextIndicator.position
      ) {
        return prev;
      }
      return nextIndicator;
    });
  }

  function getTileDropIndicator(
    event: DragEvent<HTMLDivElement>,
    columnId: ProjectColumnId,
    projectKey: string
  ): DropIndicator {
    const { top, height } = event.currentTarget.getBoundingClientRect();
    const isBefore = event.clientY < top + height / 2;

    return {
      columnId,
      projectKey,
      position: isBefore ? "before" : "after",
    };
  }

  function handleTileDragOver(
    event: DragEvent<HTMLDivElement>,
    columnId: ProjectColumnId,
    projectKey: string
  ) {
    if (!draggingProjectKey) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setNextDropIndicator(getTileDropIndicator(event, columnId, projectKey));
  }

  function handleProjectDrop(nextIndicator: DropIndicator) {
    if (!draggingProjectKey) {
      return;
    }

    const nextColumns = applyProjectDrop(effectiveProjectColumns, draggingProjectKey, nextIndicator);
    setDraggingProjectKey(null);
    setDropIndicator(null);

    if (!nextColumns) {
      return;
    }

    setProjectColumns(nextColumns);
    setDropFlashProjectKey(draggingProjectKey);
  }

  function handleEndIndicatorDragOver(event: DragEvent<HTMLDivElement>, columnId: ProjectColumnId) {
    if (!draggingProjectKey) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setNextDropIndicator({
      columnId,
      projectKey: null,
      position: "end",
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
        ) : alphabeticalProjects.length === 0 ? (
          <div className="card empty project-grid-placeholder">
            No projects yet. Use + to add your first project.
          </div>
        ) : (
          PROJECT_COLUMN_IDS.map((columnId) => {
            const isEndTarget =
              dropIndicator?.columnId === columnId && dropIndicator.projectKey === null;

            return (
              <div
                key={columnId}
                className={`project-column ${
                  projectsByColumn[columnId].length === 0 ? "empty-column" : ""
                } ${draggingProjectKey ? "drag-session" : ""} ${isEndTarget ? "drop-end-active" : ""}`}
              >
                {projectsByColumn[columnId].map((project) => {
                  const isActive = project.key === activeProject?.key;
                  const tileDropState =
                    dropIndicator?.columnId === columnId && dropIndicator.projectKey === project.key
                      ? dropIndicator.position
                      : null;

                  return (
                    <div
                      key={project.key}
                      className={`project-tile ${isActive ? "active" : "inactive"} ${
                        draggingProjectKey === project.key ? "dragging" : ""
                      } ${dropFlashProjectKey === project.key ? "drop-flash" : ""} ${
                        tileDropState ? "drop-target" : ""
                      } ${tileDropState === "before" ? "drop-before" : ""} ${
                        tileDropState === "after" ? "drop-after" : ""
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
                      onDragStart={(event) => {
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", project.key);
                        setDraggingProjectKey(project.key);
                        setDropFlashProjectKey(null);
                      }}
                      onDragEnd={() => {
                        setDraggingProjectKey(null);
                        setDropIndicator(null);
                      }}
                      onDragEnter={(event) => handleTileDragOver(event, columnId, project.key)}
                      onDragOver={(event) => handleTileDragOver(event, columnId, project.key)}
                      onDrop={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleProjectDrop(getTileDropIndicator(event, columnId, project.key));
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
                })}
                <div
                  className="project-column-end-indicator"
                  aria-hidden="true"
                  onDragEnter={(event) => handleEndIndicatorDragOver(event, columnId)}
                  onDragOver={(event) => handleEndIndicatorDragOver(event, columnId)}
                  onDrop={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    handleProjectDrop({
                      columnId,
                      projectKey: null,
                      position: "end",
                    });
                  }}
                >
                  Drop tile here
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
