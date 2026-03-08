import { toDateKey } from "../lib/time";
import type { ActiveSession, Session } from "../types";

export class ProjectDeleteBlockedError extends Error {
  constructor(projectId: string) {
    super(`Project "${projectId}" has logged sessions. Reassign or delete sessions first.`);
    this.name = "ProjectDeleteBlockedError";
  }
}

export function buildClosedSessionFromActive(existing: ActiveSession, endTs: number): Session {
  const boundedEndTs = Math.max(endTs, existing.startTs);
  const durationSec = Math.floor((boundedEndTs - existing.startTs) / 1000);
  return {
    id: existing.sessionId,
    projectId: existing.projectId,
    startTs: existing.startTs,
    endTs: boundedEndTs,
    durationSec,
    dateKey: toDateKey(existing.startTs),
  };
}
