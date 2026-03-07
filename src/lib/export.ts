import { utils, write } from "xlsx";
import type { MetaState, Project, Session, SummaryRow } from "../types";

export function summaryRowsToXlsx(rows: SummaryRow[], scopeLabel: string): Blob {
  const data = [
    ["Scope", scopeLabel],
    [],
    ["Project ID", "Project Name", "Minutes", "Hours (1dp)", "Percent"],
    ...rows.map((row) => [
      row.projectId,
      row.projectName,
      Number(row.minutes.toFixed(1)),
      Number(row.hours.toFixed(1)),
      Number(row.percent.toFixed(2)),
    ]),
  ];

  const workbook = utils.book_new();
  const worksheet = utils.aoa_to_sheet(data);
  utils.book_append_sheet(workbook, worksheet, "Summary");

  const content = write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([content], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function fullDataToJson(projects: Project[], sessions: Session[], meta: MetaState): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      projects,
      sessions,
      meta,
    },
    null,
    2
  );
}

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadText(filename: string, content: string, mimeType: string): void {
  downloadBlob(filename, new Blob([content], { type: mimeType }));
}
