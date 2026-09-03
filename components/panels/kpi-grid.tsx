import * as React from "react";
import { Activity, Coins, Crosshair, MousePointerClick, Target, TrendingUp, Wallet } from "lucide-react";
import { Delta, Panel, Sparkline } from "@/components/ui/primitives";
import { currency, num, pct } from "@/lib/format";
import { pctChange, safeDiv } from "@/lib/utils";
import type { Kpis, SeriesPoint } from "@/lib/types";
import { cn } from "@/lib/utils";

type Card = {
  label: string;
  value: string;
  delta: number | null;
  invert?: boolean;
  icon: React.ReactNode;
  spark: number[];
  color: string;
  hint: string;
};

export function KpiCard({ card, days }: { card: Card; days: number }) {
  return (
    <Panel className="panel-hover p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-[0.08em] text-faint">{card.label}</p>
          <p className="mt-1.5 truncate text-[26px] font-semibold leading-none num">{card.value}</p>
        </div>
        <div
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1"
          style={{ background: `hsl(var(--${card.color}) / 0.12)`, color: `hsl(var(--${card.color}))` }}
        >
          {card.icon}
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <Delta value={card.delta} invert={card.invert} />
          <p className="mt-1 truncate text-[10px] text-faint">vs prev {days}d · {card.hint}</p>
        </div>
        <Sparkline data={card.spark} width={96} height={34} stroke={`hsl(var(--${card.color}))`} />
      </div>
    </Panel>
  );
}

export function KpiGrid({ kpis, prev, series, code, days }: { kpis: Kpis; prev: Kpis; series: SeriesPoint[]; code: string; days: number }) {
  const money = (v: number) => currency(v, code, { compact: true });
  const conv = kpis.leads + kpis.purchases;
  const prevConv = prev.leads + prev.purchases;
  const cards: Card[] = [
    {
      label: "Amount spent", value: money(kpis.spend), delta: pctChange(kpis.spend, prev.spend), icon: <Wallet className="h-4 w-4" />,
      spark: series.map((s) => s.spend), color: "chart-1", hint: `${money(kpis.spend / Math.max(days, 1))}/day`,
    },
    {
      label: "Conversions", value: num(conv, 0), delta: pctChange(conv, prevConv), icon: <Target className="h-4 w-4" />,
      spark: series.map((s) => s.leads + s.purchases), color: "chart-2", hint: `${num(kpis.leads, 0)} leads · ${num(kpis.purchases, 0)} purchases`,
    },
    {
      label: "Cost per conversion", value: conv ? money(kpis.spend / conv) : "—", delta: pctChange(safeDiv(kpis.spend, conv), safeDiv(prev.spend, prevConv)), invert: true,
      icon: <Crosshair className="h-4 w-4" />, spark: series.map((s) => { const c = s.leads + s.purchases; return c ? s.spend / c : 0; }), color: "chart-3", hint: "lower is better",
    },
    {
      label: "ROAS", value: `${kpis.roas.toFixed(2)}×`, delta: pctChange(kpis.roas, prev.roas), icon: <TrendingUp className="h-4 w-4" />,
      spark: series.map((s) => s.roas), color: "chart-4", hint: `${money(kpis.revenue)} revenue`,
    },
    {
      label: "CTR (link)", value: pct(kpis.ctr), delta: pctChange(kpis.ctr, prev.ctr), icon: <MousePointerClick className="h-4 w-4" />,
      spark: series.map((s) => s.ctr), color: "chart-5", hint: `${num(kpis.clicks, 0)} clicks`,
    },
    {
      label: "CPM", value: money(kpis.cpm), delta: pctChange(kpis.cpm, prev.cpm), invert: true, icon: <Coins className="h-4 w-4" />,
      spark: series.map((s) => s.cpm), color: "chart-6", hint: `${pct(0)} of budget pacing`,
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((c) => <KpiCard key={c.label} card={c} days={days} />)}
    </div>
  );
}

export function MiniStatRow({ items, className }: { items: { label: string; value: string; icon?: React.ReactNode; delta?: number | null; invert?: boolean }[]; className?: string }) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-4", className)}>
      {items.map((i) => (
        <Panel key={i.label} className="flex items-center gap-3 p-3.5">
          {i.icon ? <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-500">{i.icon}</div> : null}
          <div className="min-w-0">
            <p className="truncate text-[11px] uppercase tracking-wide text-faint">{i.label}</p>
            <div className="flex items-center gap-2">
              <p className="truncate text-lg font-semibold num">{i.value}</p>
              {i.delta !== undefined ? <Delta value={i.delta} invert={i.invert} showIcon={false} /> : null}
            </div>
          </div>
        </Panel>
      ))}
    </div>
  );
}

export { Activity };
