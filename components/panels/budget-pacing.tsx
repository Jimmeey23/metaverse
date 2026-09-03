import * as React from "react";
import { CalendarClock, Gauge, Wallet } from "lucide-react";
import { Panel, PanelHeader, EmptyState } from "@/components/ui/primitives";
import { currency, num, pct } from "@/lib/format";
import { clamp, safeDiv } from "@/lib/utils";
import type { CampaignRow, ReportData } from "@/lib/types";

function dailyBudgetOf(c: CampaignRow) {
  if (c.budgetType === "daily") return c.budget;
  if (c.budgetType === "lifetime" && c.start && c.stop) {
    const days = Math.max(1, Math.round((Date.parse(`${c.stop}T00:00:00Z`) - Date.parse(`${c.start}T00:00:00Z`)) / 86400000) + 1);
    return c.budget / days;
  }
  return 0;
}

export function BudgetPacing({ data, className }: { data: ReportData; className?: string }) {
  const code = data.account.currency;
  const money = (v: number) => currency(v, code, { compact: true });
  const days = Math.max(1, data.range.days);

  const active = data.campaigns.filter((c) => (c.status ?? "").toUpperCase().includes("ACTIVE"));
  const rows = active
    .map((c) => {
      const capacity = dailyBudgetOf(c);
      const actual = safeDiv(c.spend, days);
      return { name: c.name, capacity, actual, pacing: capacity > 0 ? (actual / capacity) * 100 : null };
    })
    .filter((r) => r.capacity > 0)
    .sort((a, b) => (b.pacing ?? 0) - (a.pacing ?? 0));

  const dailyCapacity = rows.reduce((a, r) => a + r.capacity, 0);
  const dailyActual = safeDiv(data.kpis.spend, days);
  const pacing = dailyCapacity > 0 ? (dailyActual / dailyCapacity) * 100 : null;

  /* Month projection (only when the range touches the current calendar month) */
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
  const daysElapsed = now.getUTCDate();
  const daysRemaining = daysInMonth - daysElapsed;
  const mtdSpend = data.series.filter((s) => s.date >= monthStart && s.date <= today).reduce((a, s) => a + s.spend, 0);
  const projected = mtdSpend > 0 ? mtdSpend + dailyActual * daysRemaining : null;
  const monthBudget = dailyCapacity * daysInMonth;

  const toneOf = (p: number | null) =>
    p === null ? "text-faint" : p < 80 ? "text-info" : p <= 110 ? "text-pos" : "text-neg";
  const labelOf = (p: number | null) =>
    p === null ? "no budget set" : p < 80 ? "underspending" : p <= 110 ? "on pace" : "overspending";

  return (
    <Panel className={className}>
      <PanelHeader
        title="Budget pacing & projection"
        subtitle="Daily budgets compared with actual delivery"
        icon={<Gauge className="h-4 w-4" />}
      />
      <div className="space-y-5 px-5 pb-5 pt-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line/70 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-faint">Daily capacity</p>
            <p className="num text-lg font-semibold">{dailyCapacity > 0 ? money(dailyCapacity) : "—"}</p>
            <p className="text-[10px] text-faint">{rows.length} active campaigns with budgets</p>
          </div>
          <div className="rounded-xl border border-line/70 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-faint">Actual daily spend</p>
            <p className="num text-lg font-semibold">{money(dailyActual)}</p>
            <p className="text-[10px] text-faint">averaged over {days} days</p>
          </div>
          <div className="rounded-xl border border-line/70 px-3 py-2.5">
            <p className="text-[10px] uppercase tracking-wide text-faint">Pacing</p>
            <p className={`num text-lg font-semibold ${toneOf(pacing)}`}>{pacing === null ? "—" : pct(pacing, 0)}</p>
            <p className={`text-[10px] ${toneOf(pacing)}`}>{labelOf(pacing)}</p>
          </div>
        </div>

        {projected !== null ? (
          <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <CalendarClock className="h-4 w-4 text-brand-500" />
              <p className="text-[12px] font-semibold">Month-end projection</p>
              <span className="text-[11px] text-faint">{daysRemaining} day{daysRemaining === 1 ? "" : "s"} remaining</span>
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
              <div>
                <p className="text-[10px] uppercase tracking-wide text-faint">Month to date</p>
                <p className="num text-base font-semibold">{money(mtdSpend)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wide text-faint">Projected month end</p>
                <p className="num text-base font-semibold text-brand-500">{money(projected)}</p>
              </div>
              {monthBudget > 0 ? (
                <div className="min-w-[180px] flex-1">
                  <div className="mb-1 flex justify-between text-[10px] text-faint">
                    <span>of {money(monthBudget)} implied monthly budget</span>
                    <span className="num">{pct(safeDiv(projected, monthBudget) * 100, 0)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent"
                      style={{ width: `${clamp(safeDiv(projected, monthBudget) * 100, 2, 100)}%` }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {rows.length ? (
          <div className="space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-faint">Per-campaign pacing</p>
            {rows.slice(0, 8).map((r) => (
              <div key={r.name}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-[11px]">
                  <span className="truncate" title={r.name}>{r.name}</span>
                  <span className="num shrink-0 text-muted">
                    <span className="font-semibold text-ink">{money(r.actual)}</span>
                    <span className="text-faint"> / {money(r.capacity)} per day</span>
                    {r.pacing !== null ? <span className={`ml-1.5 font-semibold ${toneOf(r.pacing)}`}>{pct(r.pacing, 0)}</span> : null}
                  </span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-ink/10">
                  <div
                    className={`h-full rounded-full ${r.pacing === null ? "bg-faint/40" : r.pacing < 80 ? "bg-info" : r.pacing <= 110 ? "bg-pos" : "bg-neg"}`}
                    style={{ width: `${clamp(r.pacing ?? 0, 2, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Wallet className="h-5 w-5" />} title="No daily budgets found" description="Campaigns without a daily budget are excluded from pacing." />
        )}
        {rows.length ? (
          <p className="text-[10px] text-faint">
            Showing top {Math.min(rows.length, 8)} of {num(rows.length)} budgeted active campaigns · lifetime budgets are amortised across their flight dates.
          </p>
        ) : null}
      </div>
    </Panel>
  );
}
