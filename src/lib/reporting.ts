import type { Project, Session, SummaryRow } from "../types";

export function compareProjectIds(a: string, b: string): number {
  const aStartsWithNumber = /^[0-9]/.test(a);
  const bStartsWithNumber = /^[0-9]/.test(b);

  if (aStartsWithNumber !== bStartsWithNumber) {
    return aStartsWithNumber ? -1 : 1;
  }

  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function buildSummaryRows(projects: Project[], sessions: Session[]): SummaryRow[] {
  const byProject = new Map<string, number>();
  for (const session of sessions) {
    byProject.set(
      session.projectKey,
      (byProject.get(session.projectKey) ?? 0) + session.durationSec
    );
  }

  const totalSec = Array.from(byProject.values()).reduce((acc, current) => acc + current, 0);
  const projectByKey = new Map(projects.map((project) => [project.key, project]));

  const rows: SummaryRow[] = Array.from(byProject.entries()).map(([projectKey, durationSec]) => {
    const project = projectByKey.get(projectKey);
    const minutes = durationSec / 60;
    return {
      projectKey,
      projectId: project ? project.id : projectKey,
      projectName: project ? project.name : projectKey,
      durationSec,
      minutes,
      hours: Number((durationSec / 3600).toFixed(1)),
      percent: totalSec === 0 ? 0 : (durationSec / totalSec) * 100,
    };
  });

  rows.sort((a, b) => {
    const byId = compareProjectIds(a.projectId, b.projectId);
    if (byId !== 0) {
      return byId;
    }
    const byName = a.projectName.localeCompare(b.projectName, undefined, { sensitivity: "base" });
    if (byName !== 0) {
      return byName;
    }
    return a.projectKey.localeCompare(b.projectKey, undefined, { sensitivity: "base" });
  });
  return rows;
}

export function totalHours(rows: SummaryRow[]): number {
  const sec = rows.reduce((acc, row) => acc + row.durationSec, 0);
  return Number((sec / 3600).toFixed(1));
}
