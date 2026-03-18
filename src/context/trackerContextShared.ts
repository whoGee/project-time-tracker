import { createContext } from "react";
import { exportAllData } from "../lib/db";
import type {
  ActiveSession,
  MetaState,
  Project,
  Session,
  SessionUpdateInput,
} from "../types";

export interface TrackerContextValue {
  ready: boolean;
  projects: Project[];
  sessions: Session[];
  activeSession: ActiveSession | null;
  activeElapsedSec: number;
  activeProject: Project | null;
  addProject: (id: string, name: string) => Promise<void>;
  removeProject: (projectKey: string) => Promise<void>;
  hideProjectFromTracker: (projectKey: string) => Promise<void>;
  deleteProjectWithSavedData: (projectKey: string) => Promise<void>;
  switchProject: (projectKey: string) => Promise<void>;
  stopTracking: () => Promise<void>;
  updateSessionRecord: (sessionId: string, updates: SessionUpdateInput) => Promise<void>;
  deleteSessionRecord: (sessionId: string) => Promise<void>;
  deleteSessionsForDate: (dateKey: string) => Promise<void>;
  exportFullData: typeof exportAllData;
  clearAllData: () => Promise<void>;
  importFullData: (projects: Project[], sessions: Session[], meta: MetaState) => Promise<void>;
  includeProjectKeyInExports: boolean;
  setIncludeProjectKeyInExports: (enabled: boolean) => Promise<void>;
}

export const TrackerContext = createContext<TrackerContextValue | null>(null);
