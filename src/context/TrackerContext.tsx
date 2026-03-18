import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearAllData as clearAllDbData,
  countSessionsByProjectKey,
  deleteSession,
  deleteSessionsByDateKey,
  deleteSessionsByProjectKey,
  deleteProject,
  exportAllData,
  getMetaState,
  importAllData,
  listProjects,
  listSessions,
  putProject,
  putSession,
  setActiveSession as persistActiveSession,
  setIncludeProjectKeyInExports as persistIncludeProjectKeyInExports,
} from "../lib/db";
import {
  createShortProjectKey,
  formatProjectLabel,
  normalizeProjectKeyData,
} from "../lib/projectIdentity";
import { toDateKey } from "../lib/time";
import { TrackerContext, type TrackerContextValue } from "./trackerContextShared";
import {
  buildClosedSessionFromActive,
  ProjectDeleteBlockedError,
} from "./sessionLifecycle";
import type {
  ActiveSession,
  MetaState,
  Project,
  Session,
  SessionUpdateInput,
} from "../types";

const HEARTBEAT_EVERY_MS = 15_000;

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function TrackerProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [includeProjectKeyInExports, setIncludeProjectKeyInExportsState] = useState(false);
  const [tickTs, setTickTs] = useState(() => Date.now());

  const closeActiveIfAny = useCallback(
    async (existing: ActiveSession, endTs: number) => {
      const session = buildClosedSessionFromActive(existing, endTs);

      await putSession(session);
      await persistActiveSession(null);
      setSessions((prev) => [session, ...prev]);
      setActiveSession(null);
    },
    []
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      const [projectList, sessionList, meta] = await Promise.all([
        listProjects(),
        listSessions(),
        getMetaState(),
      ]);

      if (!mounted) {
        return;
      }

      setProjects(projectList);
      setSessions(sessionList);
      setIncludeProjectKeyInExportsState(meta.includeProjectKeyInExports);

      if (meta.activeSession) {
        await closeActiveIfAny(meta.activeSession, meta.activeSession.heartbeatTs);
      }

      setReady(true);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [closeActiveIfAny]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTickTs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeSession) {
      return;
    }

    const timer = window.setInterval(() => {
      const heartbeatTs = Date.now();
      setActiveSession((prev) => {
        if (!prev) {
          return prev;
        }
        const next = { ...prev, heartbeatTs };
        void persistActiveSession(next);
        return next;
      });
    }, HEARTBEAT_EVERY_MS);

    return () => window.clearInterval(timer);
  }, [activeSession]);

  const addProject = useCallback(async (id: string, name: string) => {
    const normalizedId = id.trim();
    const normalizedName = name.trim();
    if (!normalizedId || !normalizedName) {
      return;
    }

    const project: Project = {
      key: createShortProjectKey(new Set(projects.map((project) => project.key))),
      id: normalizedId,
      name: normalizedName,
      createdAt: Date.now(),
    };

    await putProject(project);
    setProjects((prev) => [...prev, project].sort((a, b) => a.createdAt - b.createdAt));
  }, [projects]);

  const removeProject = useCallback(
    async (projectKey: string) => {
      const existing = projects.find((project) => project.key === projectKey);
      if (!existing) {
        return;
      }

      if (activeSession?.projectKey === projectKey) {
        await closeActiveIfAny(activeSession, Date.now());
      }
      const sessionCount = await countSessionsByProjectKey(projectKey);
      if (sessionCount > 0) {
        throw new ProjectDeleteBlockedError(formatProjectLabel(existing));
      }
      await deleteProject(projectKey);
      setProjects((prev) => prev.filter((project) => project.key !== projectKey));
    },
    [activeSession, closeActiveIfAny, projects]
  );

  const hideProjectFromTracker = useCallback(
    async (projectKey: string) => {
      if (activeSession?.projectKey === projectKey) {
        await closeActiveIfAny(activeSession, Date.now());
      }

      const existing = projects.find((project) => project.key === projectKey);
      if (!existing) {
        return;
      }

      const updated: Project = { ...existing, hiddenFromTracker: true };
      await putProject(updated);
      setProjects((prev) =>
        prev
          .map((project) => (project.key === projectKey ? updated : project))
          .sort((a, b) => a.createdAt - b.createdAt)
      );
    },
    [activeSession, closeActiveIfAny, projects]
  );

  const deleteProjectWithSavedData = useCallback(
    async (projectKey: string) => {
      if (activeSession?.projectKey === projectKey) {
        await closeActiveIfAny(activeSession, Date.now());
      }

      await deleteSessionsByProjectKey(projectKey);
      await deleteProject(projectKey);

      setSessions((prev) => prev.filter((session) => session.projectKey !== projectKey));
      setProjects((prev) => prev.filter((project) => project.key !== projectKey));
    },
    [activeSession, closeActiveIfAny]
  );

  const switchProject = useCallback(
    async (projectKey: string) => {
      const now = Date.now();
      if (activeSession?.projectKey === projectKey) {
        return;
      }

      if (activeSession) {
        await closeActiveIfAny(activeSession, now);
      }

      const nextActive: ActiveSession = {
        sessionId: uid(),
        projectKey,
        startTs: now,
        heartbeatTs: now,
      };

      await persistActiveSession(nextActive);
      setActiveSession(nextActive);
    },
    [activeSession, closeActiveIfAny]
  );

  const stopTracking = useCallback(async () => {
    if (!activeSession) {
      return;
    }
    await closeActiveIfAny(activeSession, Date.now());
  }, [activeSession, closeActiveIfAny]);

  const updateSessionRecord = useCallback(
    async (sessionId: string, updates: SessionUpdateInput) => {
      const existing = sessions.find((session) => session.id === sessionId);
      if (!existing) {
        return;
      }

      const nextProjectKey = updates.projectKey ?? existing.projectKey;
      if (!projects.some((project) => project.key === nextProjectKey)) {
        throw new Error("Session must reference an existing project.");
      }

      const nextStartTs = updates.startTs ?? existing.startTs;
      const nextEndTs = updates.endTs ?? existing.endTs;
      if (nextEndTs < nextStartTs) {
        throw new Error("End time must be on or after start time.");
      }

      const updated: Session = {
        ...existing,
        projectKey: nextProjectKey,
        startTs: nextStartTs,
        endTs: nextEndTs,
        durationSec: Math.floor((nextEndTs - nextStartTs) / 1000),
        dateKey: toDateKey(nextStartTs),
      };
      await putSession(updated);
      setSessions((prev) =>
        prev
          .map((session) => (session.id === sessionId ? updated : session))
          .sort((a, b) => b.startTs - a.startTs)
      );
    },
    [projects, sessions]
  );

  const deleteSessionRecord = useCallback(async (sessionId: string) => {
    await deleteSession(sessionId);
    setSessions((prev) => prev.filter((session) => session.id !== sessionId));
  }, []);

  const deleteSessionsForDate = useCallback(async (dateKey: string) => {
    await deleteSessionsByDateKey(dateKey);
    setSessions((prev) => prev.filter((session) => session.dateKey !== dateKey));
  }, []);

  const clearAllData = useCallback(async () => {
    await clearAllDbData();
    setProjects([]);
    setSessions([]);
    setActiveSession(null);
    setIncludeProjectKeyInExportsState(false);
  }, []);

  const importFullData = useCallback(
    async (nextProjects: Project[], nextSessions: Session[], nextMeta: MetaState) => {
      const normalized = normalizeProjectKeyData(nextProjects, nextSessions, nextMeta);
      await importAllData(normalized.projects, normalized.sessions, normalized.meta);
      setProjects([...normalized.projects].sort((a, b) => a.createdAt - b.createdAt));
      setSessions([...normalized.sessions].sort((a, b) => b.startTs - a.startTs));
      setActiveSession(normalized.meta.activeSession ?? null);
      setIncludeProjectKeyInExportsState(normalized.meta.includeProjectKeyInExports);
    },
    []
  );

  const setIncludeProjectKeyInExports = useCallback(async (enabled: boolean) => {
    await persistIncludeProjectKeyInExports(enabled);
    setIncludeProjectKeyInExportsState(enabled);
  }, []);

  const activeElapsedSec = useMemo(() => {
    if (!activeSession) {
      return 0;
    }
    return Math.floor((tickTs - activeSession.startTs) / 1000);
  }, [activeSession, tickTs]);

  const activeProject = useMemo(
    () => projects.find((project) => project.key === activeSession?.projectKey) ?? null,
    [projects, activeSession]
  );

  const value: TrackerContextValue = {
    ready,
    projects,
    sessions,
    activeSession,
    activeElapsedSec,
    activeProject,
    addProject,
    removeProject,
    hideProjectFromTracker,
    deleteProjectWithSavedData,
    switchProject,
    stopTracking,
    updateSessionRecord,
    deleteSessionRecord,
    deleteSessionsForDate,
    exportFullData: exportAllData,
    clearAllData,
    importFullData,
    includeProjectKeyInExports,
    setIncludeProjectKeyInExports,
  };

  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}
