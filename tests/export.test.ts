import { Workbook } from "exceljs";
import { describe, expect, it } from "vitest";
import { intervalDataToXlsx } from "../src/lib/export";
import type { Project, Session } from "../src/types";

async function loadWorkbook(includeProjectKey: boolean) {
  const projects: Project[] = [
    { key: "P12AB3C", id: "6262", name: "ACS4433", createdAt: 1 },
  ];
  const sessions: Session[] = [
    {
      id: "s1",
      projectKey: "P12AB3C",
      startTs: 1_000,
      endTs: 3_601_000,
      durationSec: 3600,
      dateKey: "2026-03-08",
    },
  ];

  const blob = await intervalDataToXlsx(
    projects,
    sessions,
    "2026-03-08",
    "2026-03-08",
    includeProjectKey
  );
  const workbook = new Workbook();
  const buffer = Buffer.from(await blob.arrayBuffer());
  await workbook.xlsx.load(buffer);
  return workbook;
}

describe("interval export", () => {
  it("omits project key columns by default", async () => {
    const workbook = await loadWorkbook(false);
    const summaryHeader = workbook.getWorksheet("Summary")?.getRow(3).values as string[];
    const dailyHeader = workbook.getWorksheet("Daily breakdown")?.getRow(1).values as string[];

    expect(summaryHeader.slice(1)).toEqual([
      "Project ID",
      "Project Name",
      "Minutes",
      "Hours (1dp)",
      "Percent",
    ]);
    expect(dailyHeader.slice(1, 4)).toEqual(["Project ID", "Project Name", "2026-03-08"]);
  });

  it("adds project key columns when enabled", async () => {
    const workbook = await loadWorkbook(true);
    const summaryHeader = workbook.getWorksheet("Summary")?.getRow(3).values as string[];
    const summaryRow = workbook.getWorksheet("Summary")?.getRow(4).values as (string | number)[];
    const dailyHeader = workbook.getWorksheet("Daily breakdown")?.getRow(1).values as string[];

    expect(summaryHeader.slice(1)).toEqual([
      "Project Key",
      "Project ID",
      "Project Name",
      "Minutes",
      "Hours (1dp)",
      "Percent",
    ]);
    expect(summaryRow.slice(1, 4)).toEqual(["P12AB3C", "6262", "ACS4433"]);
    expect(dailyHeader.slice(1, 5)).toEqual([
      "Project Key",
      "Project ID",
      "Project Name",
      "2026-03-08",
    ]);
  });
});
