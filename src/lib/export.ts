import { compareProjectIds } from "./reporting";
import type { MetaState, Project, Session, SummaryRow } from "../types";

function escapeCsvCell(value: string): string {
  const neutralized =
    value.startsWith("=") || value.startsWith("+") || value.startsWith("-") || value.startsWith("@")
      ? `'${value}`
      : value;
  return `"${neutralized.replaceAll('"', '""')}"`;
}

export function summaryRowsToCsv(rows: SummaryRow[], scopeLabel: string): string {
  const header = "Project ID,Project Name,Minutes,Hours (1dp),Percent";
  const body = rows
    .map((row) =>
      [
        escapeCsvCell(row.projectId),
        escapeCsvCell(row.projectName),
        row.minutes.toFixed(1),
        row.hours.toFixed(1),
        row.percent.toFixed(2),
      ].join(",")
    )
    .join("\n");

  return [`Scope,${escapeCsvCell(scopeLabel)}`, "", header, body].filter(Boolean).join("\n");
}

function dateKeysInRange(startDateKey: string, endDateKey: string): string[] {
  const [startYear, startMonth, startDay] = startDateKey.split("-").map(Number);
  const [endYear, endMonth, endDay] = endDateKey.split("-").map(Number);
  const current = new Date(startYear, startMonth - 1, startDay);
  const end = new Date(endYear, endMonth - 1, endDay);

  const keys: string[] = [];
  while (current <= end) {
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, "0");
    const dd = String(current.getDate()).padStart(2, "0");
    keys.push(`${yyyy}-${mm}-${dd}`);
    current.setDate(current.getDate() + 1);
  }
  return keys;
}

export async function intervalDataToXlsx(
  projects: Project[],
  sessions: Session[],
  startDateKey: string,
  endDateKey: string
): Promise<Blob> {
  const excelJs = await import("exceljs");
  const { Workbook } = excelJs;
  const workbook = new Workbook();
  const scopeLabel = `${startDateKey} to ${endDateKey}`;
  const sortedProjects = [...projects].sort((a, b) => compareProjectIds(a.id, b.id));
  const dateKeys = dateKeysInRange(startDateKey, endDateKey);

  const byProjectTotalSec = new Map<string, number>();
  const byProjectByDateSec = new Map<string, Map<string, number>>();
  for (const project of sortedProjects) {
    byProjectTotalSec.set(project.id, 0);
    byProjectByDateSec.set(project.id, new Map(dateKeys.map((dateKey) => [dateKey, 0])));
  }

  for (const session of sessions) {
    if (session.dateKey < startDateKey || session.dateKey > endDateKey) {
      continue;
    }
    byProjectTotalSec.set(
      session.projectId,
      (byProjectTotalSec.get(session.projectId) ?? 0) + session.durationSec
    );
    const byDate = byProjectByDateSec.get(session.projectId) ?? new Map<string, number>();
    byDate.set(session.dateKey, (byDate.get(session.dateKey) ?? 0) + session.durationSec);
    byProjectByDateSec.set(session.projectId, byDate);
  }

  const totalIntervalSec = Array.from(byProjectTotalSec.values()).reduce((acc, sec) => acc + sec, 0);

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.addRow(["Scope", scopeLabel]);
  summarySheet.addRow([]);
  summarySheet.addRow(["Project ID", "Project Name", "Minutes", "Hours (1dp)", "Percent"]);
  for (const project of sortedProjects) {
    const durationSec = byProjectTotalSec.get(project.id) ?? 0;
    const minutes = durationSec / 60;
    const hours = durationSec / 3600;
    const percent = totalIntervalSec === 0 ? 0 : (durationSec / totalIntervalSec) * 100;
    summarySheet.addRow([
      project.id,
      project.name,
      Number(minutes.toFixed(1)),
      Number(hours.toFixed(1)),
      Number(percent.toFixed(1)),
    ]);
  }

  const dailySheet = workbook.addWorksheet("Daily breakdown");
  dailySheet.addRow(["Project ID", "Project Name", ...dateKeys, "Percent"]);
  for (const project of sortedProjects) {
    const durationSec = byProjectTotalSec.get(project.id) ?? 0;
    const percent = totalIntervalSec === 0 ? 0 : (durationSec / totalIntervalSec) * 100;
    const perDayHours = dateKeys.map((dateKey) => {
      const sec = byProjectByDateSec.get(project.id)?.get(dateKey) ?? 0;
      return Number((sec / 3600).toFixed(1));
    });
    dailySheet.addRow([
      project.id,
      project.name,
      ...perDayHours,
      Number(percent.toFixed(1)),
    ]);
  }

  const content = await workbook.xlsx.writeBuffer();
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
