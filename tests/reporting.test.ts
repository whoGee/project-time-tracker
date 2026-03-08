import { describe, expect, it } from "vitest";
import { buildSummaryRows, totalHours } from "../src/lib/reporting";
import type { Project, Session } from "../src/types";

describe("reporting", () => {
  it("builds sorted summary rows with percentages", () => {
    const projects: Project[] = [
      { id: "P1", name: "Alpha", createdAt: 1 },
      { id: "P2", name: "Beta", createdAt: 2 },
    ];
    const sessions: Session[] = [
      {
        id: "s1",
        projectId: "P1",
        startTs: 1000,
        endTs: 3_601_000,
        durationSec: 3600,
        dateKey: "2026-03-08",
      },
      {
        id: "s2",
        projectId: "P2",
        startTs: 4_000_000,
        endTs: 5_800_000,
        durationSec: 1800,
        dateKey: "2026-03-08",
      },
    ];

    const rows = buildSummaryRows(projects, sessions);

    expect(rows).toHaveLength(2);
    expect(rows[0].projectId).toBe("P1");
    expect(rows[0].hours).toBe(1);
    expect(rows[0].percent).toBeCloseTo(66.666, 2);
    expect(rows[1].projectId).toBe("P2");
    expect(rows[1].hours).toBe(0.5);
    expect(rows[1].percent).toBeCloseTo(33.333, 2);
    expect(totalHours(rows)).toBe(1.5);
  });

  it("falls back to project id when project metadata is missing", () => {
    const rows = buildSummaryRows([], [
      {
        id: "s1",
        projectId: "MISSING",
        startTs: 1000,
        endTs: 2000,
        durationSec: 1,
        dateKey: "2026-03-08",
      },
    ]);

    expect(rows[0].projectName).toBe("MISSING");
  });
});
