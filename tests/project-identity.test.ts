import { describe, expect, it } from "vitest";
import { formatProjectLabel, isShortProjectKey, normalizeProjectKeyData } from "../src/lib/projectIdentity";
import { buildSummaryRows, totalHours } from "../src/lib/reporting";
import type { MetaState, Project, Session } from "../src/types";

describe("project identity", () => {
  it("formats project labels as id and name", () => {
    expect(formatProjectLabel({ id: "6404", name: "ABC123" } as Project)).toBe("6404 - ABC123");
  });

  it("normalizes legacy and long keys to the short project-key format", () => {
    const projects: Project[] = [
      { key: "6262", id: "6262", name: "ACS4433", createdAt: 1 },
      { key: "proj-a-very-long-key", id: "6262", name: "BETA9001", createdAt: 2 },
    ];
    const sessions: Session[] = [
      {
        id: "s1",
        projectKey: "6262",
        startTs: 1000,
        endTs: 2000,
        durationSec: 1,
        dateKey: "1970-01-01",
      },
      {
        id: "s2",
        projectKey: "proj-a-very-long-key",
        startTs: 3000,
        endTs: 4000,
        durationSec: 1,
        dateKey: "1970-01-01",
      },
    ];
    const meta: MetaState = {
      activeSession: {
        sessionId: "active-1",
        projectKey: "proj-a-very-long-key",
        startTs: 3000,
        heartbeatTs: 3500,
      },
      includeProjectKeyInExports: false,
    };

    const normalized = normalizeProjectKeyData(projects, sessions, meta);

    expect(normalized.projects).toHaveLength(2);
    expect(normalized.projects.every((project) => isShortProjectKey(project.key))).toBe(true);
    expect(new Set(normalized.projects.map((project) => project.key)).size).toBe(2);
    expect(normalized.sessions.every((session) => isShortProjectKey(session.projectKey))).toBe(true);
    expect(normalized.meta.activeSession && isShortProjectKey(normalized.meta.activeSession.projectKey)).toBe(true);
  });

  it("preserves already-short keys", () => {
    const projects: Project[] = [
      { key: "P12AB3C", id: "6404", name: "ABC123", createdAt: 1 },
    ];

    const normalized = normalizeProjectKeyData(projects, [], {
      activeSession: null,
      includeProjectKeyInExports: false,
    });

    expect(normalized.projects[0].key).toBe("P12AB3C");
  });

  it("preserves user-visible totals and labels when migrating cached legacy keys", () => {
    const projects: Project[] = [
      { key: "6xxx", id: "6xxx", name: "testing", createdAt: 1 },
      { key: "6328", id: "6328", name: "MSP168", createdAt: 2 },
      { key: "jproj-1cc9f1f4-a827-4152-b3c1-32b14addb518", id: "6329", name: "MSP175", createdAt: 3 },
      { key: "6403", id: "6403", name: "ACS3101", createdAt: 4 },
      { key: "6404", id: "6404", name: "CS5141", createdAt: 5 },
      { key: "proj-62715985-2deb-4c5d-ade4-ef4184539a6a", id: "6404", name: "ABC123", createdAt: 6 },
      { key: "6405", id: "6405", name: "MD1502", createdAt: 7 },
      { key: "LUNCH", id: "LUNCH", name: "-", createdAt: 8 },
      { key: "TEST", id: "TEST", name: "test", createdAt: 9 },
    ];
    const sessions: Session[] = [
      {
        id: "s-6328",
        projectKey: "6328",
        startTs: 1_000,
        endTs: 13_960_000,
        durationSec: 13_959,
        dateKey: "1970-01-01",
      },
      {
        id: "s-6403",
        projectKey: "6403",
        startTs: 20_000_000,
        endTs: 64_280_000,
        durationSec: 44_280,
        dateKey: "1970-01-01",
      },
      {
        id: "s-6404-a",
        projectKey: "6404",
        startTs: 70_000_000,
        endTs: 130_840_000,
        durationSec: 60_840,
        dateKey: "1970-01-01",
      },
      {
        id: "s-6405",
        projectKey: "6405",
        startTs: 140_000_000,
        endTs: 140_360_000,
        durationSec: 360,
        dateKey: "1970-01-02",
      },
    ];
    const meta: MetaState = {
      activeSession: {
        sessionId: "active-6404-b",
        projectKey: "proj-62715985-2deb-4c5d-ade4-ef4184539a6a",
        startTs: 150_000_000,
        heartbeatTs: 150_300_000,
      },
      includeProjectKeyInExports: true,
    };

    const beforeRows = buildSummaryRows(projects, sessions)
      .map((row) => ({
        label: `${row.projectId} - ${row.projectName}`,
        hours: row.hours,
        durationSec: row.durationSec,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    const beforeTotal = totalHours(buildSummaryRows(projects, sessions));

    const normalized = normalizeProjectKeyData(projects, sessions, meta);

    const afterRows = buildSummaryRows(normalized.projects, normalized.sessions)
      .map((row) => ({
        label: `${row.projectId} - ${row.projectName}`,
        hours: row.hours,
        durationSec: row.durationSec,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    const afterTotal = totalHours(buildSummaryRows(normalized.projects, normalized.sessions));

    expect(afterRows).toEqual(beforeRows);
    expect(afterTotal).toBe(beforeTotal);
    expect(normalized.projects.every((project) => isShortProjectKey(project.key))).toBe(true);
    expect(normalized.sessions.every((session) => isShortProjectKey(session.projectKey))).toBe(true);
    expect(normalized.meta.activeSession && isShortProjectKey(normalized.meta.activeSession.projectKey)).toBe(true);
  });
});
