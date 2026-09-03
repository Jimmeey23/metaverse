"use client";
import * as React from "react";
import { TrendChart } from "@/components/charts";
import { Panel, PanelHeader } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { SeriesPoint } from "@/lib/types";

const METRICS = [
  { key: "spend", label: "Spend", type: "currency" as const, color: "hsl(var(--chart-1))" },
  { key: "conversions", label: "Conversions", type: "number" as const, color: "hsl(var(--chart-2))" },
  { key: "results", label: "Results (all)", type: "number" as const, color: "hsl(var(--chart-6))" },
  { key: "impressions", label: "Impressions", type: "compact" as const, color: "hsl(var(--chart-3))" },
  { key: "clicks", label: "Clicks", type: "compact" as const, color: "hsl(var(--chart-4))" },
  { key: "ctr", label: "CTR", type: "percent" as const, color: "hsl(var(--chart-5))" },
  { key: "cpc", label: "CPC", type: "currency" as const, color: "hsl(var(--chart-6))" },
  { key: "cpm", label: "CPM", type: "currency" as const, color: "hsl(var(--chart-1))" },
  { key: "roas", label: "ROAS", type: "ratio" as const, color: "hsl(var(--chart-2))" },
  { key: "revenue", label: "Revenue", type: "currency" as const, color: "hsl(var(--chart-4))" },
];

export function TrendExplorer({ series, prevSeries, code, className }: { series: SeriesPoint[]; prevSeries: SeriesPoint[]; code: string; className?: string }) {
  const [key, setKey] = React.useState<string>("spend");
  const [compare, setCompare] = React.useState(true);
  const metric = METRICS.find((m) => m.key === key) ?? METRICS[0];

  const data = React.useMemo(() => {
    const valueOf = (point: SeriesPoint, key: string) =>
      key === "conversions" ? point.leads + point.purchases : (point[key as keyof SeriesPoint] as number);
    return series.map((point, i) => ({
      date: point.date,
      [metric.key]: valueOf(point, metric.key),
      previous: prevSeries[i] ? valueOf(prevSeries[i], metric.key) : undefined,
    }));
  }, [series, prevSeries, metric.key]);

  return (
    <Panel className={cn("overflow-hidden", className)}>
      <PanelHeader
        title="Performance trend"
        subtitle="Daily movement for the selected metric"
        right={
          <button
            onClick={() => setCompare((c) => !c)}
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition",
              compare ? "border-brand-500/40 bg-brand-500/10 text-brand-500" : "border-line text-muted hover:text-ink",
            )}
          >
            Compare previous
          </button>
        }
      />
      <div className="flex flex-wrap gap-1.5 px-5 pt-4">
        {METRICS.map((m) => (
          <button
            key={m.key}
            onClick={() => setKey(m.key)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[11px] font-medium transition",
              m.key === key ? "bg-ink text-bg" : "bg-ink/5 text-muted hover:bg-ink/10 hover:text-ink",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="px-2 pb-3 pt-2">
        <TrendChart
          data={data}
          code={code}
          type={metric.type}
          height={300}
          keys={[{ key: metric.key, label: metric.label, color: metric.color }]}
          compare={compare ? { key: "previous", label: "Previous period", color: "hsl(var(--faint))" } : undefined}
        />
      </div>
    </Panel>
  );
}
