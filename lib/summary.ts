import type { Insight, ReportData } from "./types";
import { currency, num, pct } from "./format";
import { longDate, objectiveLabel } from "./format";
import { pctChange, safeDiv, sum } from "./utils";

export type Summary = {
  tone: "positive" | "mixed" | "negative";
  headline: string;
  paragraphs: string[];
  highlights: { icon: "up" | "down" | "flat" | "star" | "alert"; label: string; text: string }[];
  risks: string[];
  nextSteps: { title: string; action: string }[];
};

const word = (n: number) => (n > 0 ? "rose" : n < 0 ? "fell" : "held flat");

export function buildSummary(data: ReportData, insights: Insight[]): Summary {
  const code = data.account.currency;
  const money = (v: number) => currency(v, code, { compact: true });
  const k = data.kpis;
  const p = data.prevKpis;

  const spendDelta = pctChange(k.spend, p.spend) ?? 0;
  const conv = k.leads + k.purchases;
  const prevConv = p.leads + p.purchases;
  const resultsDelta = pctChange(conv, prevConv) ?? 0;
  const cpaDelta = pctChange(k.costPerResult, p.costPerResult) ?? 0;
  const roasDelta = pctChange(k.roas, p.roas) ?? 0;
  const ctrDelta = pctChange(k.ctr, p.ctr) ?? 0;
  const cpmDelta = pctChange(k.cpm, p.cpm) ?? 0;

  const tone: Summary["tone"] =
    (resultsDelta > 5 && cpaDelta < 5) || (roasDelta > 8 && cpaDelta <= 5)
      ? "positive"
      : cpaDelta > 18 || resultsDelta < -10
        ? "negative"
        : "mixed";

  /* ── Headline ─────────────────────────────────────────────── */
  const topBySpend = [...data.campaigns].sort((a, b) => b.spend - a.spend)[0];
  const topByResults = [...data.campaigns].sort((a, b) => b.results - a.results)[0];
  const resultNoun = "conversions";

  const headline =
    data.campaigns.length === 0 || k.spend === 0
      ? `No delivery was recorded for ${data.account.name} between ${longDate(data.range.since)} and ${longDate(data.range.until)}.`
      : `Spend ${word(spendDelta)} ${pct(Math.abs(spendDelta), 0)} to ${money(k.spend)} while ${resultNoun} moved ${resultsDelta >= 0 ? "up" : "down"} ${pct(Math.abs(resultsDelta), 0)} to ${num(conv)} — ` +
        `cost per conversion ${cpaDelta >= 0 ? "increased" : "improved"} to ${money(safeDiv(k.spend, conv))} (${cpaDelta >= 0 ? "+" : ""}${pct(cpaDelta, 0)})` +
        (k.roas > 0 ? ` at ${k.roas.toFixed(2)}× ROAS` : "") +
        (topBySpend ? `, led by “${topBySpend.name}” at ${money(topBySpend.spend)}.` : ".");

  /* ── Supporting paragraphs ────────────────────────────────── */
  const paragraphs: string[] = [];

  if (data.series.length > 6) {
    const half = Math.floor(data.series.length / 2);
    const first = sum(data.series.slice(0, half).map((s) => s.spend));
    const second = sum(data.series.slice(half).map((s) => s.spend));
    const shift = pctChange(second, first) ?? 0;
    paragraphs.push(
      `Delivery ${Math.abs(shift) < 5 ? "was steady" : `${shift > 0 ? "accelerated" : "slowed"} ${pct(Math.abs(shift), 0)}`} across the period — the second half ${shift >= 0 ? "outspent" : "trailed"} the first (${money(second)} vs ${money(first)}), averaging ${money(safeDiv(k.spend, data.range.days))} per day.`,
    );
  }

  if (topByResults && topByResults.results > 0) {
    const share = safeDiv(topByResults.results, k.results) * 100;
    paragraphs.push(
      `“${topByResults.name}” (${objectiveLabel(topByResults.objective)}) produced ${num(topByResults.results)} ${resultNoun} — ${pct(share, 0)} of all results — at ${money(topByResults.costPerResult)} each${topByResults.roas > 0 ? ` and ${topByResults.roas.toFixed(2)}× ROAS` : ""}.`,
    );
  }

  const platform = (data.breakdowns.publisher_platform?.rows ?? []).slice().sort((a, b) => b.spend - a.spend)[0];
  const bestSegment = (data.breakdowns["age,gender"]?.rows ?? []).filter((r) => r.results > 0).sort((a, b) => a.costPerResult - b.costPerResult)[0];
  if (platform || bestSegment) {
    const parts: string[] = [];
    if (platform) parts.push(`${platform.key} absorbed ${pct(safeDiv(platform.spend, k.spend) * 100, 0)} of spend`);
    if (bestSegment) parts.push(`${bestSegment.key} converted cheapest at ${money(bestSegment.costPerResult)} per result`);
    paragraphs.push(`${parts.join(", and ")}.`);
  }

  if (data.leads.length) {
    const hot = data.leads.filter((l) => l.intent === "Hot").length;
    paragraphs.push(
      `${num(data.leads.length)} leads were captured (${money(safeDiv(k.spend, data.leads.length))} each), ${pct(safeDiv(hot, data.leads.length) * 100, 0)} of them high-intent. Landing pages converted ${pct(safeDiv(data.leads.length || k.leads, k.landingPageViews) * 100, 1)} of visitors.`,
    );
  }

  if (data.pixel && data.pixel.events.length) {
    const failing = data.pixel.diagnostics.filter((d) => d.status !== "pass").length;
    paragraphs.push(
      `Tracking: ${data.pixel.events.length} standard events are firing (last seen ${data.pixel.lastFiredTime ? new Date(data.pixel.lastFiredTime).toLocaleString() : "—"}), with ${failing} of ${data.pixel.diagnostics.length} health checks needing attention.`,
    );
  }

  /* ── Highlights ───────────────────────────────────────────── */
  const highlights: Summary["highlights"] = [
    {
      icon: spendDelta >= 0 ? "up" : "down",
      label: "Spend",
      text: `${money(k.spend)} (${spendDelta >= 0 ? "+" : ""}${pct(spendDelta, 1)} vs previous period)`,
    },
    {
      icon: resultsDelta >= 0 ? "up" : "down",
      label: "Conversions",
      text: `${num(conv)} leads + purchases (${resultsDelta >= 0 ? "+" : ""}${pct(resultsDelta, 1)})`,
    },
    {
      icon: cpaDelta <= 0 ? "up" : "down",
      label: "Cost per conversion",
      text: `${money(safeDiv(k.spend, conv))} (${cpaDelta >= 0 ? "+" : ""}${pct(cpaDelta, 1)})`,
    },
    {
      icon: ctrDelta >= 0 ? "up" : "down",
      label: "CTR · CPM",
      text: `${pct(k.ctr)} (${ctrDelta >= 0 ? "+" : ""}${pct(ctrDelta, 1)}) · CPM ${money(k.cpm)} (${cpmDelta >= 0 ? "+" : ""}${pct(cpmDelta, 1)})`,
    },
  ];
  if (k.roas > 0) {
    highlights.push({ icon: roasDelta >= 0 ? "star" : "down", label: "ROAS", text: `${k.roas.toFixed(2)}× on ${money(k.revenue)} revenue (${roasDelta >= 0 ? "+" : ""}${pct(roasDelta, 1)})` });
  }

  /* ── Risks & next steps ───────────────────────────────────── */
  const risks = insights
    .filter((i) => i.severity === "critical" || i.severity === "warning")
    .slice(0, 4)
    .map((i) => i.title);

  const nextSteps = insights
    .sort((a, b) => {
      const order = { critical: 0, warning: 1, opportunity: 2, info: 3 };
      return order[a.severity] - order[b.severity];
    })
    .slice(0, 3)
    .map((i) => ({ title: i.title, action: i.action }));

  return { tone, headline, paragraphs, highlights, risks, nextSteps };
}

export function summaryToText(data: ReportData, summary: Summary) {
  const lines = [
    `${data.account.name} — ${longDate(data.range.since)} to ${longDate(data.range.until)}`,
    "",
    summary.headline,
    "",
    ...summary.paragraphs,
    "",
    "Highlights",
    ...summary.highlights.map((h) => `• ${h.label}: ${h.text}`),
  ];
  if (summary.risks.length) lines.push("", "Risks", ...summary.risks.map((r) => `• ${r}`));
  if (summary.nextSteps.length) lines.push("", "Next steps", ...summary.nextSteps.map((s) => `• ${s.title} — ${s.action}`));
  return lines.join("\n");
}
