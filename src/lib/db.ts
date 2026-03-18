import { openDB, type DBSchema, type IDBPDatabase, type IDBPTransaction } from "idb";
import type { ActiveSession, MetaState, Project, Session } from "../types";
import { normalizeProjectKeyData } from "./projectIdentity";
import { validateBackupData } from "./validation";

const DB_NAME = "project-time-tracker-db";
const DB_VERSION = 3;

type MetaKey = "activeSession" | "includeProjectKeyInExports";

type MetaValue = ActiveSession | boolean | null;

type LegacyProject = Omit<Project, "key">;
type LegacySession = Omit<Session, "projectKey"> & { projectId: string };
type LegacyActiveSession = Omit<ActiveSession, "projectKey"> & { projectId: string };

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
      byProjectKey: string;
      byStartTs: number;
    };
  };
  meta: {
    key: MetaKey;
    value: MetaValue;
  };
}

function createProjectsStore(db: IDBPDatabase<TrackerDbSchema>) {
  if (!db.objectStoreNames.contains("projects")) {
    db.createObjectStore("projects", { keyPath: "key" });
  }
}

function createSessionsStore(db: IDBPDatabase<TrackerDbSchema>) {
  if (!db.objectStoreNames.contains("sessions")) {
    const sessions = db.createObjectStore("sessions", { keyPath: "id" });
    sessions.createIndex("byDateKey", "dateKey");
    sessions.createIndex("byProjectKey", "projectKey");
    sessions.createIndex("byStartTs", "startTs");
  }
}

function createMetaStore(db: IDBPDatabase<TrackerDbSchema>) {
  if (!db.objectStoreNames.contains("meta")) {
    db.createObjectStore("meta");
  }
}

async function migrateLegacyData(
  db: IDBPDatabase<TrackerDbSchema>,
  transaction: IDBPTransaction<TrackerDbSchema, ("projects" | "sessions" | "meta")[], "versionchange">
) {
  const legacyProjectStore = transaction.objectStore("projects");
  const legacySessionStore = transaction.objectStore("sessions");
  const legacyMetaStore = transaction.objectStore("meta");

  const [legacyProjects, legacySessions, legacyActiveSession, includeProjectKeyInExports] =
    await Promise.all([
      legacyProjectStore.getAll() as unknown as Promise<LegacyProject[]>,
      legacySessionStore.getAll() as unknown as Promise<LegacySession[]>,
      legacyMetaStore.get("activeSession") as unknown as Promise<LegacyActiveSession | null | undefined>,
      legacyMetaStore.get("includeProjectKeyInExports") as unknown as Promise<boolean | undefined>,
    ]);

  db.deleteObjectStore("projects");
  db.deleteObjectStore("sessions");

  createProjectsStore(db);
  createSessionsStore(db);

  const projectStore = transaction.objectStore("projects");
  const sessionStore = transaction.objectStore("sessions");

  const migrated = normalizeProjectKeyData(
    legacyProjects.map((legacyProject) => ({
      key: legacyProject.id,
      id: legacyProject.id,
      name: legacyProject.name,
      createdAt: legacyProject.createdAt,
      hiddenFromTracker: legacyProject.hiddenFromTracker,
    })),
    legacySessions.map((legacySession) => ({
      id: legacySession.id,
      projectKey: legacySession.projectId,
      startTs: legacySession.startTs,
      endTs: legacySession.endTs,
      durationSec: legacySession.durationSec,
      dateKey: legacySession.dateKey,
    })),
    {
      activeSession: legacyActiveSession
        ? {
            sessionId: legacyActiveSession.sessionId,
            projectKey: legacyActiveSession.projectId,
            startTs: legacyActiveSession.startTs,
            heartbeatTs: legacyActiveSession.heartbeatTs,
          }
        : null,
      includeProjectKeyInExports: includeProjectKeyInExports ?? false,
    }
  );

  for (const project of migrated.projects) {
    await projectStore.put(project);
  }

  for (const session of migrated.sessions) {
    await sessionStore.put(session);
  }

  await legacyMetaStore.put(migrated.meta.activeSession, "activeSession");
  await legacyMetaStore.put(migrated.meta.includeProjectKeyInExports, "includeProjectKeyInExports");
}

