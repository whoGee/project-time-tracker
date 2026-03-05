import type { Project, Session, SummaryRow } from "../types";

export function buildSummaryRows(projects: Project[], sessions: Session[]): SummaryRow[] {
  const byProject = new Map<string, number>();
  for (const session of sessions) {
    byProject.set(
      session.projectId,
      (byProject.get(session.projectId) ?? 0) + session.durationSec
    );
  }

  const totalSec = Array.from(byProject.values()).reduce((acc, current) => acc + current, 0);
  const projectById = new Map(projects.map((p) => [p.id, p]));

  const rows: SummaryRow[] = Array.from(byProject.entries()).map(([projectId, durationSec]) => {
    const project = projectById.get(projectId);
    const minutes = durationSec / 60;
    return {
      projectId,
      projectName: project ? project.name : projectId,
      durationSec,
      minutes,
      hours: Number((durationSec / 3600).toFixed(1)),
      percent: totalSec === 0 ? 0 : (durationSec / totalSec) * 100,
    };
  });

  rows.sort((a, b) => b.durationSec - a.durationSec);
  return rows;
}

export function totalHours(rows: SummaryRow[]): number {
  const sec = rows.reduce((acc, row) => acc + row.durationSec, 0);
  return Number((sec / 3600).toFixed(1));
}
