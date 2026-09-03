"use client";

import * as React from "react";
import { ExternalLink, Image as ImageIcon, Play, Search, X } from "lucide-react";
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
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [selected]);

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
            <button key={ad.id} onClick={() => setSelected(ad)} className="group overflow-hidden rounded-2xl border border-line bg-elevated/40 text-left transition hover:border-brand-500/35 hover:shadow-lift focus:outline-none focus:ring-2 focus:ring-brand-500">
              <div className="relative aspect-video overflow-hidden bg-ink/5">
                {ad.creative?.thumbnail || ad.creative?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={ad.creative.thumbnail ?? ad.creative.imageUrl} alt={`Creative preview for ${ad.name}`} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                ) : <div className="grid h-full place-items-center"><ImageIcon className="h-8 w-8 text-faint" /></div>}
                {ad.creative?.videoId ? <span className="absolute inset-0 grid place-items-center bg-black/10"><span className="grid h-11 w-11 place-items-center rounded-full bg-black/70 text-white"><Play className="ml-0.5 h-4 w-4" fill="currentColor" /></span></span> : null}
                <span className="absolute left-2 top-2"><Badge tone="neutral">{ad.creative?.videoId ? "Video" : "Image"}</Badge></span>
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
            <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
              <div className="overflow-hidden rounded-2xl bg-black">
                {selected.creative?.videoUrl ? <video src={selected.creative.videoUrl} poster={selected.creative.thumbnail} controls playsInline preload="metadata" className="max-h-[68vh] w-full" />
                  : selected.creative?.imageUrl || selected.creative?.thumbnail ? <img src={selected.creative.imageUrl ?? selected.creative.thumbnail} alt={`Full creative for ${selected.name}`} className="max-h-[68vh] w-full object-contain" />
                  : <div className="grid aspect-video place-items-center text-white/60">Media is not exposed by Meta for this ad.</div>}
              </div>
              <div className="space-y-4">
                <div><p className="text-[10px] font-semibold uppercase tracking-wide text-faint">Primary text</p><p className="mt-1 text-sm leading-relaxed text-muted">{selected.creative?.body || "No primary text returned."}</p></div>
                <div className="grid grid-cols-2 gap-2">{[["Spend", currency(selected.spend, code)], ["Impressions", num(selected.impressions)], ["CTR", pct(selected.ctr)], ["CPC", currency(selected.cpc, code)], ["Results", num(selected.results)], ["CPA", currency(selected.costPerResult, code)], ["ROAS", `${selected.roas.toFixed(2)}×`], ["Frequency", selected.frequency.toFixed(2)]].map(([label, value]) => <div key={label} className="rounded-xl border border-line p-3"><p className="text-[9px] uppercase text-faint">{label}</p><p className="num mt-0.5 text-sm font-semibold">{value}</p></div>)}</div>
                {selected.creative?.permalink ? <a href={selected.creative.permalink} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line text-xs font-semibold hover:border-brand-500/40"><ExternalLink className="h-4 w-4" /> Open original on Meta</a> : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
