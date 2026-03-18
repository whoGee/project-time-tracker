import { toDateKey } from "../lib/time";
import type { ActiveSession, Session } from "../types";

export class ProjectDeleteBlockedError extends Error {
  constructor(projectLabel: string) {
    super(`Project "${projectLabel}" has logged sessions. Reassign or delete sessions first.`);
    this.name = "ProjectDeleteBlockedError";
  }
}

export function buildClosedSessionFromActive(existing: ActiveSession, endTs: number): Session {
  const boundedEndTs = Math.max(endTs, existing.startTs);
  const durationSec = Math.floor((boundedEndTs - existing.startTs) / 1000);
  return {
    id: existing.sessionId,
    projectKey: existing.projectKey,
    startTs: existing.startTs,
    endTs: boundedEndTs,
    durationSec,
    dateKey: toDateKey(existing.startTs),
  };
}