async function migrateExistingKeysToShortFormat(
  transaction: IDBPTransaction<TrackerDbSchema, ("projects" | "sessions" | "meta")[], "versionchange">
) {
  const projectStore = transaction.objectStore("projects");
  const sessionStore = transaction.objectStore("sessions");
  const metaStore = transaction.objectStore("meta");

  const [projects, sessions, activeSession, includeProjectKeyInExports] = await Promise.all([
    projectStore.getAll(),
    sessionStore.getAll(),
    metaStore.get("activeSession") as Promise<ActiveSession | null | undefined>,
    metaStore.get("includeProjectKeyInExports") as Promise<boolean | undefined>,
  ]);

  const normalized = normalizeProjectKeyData(projects, sessions, {
    activeSession: activeSession ?? null,
    includeProjectKeyInExports: includeProjectKeyInExports ?? false,
  });

  await Promise.all([projectStore.clear(), sessionStore.clear()]);

  for (const project of normalized.projects) {
    await projectStore.put(project);
  }

  for (const session of normalized.sessions) {
    await sessionStore.put(session);
  }

  await metaStore.put(normalized.meta.activeSession, "activeSession");
  await metaStore.put(normalized.meta.includeProjectKeyInExports, "includeProjectKeyInExports");
}

const dbPromise = openDB<TrackerDbSchema>(DB_NAME, DB_VERSION, {
  async upgrade(db, oldVersion, _newVersion, transaction) {
    if (oldVersion === 0) {
      createProjectsStore(db);
      createSessionsStore(db);
      createMetaStore(db);
      return;
    }

    if (oldVersion < 2) {
      createMetaStore(db);
      await migrateLegacyData(
        db,
        transaction as IDBPTransaction<
          TrackerDbSchema,
          ("projects" | "sessions" | "meta")[],
          "versionchange"
        >
      );
      return;
    }

    if (oldVersion < 3) {
      await migrateExistingKeysToShortFormat(
        transaction as IDBPTransaction<
          TrackerDbSchema,
          ("projects" | "sessions" | "meta")[],
          "versionchange"
        >
      );
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

export async function deleteProject(projectKey: string): Promise<void> {
  const db = await dbPromise;
  await db.delete("projects", projectKey);
}

export async function countSessionsByProjectKey(projectKey: string): Promise<number> {
  const db = await dbPromise;
  return db.countFromIndex("sessions", "byProjectKey", projectKey);
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

export async function deleteSessionsByProjectKey(projectKey: string): Promise<void> {
  const db = await dbPromise;
  const tx = db.transaction("sessions", "readwrite");
  const index = tx.store.index("byProjectKey");
  let cursor = await index.openCursor(IDBKeyRange.only(projectKey));
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }
  await tx.done;
}

export async function getMetaState(): Promise<MetaState> {
  const db = await dbPromise;
  const [activeSession, includeProjectKeyInExports] = await Promise.all([
    db.get("meta", "activeSession") as Promise<ActiveSession | null | undefined>,
    db.get("meta", "includeProjectKeyInExports") as Promise<boolean | undefined>,
  ]);
  return {
    activeSession: activeSession ?? null,
    includeProjectKeyInExports: includeProjectKeyInExports ?? false,
  };
}

export async function setActiveSession(activeSession: ActiveSession | null): Promise<void> {
  const db = await dbPromise;
  await db.put("meta", activeSession, "activeSession");
}

export async function setIncludeProjectKeyInExports(enabled: boolean): Promise<void> {
  const db = await dbPromise;
  await db.put("meta", enabled, "includeProjectKeyInExports");
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
  const normalized = normalizeProjectKeyData(
    validated.projects,
    validated.sessions,
    validated.meta
  );
  const db = await dbPromise;
  const tx = db.transaction(["projects", "sessions", "meta"], "readwrite");

  await Promise.all([
    tx.objectStore("projects").clear(),
    tx.objectStore("sessions").clear(),
    tx.objectStore("meta").clear(),
  ]);

  for (const project of normalized.projects) {
    await tx.objectStore("projects").put(project);
  }

  for (const session of normalized.sessions) {
    await tx.objectStore("sessions").put(session);
  }

  await tx.objectStore("meta").put(normalized.meta.activeSession ?? null, "activeSession");
  await tx
    .objectStore("meta")
    .put(normalized.meta.includeProjectKeyInExports, "includeProjectKeyInExports");
  await tx.done;
}
