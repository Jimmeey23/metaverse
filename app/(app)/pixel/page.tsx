import * as React from "react";
import { Activity, BookOpen, CircleDot, Gauge, Radio, ShieldCheck } from "lucide-react";
import { loadReport } from "@/lib/data";
import { Badge, Callout, EmptyState, Panel, PanelHeader } from "@/components/ui/primitives";
import { EventFunnel, PixelDiagnostics, PixelEventsTable, PixelOverview } from "@/components/panels/pixel-panel";
import { DataQualityAlert } from "@/components/panels/data-quality-alert";
import { compact, currency, eventLabel, num, relative } from "@/lib/format";
import { safeDiv } from "@/lib/utils";

export const dynamic = "force-dynamic";

const GUIDE = [
  {
    title: "Install the base code on every page",
    body: "Paste the base pixel snippet inside the <head> of every page of your site. Use Google Tag Manager for a no-code install.",
  },
  {
    title: "Send standard events with parameters",
    body: "Fire ViewContent, AddToCart, InitiateCheckout, Purchase and Lead with value, currency and content_ids so Meta can optimise toward real outcomes.",
  },
  {
    title: "Turn on Advanced Matching",
    body: "Pass hashed email, phone and external_id on every event. This typically lifts attributed conversions by 5–10%.",
  },
  {
    title: "Add the Conversions API",
    body: "Mirror your most important events server-side with a shared event_id so Meta can deduplicate browser and server signals.",
  },
  {
    title: "Verify domain and rank 8 events",
    body: "Under Aggregated Event Measurement, verify your domain and rank the 8 events that matter most for iOS 14.5+ traffic.",
  },
];

