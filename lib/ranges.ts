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

function startOfWeekUTC() {
  const day = new Date(todayUTC()).getUTCDay();
  return todayUTC() - ((day + 6) % 7) * DAY;
}

export const RANGE_PRESETS: Range[] = [
  make("today", "Today", iso(todayUTC()), iso(todayUTC())),
  make("yesterday", "Yesterday", iso(todayUTC() - DAY), iso(todayUTC() - DAY)),
  make("last_7d", "Last 7 days", iso(todayUTC() - 6 * DAY), iso(todayUTC())),
  make("this_week", "This week (WoW)", iso(startOfWeekUTC()), iso(todayUTC())),
  make("last_week", "Last full week", iso(startOfWeekUTC() - 7 * DAY), iso(startOfWeekUTC() - DAY)),
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
  if (range.key === "this_week") {
    return make("this_week_prev", "Same days last week", iso(Date.parse(`${range.since}T00:00:00Z`) - 7 * DAY), iso(Date.parse(`${range.until}T00:00:00Z`) - 7 * DAY));
  }
  if (range.key === "this_month") {
    const until = new Date(`${range.until}T00:00:00Z`);
    const year = until.getUTCFullYear();
    const month = until.getUTCMonth();
    const previousMonthEnd = Date.UTC(year, month, 0);
    const comparableDay = Math.min(until.getUTCDate(), new Date(previousMonthEnd).getUTCDate());
    return make("this_month_prev", "Same dates last month", iso(Date.UTC(year, month - 1, 1)), iso(Date.UTC(year, month - 1, comparableDay)));
  }
  if (range.key === "last_month") {
    const start = new Date(`${range.since}T00:00:00Z`);
    return make("last_month_prev", "Prior full month", iso(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1)), iso(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 0)));
  }
  const untilMs = Date.parse(`${range.since}T00:00:00Z`) - DAY;
  const sinceMs = untilMs - (range.days - 1) * DAY;
  return make(`${range.key}_prev`, "Previous period", iso(sinceMs), iso(untilMs));
}

export function shiftDays(date: string, days: number) {
  return iso(Date.parse(`${date}T00:00:00Z`) + days * DAY);
}
