import type { MetaState, Project, Session } from "../types";

const PROJECT_KEY_PREFIX = "P";
const PROJECT_KEY_BODY_LENGTH = 6;
const PROJECT_KEY_REGEX = /^P[A-Z0-9]{6}$/;

export function formatProjectLabel(project: Pick<Project, "id" | "name">): string {
  return `${project.id} - ${project.name}`;
}

export function isShortProjectKey(value: string): boolean {
  return PROJECT_KEY_REGEX.test(value);
}

function randomProjectKeyBody(): string {
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    const randomValue = crypto.getRandomValues(new Uint32Array(1))[0];
    return randomValue.toString(36).toUpperCase().padStart(PROJECT_KEY_BODY_LENGTH, "0").slice(-6);
  }

  return Math.random().toString(36).slice(2).toUpperCase().padEnd(PROJECT_KEY_BODY_LENGTH, "0").slice(0, 6);
}

export function createShortProjectKey(usedKeys: ReadonlySet<string>): string {
  for (let attempt = 0; attempt < 1_000; attempt += 1) {
    const candidate = `${PROJECT_KEY_PREFIX}${randomProjectKeyBody()}`;
    if (!usedKeys.has(candidate)) {
      return candidate;
    }
  }

  throw new Error("Failed to generate a unique short project key.");
}

export function normalizeProjectKeyData(
  projects: Project[],
  sessions: Session[],
  meta: MetaState
): { projects: Project[]; sessions: Session[]; meta: MetaState } {
  const usedKeys = new Set<string>();
  const keyMap = new Map<string, string>();

  for (const project of projects) {
    if (!isShortProjectKey(project.key)) {
      continue;
    }
    usedKeys.add(project.key);
    keyMap.set(project.key, project.key);
  }

  const normalizedProjects = projects.map((project) => {
    const mappedKey =
      keyMap.get(project.key) ??
      (() => {
        const nextKey = createShortProjectKey(usedKeys);
        usedKeys.add(nextKey);
        keyMap.set(project.key, nextKey);
        return nextKey;
      })();

    return {
      ...project,
      key: mappedKey,
    };
  });

  const normalizedSessions = sessions.map((session) => ({
    ...session,
    projectKey: keyMap.get(session.projectKey) ?? session.projectKey,
  }));

  const normalizedMeta: MetaState = {
    ...meta,
    activeSession: meta.activeSession
      ? {
          ...meta.activeSession,
          projectKey: keyMap.get(meta.activeSession.projectKey) ?? meta.activeSession.projectKey,
        }
      : null,
  };

  return {
    projects: normalizedProjects,
    sessions: normalizedSessions,
    meta: normalizedMeta,
  };
}
