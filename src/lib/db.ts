import { openDB, type DBSchema } from "idb";
import type { ActiveSession, MetaState, Project, Session } from "../types";
import { validateBackupData } from "./validation";

const DB_NAME = "project-time-tracker-db";
const DB_VERSION = 1;

type MetaKey = "activeSession";

interface TrackerDbSchema extends DBSchema {
  projects: {
    key: string;
    value: Project;
  };
  sessions: {
    key: string;
    value: Session;
    indexes: {
      byDateKey: string;
      byProjectId: string;
      byStartTs: number;
    };
  };
  meta: {
    key: MetaKey;
    value: ActiveSession | null;
  };
}

const dbPromise = openDB<TrackerDbSchema>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("projects")) {
      db.createObjectStore("projects", { keyPath: "id" });
    }

    if (!db.objectStoreNames.contains("sessions")) {
      const sessions = db.createObjectStore("sessions", { keyPath: "id" });
      sessions.createIndex("byDateKey", "dateKey");
      sessions.createIndex("byProjectId", "projectId");
      sessions.createIndex("byStartTs", "startTs");
    }

    if (!db.objectStoreNames.contains("meta")) {
      db.createObjectStore("meta");
    }
  },
});

export async function listProjects(): Promise<Project[]> {
  const db = await dbPromise;
  const projects = await db.getAll("projects");
  return projects.sort((a, b) => a.createdAt - b.createdAt);
}

export async function putProject(project: Project): Promise<void> {
  const db = await dbPromise;
  await db.put("projects", project);
}

export async function deleteProject(projectId: string): Promise<void> {
  const db = await dbPromise;
  await db.delete("projects", projectId);
}

export async function countSessionsByProjectId(projectId: string): Promise<number> {
  const db = await dbPromise;
  return db.countFromIndex("sessions", "byProjectId", projectId);
}

export async function listSessions(): Promise<Session[]> {
  const db = await dbPromise;
  const sessions = await db.getAll("sessions");
  return sessions.sort((a, b) => b.startTs - a.startTs);
}

export async function listSessionsByDateKey(dateKey: string): Promise<Session[]> {
  const db = await dbPromise;
  return db.getAllFromIndex("sessions", "byDateKey", dateKey);
}

export async function listSessionsByRange(startTs: number, endTs: number): Promise<Session[]> {
  const db = await dbPromise;
  const range = IDBKeyRange.bound(startTs, endTs);
  return db.getAllFromIndex("sessions", "byStartTs", range);
}

export async function putSession(session: Session): Promise<void> {
  const db = await dbPromise;
  await db.put("sessions", session);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const db = await dbPromise;
  await db.delete("sessions", sessionId);
}

export async function deleteSessionsByDateKey(dateKey: string): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction("sessions", "readwrite");
  const index = tx.store.index("byDateKey");
  let cursor = await index.openCursor(IDBKeyRange.only(dateKey));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function deleteSessionsByProjectId(projectId: string): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction("sessions", "readwrite");
  const index = tx.store.index("byProjectId");
  let cursor = await index.openCursor(IDBKeyRange.only(projectId));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function getMetaState(): Promise<MetaState> {
  const db = await dbPromise;
  const activeSession = await db.get("meta", "activeSession");
  return {
    activeSession: activeSession ?? null,
  };
}

export async function setActiveSession(activeSession: ActiveSession | null): Promise<void> {
  const db = await dbPromise;
  await db.put("meta", activeSession, "activeSession");
}

export async function exportAllData(): Promise<{
  projects: Project[];
  sessions: Session[];
  meta: MetaState;
}> {
  const [projects, sessions, meta] = await Promise.all([
    listProjects(),
    listSessions(),
    getMetaState(),
  ]);

  return { projects, sessions, meta };
}

export async function clearAllData(): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction(["projects", "sessions", "meta"], "readwrite");
  await Promise.all([
    tx.objectStore("projects").clear(),
    tx.objectStore("sessions").clear(),
    tx.objectStore("meta").clear(),
  ]);
  await tx.done;
}

export async function importAllData(
  projects: Project[],
  sessions: Session[],
  meta: MetaState
): Promise<void> {
  const validated = validateBackupData({ projects, sessions, meta });
  const db = await dbPromise;
  const tx = db.transaction(["projects", "sessions", "meta"], "readwrite");

  await Promise.all([
    tx.objectStore("projects").clear(),
    tx.objectStore("sessions").clear(),
    tx.objectStore("meta").clear(),
  ]);

  for (const project of validated.projects) {
    await tx.objectStore("projects").put(project);
  }

  for (const session of validated.sessions) {
    await tx.objectStore("sessions").put(session);
  }

  await tx.objectStore("meta").put(validated.meta.activeSession ?? null, "activeSession");
  await tx.done;
}
