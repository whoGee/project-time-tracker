import { describe, expect, it } from "vitest";
import { buildSummaryRows, totalHours } from "../src/lib/reporting";
import type { Project, Session } from "../src/types";

describe("reporting", () => {
  it("builds sorted summary rows with percentages", () => {
    const projects: Project[] = [
      { key: "project-1", id: "P1", name: "Alpha", createdAt: 1 },
      { key: "project-2", id: "P2", name: "Beta", createdAt: 2 },
    ];
    const sessions: Session[] = [
      {
        id: "s1",
        projectKey: "project-1",
        startTs: 1000,
        endTs: 3_601_000,
        durationSec: 3600,
        dateKey: "2026-03-08",
      },
      {
        id: "s2",
        projectKey: "project-2",
        startTs: 4_000_000,
        endTs: 5_800_000,
        durationSec: 1800,
        dateKey: "2026-03-08",
      },
    ];

    const rows = buildSummaryRows(projects, sessions);

    expect(rows).toHaveLength(2);
    expect(rows[0].projectKey).toBe("project-1");
    expect(rows[0].projectId).toBe("P1");
    expect(rows[0].hours).toBe(1);
    expect(rows[0].percent).toBeCloseTo(66.666, 2);
    expect(rows[1].projectKey).toBe("project-2");
    expect(rows[1].projectId).toBe("P2");
    expect(rows[1].hours).toBe(0.5);
    expect(rows[1].percent).toBeCloseTo(33.333, 2);
    expect(totalHours(rows)).toBe(1.5);
  });

  it("keeps projects with the same visible id separated by project key", () => {
    const projects: Project[] = [
      { key: "project-1", id: "6262", name: "ACS4433", createdAt: 1 },
      { key: "project-2", id: "6262", name: "BETA9001", createdAt: 2 },
    ];
    const sessions: Session[] = [
      {
        id: "s1",
        projectKey: "project-1",
        startTs: 1000,
        endTs: 3_601_000,
        durationSec: 3600,
        dateKey: "2026-03-08",
      },
      {
        id: "s2",
        projectKey: "project-2",
        startTs: 4_000_000,
        endTs: 5_800_000,
        durationSec: 1800,
        dateKey: "2026-03-08",
      },
    ];

    const rows = buildSummaryRows(projects, sessions);

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.projectKey)).toEqual(["project-1", "project-2"]);
    expect(rows.map((row) => row.projectName)).toEqual(["ACS4433", "BETA9001"]);
  });

  it("falls back to project key when project metadata is missing", () => {
    const rows = buildSummaryRows([], [
      {
        id: "s1",
        projectKey: "project-missing",
        startTs: 1000,
        endTs: 2000,
        durationSec: 1,
        dateKey: "2026-03-08",
      },
    ]);

    expect(rows[0].projectId).toBe("project-missing");
    expect(rows[0].projectName).toBe("project-missing");
  });
});
