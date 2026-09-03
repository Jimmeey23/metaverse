import type { Range } from "./types";

const DAY = 86400000;

function todayUTC() {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function iso(ms: number) {
  return new Date(ms).toISOString().slice(0, 10);
}

function daysBetween(since: string, until: string) {
  return Math.round((Date.parse(`${until}T00:00:00Z`) - Date.parse(`${since}T00:00:00Z`)) / DAY) + 1;
}

function make(key: string, label: string, since: string, until: string): Range {
  return { key, label, since, until, days: daysBetween(since, until) };
}

export const RANGE_PRESETS: Range[] = [
  make("today", "Today", iso(todayUTC()), iso(todayUTC())),
  make("yesterday", "Yesterday", iso(todayUTC() - DAY), iso(todayUTC() - DAY)),
  make("last_7d", "Last 7 days", iso(todayUTC() - 6 * DAY), iso(todayUTC())),
  make("last_14d", "Last 14 days", iso(todayUTC() - 13 * DAY), iso(todayUTC())),
  make("last_30d", "Last 30 days", iso(todayUTC() - 29 * DAY), iso(todayUTC())),
  make("last_90d", "Last 90 days", iso(todayUTC() - 89 * DAY), iso(todayUTC())),
  make("this_month", "This month", iso(new Date(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1).getTime()), iso(todayUTC())),
  make("last_month", "Last month", iso(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - 1, 1)), iso(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 0))),
];

export function resolveRange(key?: string, customSince?: string, customUntil?: string): Range {
  if (customSince && customUntil) {
    const since = customSince < customUntil ? customSince : customUntil;
    const until = customSince < customUntil ? customUntil : customSince;
    return make("custom", `${since} → ${until}`, since, until);
  }
  return RANGE_PRESETS.find((r) => r.key === key) ?? RANGE_PRESETS.find((r) => r.key === "last_30d")!;
}

export function previousRange(range: Range): Range {
  const untilMs = Date.parse(`${range.since}T00:00:00Z`) - DAY;
  const sinceMs = untilMs - (range.days - 1) * DAY;
  return make(`${range.key}_prev`, "Previous period", iso(sinceMs), iso(untilMs));
}

export function shiftDays(date: string, days: number) {
  return iso(Date.parse(`${date}T00:00:00Z`) + days * DAY);
}
