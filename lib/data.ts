import "server-only";
import { cookies } from "next/headers";
import type { Account, Range, ReportData } from "./types";
import { COOKIE_NAME, decodeSession, type Session } from "./meta";
import { metaConfig } from "./meta";
import { buildDemoData, DEMO_ACCOUNTS } from "./demo";
import { buildLiveData } from "./live";
import { resolveRange } from "./ranges";
import { getAccounts } from "./meta";
import { safeDiv, sum } from "./utils";

const DAY_NAMES_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const DAY_NAMES_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return decodeSession(store.get(COOKIE_NAME)?.value);
}

export function isDemo(session: Session | null) {
  return !session?.accessToken || metaConfig().forceDemo;
}

export async function listAccounts(session: Session | null): Promise<Account[]> {
  if (!session?.accessToken || metaConfig().forceDemo) return DEMO_ACCOUNTS;
  try {
    const rows = await getAccounts(session.accessToken);
    const accounts: Account[] = rows.map((r) => ({
      id: r.id ?? `act_${r.account_id}`,
      name: r.name ?? "Ad account",
      currency: r.currency ?? "USD",
      timezone: r.timezone_name ?? "UTC",
      status: Number(r.account_status ?? 1),
      amountSpent: Number(r.amount_spent ?? 0) / 100,
      businessName: r.business_name,
    }));
    return accounts.length ? accounts : DEMO_ACCOUNTS;
  } catch {
    return DEMO_ACCOUNTS;
  }
}

/** Fill in derived fields that both modes share (weekday aggregation). */
function finalize(data: ReportData): ReportData {
  if (!data.weekday?.length) {
    const buckets = DAY_NAMES_SHORT.map((day) => ({ day, spend: 0, results: 0, cpa: 0 }));
    for (const point of data.series) {
      const idx = new Date(`${point.date}T00:00:00Z`).getUTCDay();
      buckets[idx].spend += point.spend;
      buckets[idx].results += point.results;
    }
    buckets.forEach((b) => (b.cpa = safeDiv(b.spend, b.results)));
    data.weekday = buckets;
  }
  return data;
}

const cache = new Map<string, { at: number; data: ReportData }>();
const TTL = 5 * 60 * 1000;

export type ReportOptions = {
  rangeKey?: string;
  since?: string;
  until?: string;
  accountId?: string;
  session?: Session | null;
};

export async function loadReport(opts: ReportOptions = {}): Promise<{ data: ReportData; accounts: Account[]; session: Session | null; range: Range }> {
  const session = opts.session !== undefined ? opts.session : await getSession();
  const range = resolveRange(opts.rangeKey, opts.since, opts.until);
  const accounts = await listAccounts(session);
  const accountId = opts.accountId && accounts.some((a) => a.id === opts.accountId) ? opts.accountId : accounts[0]?.id ?? DEMO_ACCOUNTS[0].id;
  const account = accounts.find((a) => a.id === accountId) ?? accounts[0] ?? DEMO_ACCOUNTS[0];

  if (isDemo(session)) {
    return { data: finalize(buildDemoData(accountId, range, account.name)), accounts, session, range };
  }

  const key = `${session!.userId}:${accountId}:${range.since}:${range.until}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) {
    return { data: hit.data, accounts, session, range };
  }

  const data = finalize(await buildLiveData(session!.accessToken, account, range));
  cache.set(key, { at: Date.now(), data });
  return { data, accounts, session, range };
}

export function clearReportCache() {
  cache.clear();
}

export { DAY_NAMES_SHORT, DAY_NAMES_LONG };
