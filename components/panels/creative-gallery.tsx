"use client";

import * as React from "react";
import { Activity, ExternalLink, Eye, Image as ImageIcon, MousePointerClick, Play, Search, Target, X } from "lucide-react";
import type { AdRow } from "@/lib/types";
import { Badge, EmptyState, Panel, PanelHeader } from "@/components/ui/primitives";
import { currency, num, pct } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CreativeGallery({ ads, code }: { ads: AdRow[]; code: string }) {
  const [query, setQuery] = React.useState("");
  const [format, setFormat] = React.useState("All");
  const [location, setLocation] = React.useState("All studios");
  const [selected, setSelected] = React.useState<AdRow | null>(null);
  const locations = React.useMemo(() => ["All studios", ...new Set(ads.map((a) => a.location ?? "Unassigned"))], [ads]);
  const formats = React.useMemo(() => ["All", ...new Set(ads.map((a) => a.creative?.videoId ? "Video" : "Image"))], [ads]);
  const visible = ads.filter((ad) => {
    const haystack = `${ad.name} ${ad.adSetName} ${ad.creative?.title ?? ""} ${ad.creative?.body ?? ""}`.toLowerCase();
    return (!query || haystack.includes(query.toLowerCase()))
      && (format === "All" || (ad.creative?.videoId ? "Video" : "Image") === format)
      && (location === "All studios" || ad.location === location);
  });

  React.useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => event.key === "Escape" && setSelected(null);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", close);
    };
  }, [selected]);

  const media = (ad: AdRow, expanded = false) => {
    if (expanded && ad.creative?.videoUrl) {
      return <video src={ad.creative.videoUrl} poster={ad.creative.thumbnail} controls playsInline preload="metadata" onError={(event) => event.stopPropagation()} className="max-h-[68vh] h-full w-full object-contain" />;
    }
    if (ad.creative?.imageUrl || ad.creative?.thumbnail) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={expanded ? ad.creative.imageUrl ?? ad.creative.thumbnail : ad.creative.thumbnail ?? ad.creative.imageUrl} alt={`Creative for ${ad.name}`} loading={expanded ? "eager" : "lazy"} onError={(event) => event.stopPropagation()} className={cn("h-full w-full object-contain", expanded && "max-h-[68vh]")} />;
    }
    return <div className={cn("grid place-items-center text-center text-faint", expanded ? "aspect-video text-white/60" : "h-full px-5 text-xs")}><div><ImageIcon className="mx-auto mb-2 h-7 w-7" /><span>Media unavailable from Meta</span></div></div>;
  };

  return (
    <>
      <Panel>
        <PanelHeader title="Creative library" subtitle={`${visible.length} ads with performance and studio context`} icon={<ImageIcon className="h-4 w-4" />} />
        <div className="flex flex-wrap gap-2 px-5 pt-4">
          <label className="relative min-w-[220px] flex-1">
            <span className="sr-only">Search creatives</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search creative, ad or ad set" className="h-11 w-full rounded-xl border border-line bg-bg pl-9 pr-3 text-sm outline-none focus:border-brand-500" />
          </label>
          <select aria-label="Creative format" value={format} onChange={(e) => setFormat(e.target.value)} className="h-11 rounded-xl border border-line bg-bg px-3 text-xs outline-none focus:border-brand-500">
            {formats.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select aria-label="Studio location" value={location} onChange={(e) => setLocation(e.target.value)} className="h-11 rounded-xl border border-line bg-bg px-3 text-xs outline-none focus:border-brand-500">
            {locations.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <p className="px-5 pt-2 text-[10px] text-faint">Studio is derived from entity naming. Rename unassigned Meta entities with Bandra, Kemps, Bengaluru/BLR, or Mumbai to classify them.</p>
        <div className="grid gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {visible.slice(0, 60).map((ad) => (
            <button key={ad.id} onClick={() => setSelected(ad)} aria-label={`Open creative and performance details for ${ad.name}`} className="group relative overflow-visible rounded-2xl border border-line bg-elevated/40 text-left transition duration-200 hover:z-10 hover:-translate-y-1 hover:scale-[1.035] hover:border-brand-500/40 hover:bg-surface hover:shadow-lift focus:z-10 focus:outline-none focus:ring-2 focus:ring-brand-500 motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100">
              <div className="relative aspect-video overflow-hidden bg-ink/5">
                <div className="h-full w-full transition duration-300 group-hover:scale-[1.06] motion-reduce:transition-none">{media(ad)}</div>
                {ad.creative?.videoId ? <span className="absolute inset-0 grid place-items-center bg-black/10"><span className="grid h-11 w-11 place-items-center rounded-full bg-black/70 text-white"><Play className="ml-0.5 h-4 w-4" fill="currentColor" /></span></span> : null}
                <span className="absolute left-2 top-2"><Badge tone="neutral">{ad.creative?.videoId ? "Video" : "Image"}</Badge></span>
                <span className="absolute bottom-2 right-2 rounded-lg bg-black/75 px-2 py-1 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100 group-focus:opacity-100">View details</span>
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2"><p className="line-clamp-2 text-[13px] font-semibold">{ad.creative?.title ?? ad.name}</p><Badge tone="brand">{ad.location ?? "Unassigned"}</Badge></div>
                <p className="mt-1 line-clamp-2 text-[11px] text-muted">{ad.creative?.body || ad.adSetName}</p>
                <div className="mt-3 grid grid-cols-4 gap-2 border-t border-line/70 pt-2 text-center">
                  {[["Spend", currency(ad.spend, code, { compact: true })], ["CTR", pct(ad.ctr)], ["Results", num(ad.results)], ["CPA", currency(ad.costPerResult, code, { compact: true })]].map(([label, value]) => <div key={label}><p className="num text-[11px] font-semibold">{value}</p><p className="text-[9px] uppercase text-faint">{label}</p></div>)}
                </div>
              </div>
            </button>
          ))}
          {!visible.length ? <div className="sm:col-span-2 xl:col-span-3"><EmptyState icon={<ImageIcon className="h-5 w-5" />} title="No creatives match these filters" /></div> : null}
        </div>
      </Panel>

      {selected ? (
        <div role="dialog" aria-modal="true" aria-label={`Creative details for ${selected.name}`} className="fixed inset-0 z-[100] grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="max-h-[92vh] w-full max-w-5xl overflow-auto rounded-2xl border border-line bg-surface shadow-lift">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface/95 px-5 py-3 backdrop-blur"><div><p className="text-sm font-semibold">{selected.creative?.title ?? selected.name}</p><p className="text-[11px] text-faint">{selected.location} · {selected.adSetName}</p></div><button aria-label="Close creative details" onClick={() => setSelected(null)} className="grid h-11 w-11 place-items-center rounded-xl hover:bg-ink/5"><X className="h-4 w-4" /></button></div>
            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
              <div className="overflow-hidden rounded-2xl bg-black">{media(selected, true)}</div>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2"><Badge tone="neutral">{selected.status}</Badge><Badge tone="brand">{selected.creative?.format ?? "Ad"}</Badge>{selected.creative?.cta ? <Badge tone="neutral">{selected.creative.cta.replaceAll("_", " ")}</Badge> : null}</div>
                <div><p className="text-[10px] font-semibold uppercase tracking-wide text-faint">Primary text</p><p className="mt-1 text-sm leading-relaxed text-muted">{selected.creative?.body || "No primary text returned."}</p></div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">{[
                  ["Spend", currency(selected.spend, code), Activity], ["Impressions", num(selected.impressions), Eye],
                  ["Reach", num(selected.reach), Target], ["Clicks", num(selected.clicks), MousePointerClick],
                  ["CTR", pct(selected.ctr), MousePointerClick], ["CPC", currency(selected.cpc, code), Activity],
                  [selected.resultLabel || "Results", num(selected.results), Target], ["Cost / result", currency(selected.costPerResult, code), Activity],
                  ["CPM", currency(selected.cpm, code), Eye], ["Frequency", selected.frequency.toFixed(2), Eye],
                  ["Revenue", currency(selected.revenue, code), Activity], ["ROAS", selected.roas > 0 ? `${selected.roas.toFixed(2)}×` : "—", Target],
                  ["Leads", num(selected.leads), Target], ["Purchases", num(selected.purchases), Target],
                ].map(([label, value, Icon]) => <div key={String(label)} className="rounded-xl border border-line p-3"><div className="flex items-center gap-1.5 text-faint"><Icon className="h-3 w-3" /><p className="text-[9px] uppercase">{label as string}</p></div><p className="num mt-1 text-sm font-semibold">{value as string}</p></div>)}</div>
                <div className="rounded-xl border border-line p-3 text-[11px]"><p className="font-semibold">Delivery quality</p><div className="mt-2 grid gap-1 text-muted"><p>Quality: <span className="text-ink">{selected.qualityRanking?.replaceAll("_", " ") ?? "Not ranked"}</span></p><p>Engagement: <span className="text-ink">{selected.engagementRanking?.replaceAll("_", " ") ?? "Not ranked"}</span></p><p>Conversion: <span className="text-ink">{selected.conversionRanking?.replaceAll("_", " ") ?? "Not ranked"}</span></p></div></div>
                {selected.creative?.permalink ? <a href={selected.creative.permalink} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line text-xs font-semibold hover:border-brand-500/40"><ExternalLink className="h-4 w-4" /> Open original on Meta</a> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
