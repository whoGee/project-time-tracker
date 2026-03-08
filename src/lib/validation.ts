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

function validateProject(raw: unknown, index: number): Project {
  if (!isRecord(raw)) {
    throw new Error(`Project ${index + 1} must be an object.`);
  }

  const id = asSafeString(raw.id);
  const name = asSafeString(raw.name);
  const createdAt = asSafeInt(raw.createdAt);

  if (!id) {
    throw new Error(`Project ${index + 1} is missing a valid id.`);
  }
  if (!name) {
    throw new Error(`Project ${id} is missing a valid name.`);
  }
  if (createdAt === null || createdAt < 0) {
    throw new Error(`Project ${id} has invalid createdAt.`);
  }

  return { id, name, createdAt };
}

function validateSession(raw: unknown, index: number, projectIds: Set<string>): Session {
  if (!isRecord(raw)) {
    throw new Error(`Session ${index + 1} must be an object.`);
  }

  const id = asSafeString(raw.id);
  const projectId = asSafeString(raw.projectId);
  const startTs = asSafeInt(raw.startTs);
  const endTs = asSafeInt(raw.endTs);
  const durationSec = asSafeInt(raw.durationSec);
  const dateKey = asSafeString(raw.dateKey);

  if (!id) {
    throw new Error(`Session ${index + 1} is missing a valid id.`);
  }
  if (!projectId) {
    throw new Error(`Session ${id} is missing a valid project id.`);
  }
  if (!projectIds.has(projectId)) {
    throw new Error(`Session ${id} references unknown project "${projectId}".`);
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

  return { id, projectId, startTs, endTs, durationSec, dateKey };
}

function validateActiveSession(raw: unknown, projectIds: Set<string>): ActiveSession | null {
  if (raw === null || typeof raw === "undefined") {
    return null;
  }
  if (!isRecord(raw)) {
    throw new Error("meta.activeSession must be an object or null.");
  }

  const sessionId = asSafeString(raw.sessionId);
  const projectId = asSafeString(raw.projectId);
  const startTs = asSafeInt(raw.startTs);
  const heartbeatTs = asSafeInt(raw.heartbeatTs);

  if (!sessionId || !projectId) {
    throw new Error("meta.activeSession is missing required fields.");
  }
  if (!projectIds.has(projectId)) {
    throw new Error(`meta.activeSession references unknown project "${projectId}".`);
  }
  if (startTs === null || heartbeatTs === null || startTs < 0 || heartbeatTs < startTs) {
    throw new Error("meta.activeSession has invalid timestamps.");
  }

  return { sessionId, projectId, startTs, heartbeatTs };
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
  const projectIds = new Set<string>();
  for (const project of projects) {
    if (projectIds.has(project.id)) {
      throw new Error(`Duplicate project id "${project.id}" in backup.`);
    }
    projectIds.add(project.id);
  }

  const sessions = rawSessions.map((session, index) =>
    validateSession(session, index, projectIds)
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
    activeSession: validateActiveSession(metaContainer.activeSession, projectIds),
  };

  return { projects, sessions, meta };
}