export default async function PixelPage({
  searchParams,
}: { searchParams: Promise<{ range?: string; since?: string; until?: string; account?: string }> }) {
  const sp = await searchParams;
  const { data } = await loadReport({ rangeKey: sp.range, since: sp.since, until: sp.until, accountId: sp.account });
  const code = data.account.currency;
  const pixel = data.pixel;

  const find = (name: string) => pixel?.events.find((e) => e.event === name);
  const pageView = find("PageView")?.count ?? 0;
  const viewContent = find("ViewContent")?.count ?? 0;
  const addToCart = find("AddToCart")?.count ?? 0;
  const checkout = find("InitiateCheckout")?.count ?? 0;
  const purchase = find("Purchase")?.count ?? 0;

  return (
    <div className="space-y-5">
      {!pixel ? (
        <Callout tone="warn" icon={<Radio className="h-4 w-4" />} title="No pixel found on this ad account">
          Pixels are created in Meta Events Manager. Once one exists and is shared with this ad account, its events and diagnostics will appear here.
        </Callout>
      ) : null}

      <DataQualityAlert warnings={data.warnings} />

      {pixel ? (
        <>
          <div className="grid gap-4 lg:grid-cols-4">
            {[
              { label: "Pixel ID", value: pixel.id, icon: <CircleDot className="h-4 w-4" />, sub: pixel.name },
              { label: "Last event received", value: relative(pixel.lastFiredTime), icon: <Radio className="h-4 w-4" />, sub: pixel.lastFiredTime ? new Date(pixel.lastFiredTime).toLocaleString() : "—" },
              {
                label: "Checks passing", value: `${pixel.diagnostics.filter((d) => d.status === "pass").length}/${pixel.diagnostics.length}`,
                icon: <ShieldCheck className="h-4 w-4" />,
                sub: `${pixel.diagnostics.filter((d) => d.status === "fail").length} failing`,
              },
              { label: "Events tracked", value: num(pixel.events.length), icon: <Activity className="h-4 w-4" />, sub: `${compact(pixel.events.reduce((a, e) => a + e.count, 0))} total events` },
            ].map((s) => (
              <Panel key={s.label} className="p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-500">{s.icon}</div>
                  <div className="min-w-0">
                    <p className="truncate text-[10px] uppercase tracking-wide text-faint">{s.label}</p>
                    <p className="truncate text-[15px] font-semibold num">{s.value}</p>
                    <p className="truncate text-[10px] text-faint">{s.sub}</p>
                  </div>
                </div>
              </Panel>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <PixelOverview pixel={pixel} code={code} />
              <Panel>
                <PanelHeader
                  title="Detailed events"
                  subtitle="Standard events received in the selected period"
                  icon={<Activity className="h-4 w-4" />}
                />
                <PixelEventsTable pixel={pixel} code={code} />
              </Panel>
            </div>

            <div className="space-y-4">
              <Panel>
                <PanelHeader title="Event funnel" subtitle="Drop-off between steps" icon={<Gauge className="h-4 w-4" />} />
                <EventFunnel pixel={pixel} />
              </Panel>

              <Panel>
                <PanelHeader title="Conversion rates" subtitle="Step-to-step performance" icon={<Gauge className="h-4 w-4" />} />
                <div className="space-y-2 px-5 pb-5 pt-4 text-[12px]">
                  {[
                    ["View content → Add to cart", safeDiv(addToCart, viewContent) * 100],
                    ["Add to cart → Checkout", safeDiv(checkout, addToCart) * 100],
                    ["Checkout → Purchase", safeDiv(purchase, checkout) * 100],
                    ["Page view → Purchase", safeDiv(purchase, pageView) * 100],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex items-center justify-between gap-3">
                      <span className="text-muted">{label}</span>
                      <span className="num font-semibold">{(value as number).toFixed(2)}%</span>
                    </div>
                  ))}
                  <div className="mt-3 rounded-xl border border-line/70 bg-ink/[0.02] px-3 py-2.5 text-[11px] text-muted">
                    Purchase value tracked: <span className="font-semibold text-ink">{currency(find("Purchase")?.value ?? 0, code, { compact: true })}</span>
                  </div>
                </div>
              </Panel>

              <Panel>
                <PanelHeader title="Diagnostics" subtitle="Automated pixel health checks" icon={<ShieldCheck className="h-4 w-4" />} />
                <PixelDiagnostics pixel={pixel} />
              </Panel>
            </div>
          </div>
        </>
      ) : (
        <Panel>
          <EmptyState icon={<Radio className="h-5 w-5" />} title="Pixel data will appear here" description="Connect a live ad account that has a pixel shared with it, or explore the demo account to see a full diagnostics report." />
        </Panel>
      )}

      {data.pixels.length > 1 ? (
        <Panel>
          <PanelHeader title="Pixels on this account" subtitle="All pixels shared with the selected ad account" icon={<CircleDot className="h-4 w-4" />} />
          <div className="space-y-2 px-5 pb-5 pt-4">
            {data.pixels.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-line/70 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium">{p.name}</p>
                  <p className="text-[10px] text-faint num">ID {p.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={p.id === pixel?.id ? "brand" : "neutral"}>{p.id === pixel?.id ? "Primary" : "Inactive"}</Badge>
                  <span className="text-[11px] text-muted">{relative(p.lastFiredTime)}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel>
        <PanelHeader title="Setup guide" subtitle="How to get the most signal out of your pixel" icon={<BookOpen className="h-4 w-4" />} />
        <ol className="space-y-3 px-5 pb-5 pt-4">
          {GUIDE.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-500/10 text-[11px] font-semibold text-brand-500">{i + 1}</span>
              <div>
                <p className="text-[13px] font-medium">{step.title}</p>
                <p className="mt-0.5 text-[12px] text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      {pixel?.events.length ? (
        <Panel>
          <PanelHeader title="Event reference" subtitle="What Meta uses each event for" icon={<Activity className="h-4 w-4" />} />
          <div className="grid gap-3 px-5 pb-5 pt-4 sm:grid-cols-2 lg:grid-cols-3">
            {pixel.events.map((e) => (
              <div key={e.event} className="rounded-xl border border-line/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-medium">{eventLabel(e.event)}</p>
                  <Badge tone={e.quality === "good" ? "pos" : e.quality === "medium" ? "warn" : "neg"}>{e.quality ?? "n/a"}</Badge>
                </div>
                <p className="mt-1 text-[11px] text-faint">
                  {num(e.count)} events · {e.matched > 0 ? `${e.matched}% match quality` : "match quality available in Events Manager"}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
