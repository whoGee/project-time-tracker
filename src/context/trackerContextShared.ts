import { createContext } from "react";
import { exportAllData } from "../lib/db";
import type { ActiveSession, Project, Session } from "../types";

export interface TrackerContextValue {
  ready: boolean;
  projects: Project[];
  sessions: Session[];
  activeSession: ActiveSession | null;
  activeElapsedSec: number;
  activeProject: Project | null;
  addProject: (id: string, name: string) => Promise<void>;
  removeProject: (projectId: string) => Promise<void>;
  switchProject: (projectId: string) => Promise<void>;
  stopTracking: () => Promise<void>;
  updateSessionProject: (sessionId: string, projectId: string) => Promise<void>;
  deleteSessionRecord: (sessionId: string) => Promise<void>;
  deleteSessionsForDate: (dateKey: string) => Promise<void>;
  exportFullData: typeof exportAllData;
}

export const TrackerContext = createContext<TrackerContextValue | null>(null);
