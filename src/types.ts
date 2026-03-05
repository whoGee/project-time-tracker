export interface Project {
  id: string;
  name: string;
  createdAt: number;
}

export interface Session {
  id: string;
  projectId: string;
  startTs: number;
  endTs: number;
  durationSec: number;
  dateKey: string;
}

export interface ActiveSession {
  sessionId: string;
  projectId: string;
  startTs: number;
  heartbeatTs: number;
}

export interface MetaState {
  activeSession: ActiveSession | null;
}

export interface SummaryRow {
  projectId: string;
  projectName: string;
  durationSec: number;
  minutes: number;
  hours: number;
  percent: number;
}
