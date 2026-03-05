import type { MetaState, Project, Session, SummaryRow } from "../types";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function summaryRowsToCsv(rows: SummaryRow[], scopeLabel: string): string {
  const header = [
    `Scope,${escapeCsv(scopeLabel)}`,
    "Project ID,Project Name,Minutes,Hours (1dp),Percent",
  ];

  const lines = rows.map((row) =>
    [
      escapeCsv(row.projectId),
      escapeCsv(row.projectName),
      row.minutes.toFixed(1),
      row.hours.toFixed(1),
      row.percent.toFixed(2),
    ].join(",")
  );

  return [...header, ...lines].join("\n");
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

export function downloadText(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
