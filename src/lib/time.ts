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

export function dateKeyDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.max(0, Math.floor(days)));
  return toDateKey(date.getTime());
}

export function monthStartDateKey(): string {
  const now = new Date();
  return toDateKey(new Date(now.getFullYear(), now.getMonth(), 1).getTime());
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

export function toLocalDateTimeInputValue(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export function parseLocalDateTimeInputValue(value: string): number | null {
  if (!value) {
    return null;
  }
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : null;
}
