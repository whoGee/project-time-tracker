import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  clearAllData as clearAllDbData,
  deleteSession,
  deleteSessionsByDateKey,
  deleteProject,
  exportAllData,
  getMetaState,
  importAllData,
  listProjects,
  listSessions,
  putProject,
  putSession,
  setActiveSession as persistActiveSession,
} from "../lib/db";
import { TrackerContext, type TrackerContextValue } from "./trackerContextShared";
import { toDateKey } from "../lib/time";
import type { ActiveSession, MetaState, Project, Session } from "../types";

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
  const [tickTs, setTickTs] = useState(() => Date.now());

  const closeActiveIfAny = useCallback(
    async (existing: ActiveSession, endTs: number) => {
      const boundedEndTs = Math.max(endTs, existing.startTs);
      const durationSec = Math.floor((boundedEndTs - existing.startTs) / 1000);
      const session: Session = {
        id: existing.sessionId,
        projectId: existing.projectId,
        startTs: existing.startTs,
        endTs: boundedEndTs,
        durationSec,
        dateKey: toDateKey(existing.startTs),
      };

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
      id: normalizedId,
      name: normalizedName,
      createdAt: Date.now(),
    };

    await putProject(project);
    setProjects((prev) => [...prev, project].sort((a, b) => a.createdAt - b.createdAt));
  }, []);

  const removeProject = useCallback(
    async (projectId: string) => {
      if (activeSession?.projectId === projectId) {
        await closeActiveIfAny(activeSession, Date.now());
      }
      await deleteProject(projectId);
      setProjects((prev) => prev.filter((project) => project.id !== projectId));
    },
    [activeSession, closeActiveIfAny]
  );

  const switchProject = useCallback(
    async (projectId: string) => {
      const now = Date.now();
      if (activeSession?.projectId === projectId) {
        return;
      }

      if (activeSession) {
        await closeActiveIfAny(activeSession, now);
      }

      const nextActive: ActiveSession = {
        sessionId: uid(),
        projectId,
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

  const updateSessionProject = useCallback(
    async (sessionId: string, projectId: string) => {
      const existing = sessions.find((session) => session.id === sessionId);
      if (!existing) {
        return;
      }
      const updated: Session = { ...existing, projectId };
      await putSession(updated);
      setSessions((prev) => prev.map((session) => (session.id === sessionId ? updated : session)));
    },
    [sessions]
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
  }, []);

  const importFullData = useCallback(
    async (nextProjects: Project[], nextSessions: Session[], nextMeta: MetaState) => {
      await importAllData(nextProjects, nextSessions, nextMeta);
      setProjects([...nextProjects].sort((a, b) => a.createdAt - b.createdAt));
      setSessions([...nextSessions].sort((a, b) => b.startTs - a.startTs));
      setActiveSession(nextMeta.activeSession ?? null);
    },
    []
  );

  const activeElapsedSec = useMemo(() => {
    if (!activeSession) {
      return 0;
    }
    return Math.floor((tickTs - activeSession.startTs) / 1000);
  }, [activeSession, tickTs]);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeSession?.projectId) ?? null,
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
    switchProject,
    stopTracking,
    updateSessionProject,
    deleteSessionRecord,
    deleteSessionsForDate,
    exportFullData: exportAllData,
    clearAllData,
    importFullData,
  };

  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}
