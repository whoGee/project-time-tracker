import type { ActiveSession, BackupData, MetaState, Project, Session } from "../types";
import { toDateKey } from "./time";

export const MAX_BACKUP_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_PROJECT_COUNT = 1_000;
export const MAX_SESSION_COUNT = 200_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asSafeString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asSafeInt(value: unknown): number | null {
  return Number.isInteger(value) && Number.isFinite(value) ? (value as number) : null;
}

function asSafeBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function duplicateProjectPairKey(projectId: string, projectName: string): string {
  return `${projectId}\u0000${projectName}`;
}

function validateProject(raw: unknown, index: number): Project {
  if (!isRecord(raw)) {
    throw new Error(`Project ${index + 1} must be an object.`);
  }

  const key = asSafeString(raw.key) ?? asSafeString(raw.id);
  const id = asSafeString(raw.id);
  const name = asSafeString(raw.name);
  const createdAt = asSafeInt(raw.createdAt);
  const hiddenFromTracker = asSafeBoolean(raw.hiddenFromTracker) ?? undefined;

  if (!key) {
    throw new Error(`Project ${index + 1} is missing a valid key.`);
  }
  if (!id) {
    throw new Error(`Project ${index + 1} is missing a valid id.`);
  }
  if (!name) {
    throw new Error(`Project ${id} is missing a valid name.`);
  }
  if (createdAt === null || createdAt < 0) {
    throw new Error(`Project ${id} has invalid createdAt.`);
  }

  return { key, id, name, createdAt, hiddenFromTracker };
}

function validateSession(raw: unknown, index: number, projectKeys: Set<string>): Session {
  if (!isRecord(raw)) {
    throw new Error(`Session ${index + 1} must be an object.`);
  }

  const id = asSafeString(raw.id);
  const projectKey = asSafeString(raw.projectKey) ?? asSafeString(raw.projectId);
  const startTs = asSafeInt(raw.startTs);
  const endTs = asSafeInt(raw.endTs);
  const durationSec = asSafeInt(raw.durationSec);
  const dateKey = asSafeString(raw.dateKey);

  if (!id) {
    throw new Error(`Session ${index + 1} is missing a valid id.`);
  }
  if (!projectKey) {
    throw new Error(`Session ${id} is missing a valid project key.`);
  }
  if (!projectKeys.has(projectKey)) {
    throw new Error(`Session ${id} references unknown project "${projectKey}".`);
  }
  if (startTs === null || endTs === null || startTs < 0 || endTs < 0 || endTs < startTs) {
    throw new Error(`Session ${id} has invalid timestamps.`);
  }
  if (durationSec === null || durationSec < 0) {
    throw new Error(`Session ${id} has invalid duration.`);
  }
  if (!dateKey) {
    throw new Error(`Session ${id} is missing dateKey.`);
  }

  const computedDuration = Math.floor((endTs - startTs) / 1000);
  if (computedDuration !== durationSec) {
    throw new Error(`Session ${id} duration does not match timestamps.`);
  }
  const computedDateKey = toDateKey(startTs);
  if (computedDateKey !== dateKey) {
    throw new Error(`Session ${id} dateKey does not match start timestamp.`);
  }

  return { id, projectKey, startTs, endTs, durationSec, dateKey };
}

function validateActiveSession(raw: unknown, projectKeys: Set<string>): ActiveSession | null {
  if (raw === null || typeof raw === "undefined") {
    return null;
  }
  if (!isRecord(raw)) {
    throw new Error("meta.activeSession must be an object or null.");
  }

  const sessionId = asSafeString(raw.sessionId);
  const projectKey = asSafeString(raw.projectKey) ?? asSafeString(raw.projectId);
  const startTs = asSafeInt(raw.startTs);
  const heartbeatTs = asSafeInt(raw.heartbeatTs);

  if (!sessionId || !projectKey) {
    throw new Error("meta.activeSession is missing required fields.");
  }
  if (!projectKeys.has(projectKey)) {
    throw new Error(`meta.activeSession references unknown project "${projectKey}".`);
  }
  if (startTs === null || heartbeatTs === null || startTs < 0 || heartbeatTs < startTs) {
    throw new Error("meta.activeSession has invalid timestamps.");
  }

  return { sessionId, projectKey, startTs, heartbeatTs };
}

export function validateBackupData(input: unknown): BackupData {
  if (!isRecord(input)) {
    throw new Error("Backup root must be an object.");
  }

  const rawProjects = input.projects;
  const rawSessions = input.sessions;
  const rawMeta = input.meta;

  if (!Array.isArray(rawProjects)) {
    throw new Error("Backup is missing projects array.");
  }
  if (!Array.isArray(rawSessions)) {
    throw new Error("Backup is missing sessions array.");
  }
  if (rawProjects.length > MAX_PROJECT_COUNT) {
    throw new Error(`Backup has too many projects (max ${MAX_PROJECT_COUNT}).`);
  }
  if (rawSessions.length > MAX_SESSION_COUNT) {
    throw new Error(`Backup has too many sessions (max ${MAX_SESSION_COUNT}).`);
  }

  const projects = rawProjects.map((project, index) => validateProject(project, index));
  const projectKeys = new Set<string>();
  const seenProjectPairs = new Set<string>();
  for (const project of projects) {
    if (projectKeys.has(project.key)) {
      throw new Error(`Duplicate project key "${project.key}" in backup.`);
    }
    const pairKey = duplicateProjectPairKey(project.id, project.name);
    if (seenProjectPairs.has(pairKey)) {
      throw new Error(`Duplicate project combination "${project.id} - ${project.name}" in backup.`);
    }
    projectKeys.add(project.key);
    seenProjectPairs.add(pairKey);
  }

  const sessions = rawSessions.map((session, index) =>
    validateSession(session, index, projectKeys)
  );

  const seenSessionIds = new Set<string>();
  for (const session of sessions) {
    if (seenSessionIds.has(session.id)) {
      throw new Error(`Duplicate session id "${session.id}" in backup.`);
    }
    seenSessionIds.add(session.id);
  }

  const metaContainer = isRecord(rawMeta) ? rawMeta : {};
  const meta: MetaState = {
    activeSession: validateActiveSession(metaContainer.activeSession, projectKeys),
    includeProjectKeyInExports: asSafeBoolean(metaContainer.includeProjectKeyInExports) ?? false,
  };

  return { projects, sessions, meta };
}
