export interface Project {
  key: string;
  id: string;
  name: string;
  createdAt: number;
  hiddenFromTracker?: boolean;
}

export interface Session {
  id: string;
  projectKey: string;
  startTs: number;
  endTs: number;
  durationSec: number;
  dateKey: string;
}

export interface ActiveSession {
  sessionId: string;
  projectKey: string;
  startTs: number;
  heartbeatTs: number;
}

export interface MetaState {
  activeSession: ActiveSession | null;
  includeProjectKeyInExports: boolean;
}

export interface BackupData {
  projects: Project[];
  sessions: Session[];
  meta: MetaState;
}

export interface SessionUpdateInput {
  projectKey?: string;
  startTs?: number;
  endTs?: number;
}

export interface SummaryRow {
  projectKey: string;
  projectId: string;
  projectName: string;
  durationSec: number;
  minutes: number;
  hours: number;
  percent: number;
}
