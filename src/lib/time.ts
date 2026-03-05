export function toDateKey(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function todayDateKey(): string {
  return toDateKey(Date.now());
}

export function startOfDayTs(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0).getTime();
}

export function endOfDayTs(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
}

export function formatHhMmSs(durationSec: number): string {
  const sec = Math.max(0, Math.floor(durationSec));
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;
}

export function formatTs(ts: number): string {
  return new Date(ts).toLocaleString();
}
