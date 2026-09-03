import { NextResponse } from "next/server";
import { loadReport } from "@/lib/data";

export const dynamic = "force-dynamic";

function n(value: number, decimals = 2) {
  if (!isFinite(value)) return "";
  return Number.isInteger(value) ? String(value) : value.toFixed(decimals);
}

function escape(value: unknown) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { data } = await loadReport({
    rangeKey: url.searchParams.get("range") ?? undefined,
    since: url.searchParams.get("since") ?? undefined,
    until: url.searchParams.get("until") ?? undefined,
    accountId: url.searchParams.get("account") ?? undefined,
  });

  const sections: string[] = [];
  sections.push("MetaInsight export");
  sections.push(`Account,${escape(data.account.name)} (${data.account.id})`);
  sections.push(`Period,${data.range.since} to ${data.range.until}`);
  sections.push(`Mode,${data.mode}`);
  sections.push("");

  sections.push("KEY METRICS");
  sections.push("Metric,Value,Previous period,Change %");
  const rows: [string, number, number, number?][] = [
    ["Spend", data.kpis.spend, data.prevKpis.spend],
    ["Impressions", data.kpis.impressions, data.prevKpis.impressions, 0],
    ["Reach", data.kpis.reach, data.prevKpis.reach, 0],
    ["Frequency", data.kpis.frequency, data.prevKpis.frequency],
    ["Clicks", data.kpis.clicks, data.prevKpis.clicks, 0],
    ["CTR %", data.kpis.ctr, data.prevKpis.ctr],
    ["CPC", data.kpis.cpc, data.prevKpis.cpc],
    ["CPM", data.kpis.cpm, data.prevKpis.cpm],
    ["Results (all objectives)", data.kpis.results, data.prevKpis.results],
    ["Conversions (leads + purchases)", data.kpis.leads + data.kpis.purchases, data.prevKpis.leads + data.prevKpis.purchases, 0],
    ["Cost per conversion", 0, 0],
    ["Cost per result", data.kpis.costPerResult, data.prevKpis.costPerResult],
    ["Revenue", data.kpis.revenue, data.prevKpis.revenue],
    ["ROAS", data.kpis.roas, data.prevKpis.roas],
    ["Leads", data.kpis.leads, data.prevKpis.leads],
    ["Purchases", data.kpis.purchases, data.prevKpis.purchases],
  ];
  const conv = data.kpis.leads + data.kpis.purchases;
  const prevConv = data.prevKpis.leads + data.prevKpis.purchases;
  rows.forEach((row) => {
    if (row[0] === "Cost per conversion") {
      row[1] = conv ? data.kpis.spend / conv : 0;
      row[2] = prevConv ? data.prevKpis.spend / prevConv : 0;
    }
  });
  for (const [label, value, prev, decimals = 4] of rows) {
    const change = prev ? ((value - prev) / prev) * 100 : 0;
    sections.push([escape(label), n(value, decimals), n(prev, decimals), prev ? change.toFixed(2) : ""].join(","));
  }
  sections.push("");

  sections.push("DAILY SERIES");
  sections.push("Date,Spend,Impressions,Clicks,Results,Revenue,Leads,Purchases");
  for (const s of data.series) {
    sections.push([s.date, n(s.spend), Math.round(s.impressions), Math.round(s.clicks), n(s.results), n(s.revenue), n(s.leads), n(s.purchases)].join(","));
  }
  sections.push("");

  sections.push("CAMPAIGNS");
  sections.push("Campaign,Status,Objective,Spend,Impressions,Reach,Frequency,Clicks,CTR %,CPC,CPM,Results,Cost per result,Revenue,ROAS,Leads,Purchases");
  for (const c of data.campaigns) {
    sections.push([escape(c.name), c.status, c.objective, c.spend.toFixed(2), c.impressions, c.reach, c.frequency.toFixed(2), c.clicks, c.ctr.toFixed(3), c.cpc.toFixed(2), c.cpm.toFixed(2), c.results.toFixed(2), c.costPerResult.toFixed(2), c.revenue.toFixed(2), c.roas.toFixed(2), c.leads.toFixed(2), c.purchases.toFixed(2)].join(","));
  }
  sections.push("");

  sections.push("AD SETS");
  sections.push("Campaign,Ad set,Status,Spend,Impressions,Clicks,Results,Cost per result,Revenue,ROAS");
  for (const a of data.adSets) {
    sections.push([escape(a.campaignName), escape(a.name), a.status, n(a.spend), a.impressions, a.clicks, n(a.results), n(a.costPerResult), n(a.revenue), n(a.roas)].join(","));
  }
  sections.push("");

  sections.push("ADS");
  sections.push("Ad,Ad set,Headline,Format,Status,Spend,Impressions,Clicks,CTR %,Results,Cost per result,Revenue,ROAS");
  for (const a of data.ads) {
    sections.push([escape(a.name), escape(a.adSetName), escape(a.creative?.title ?? ""), escape(a.creative?.format ?? ""), a.status, n(a.spend), a.impressions, a.clicks, n(a.ctr, 3), n(a.results), n(a.costPerResult), n(a.revenue), n(a.roas)].join(","));
  }
  sections.push("");

  for (const bd of Object.values(data.breakdowns)) {
    sections.push(`BREAKDOWN - ${bd.label.toUpperCase()}`);
    sections.push("Segment,Spend,Impressions,Clicks,CTR %,CPC,CPM,Results,Cost per result,Revenue,ROAS");
    for (const r of bd.rows) {
      sections.push([escape(r.key), n(r.spend), r.impressions, r.clicks, n(r.ctr, 3), n(r.cpc), n(r.cpm), n(r.results), n(r.costPerResult), n(r.revenue), n(r.roas)].join(","));
    }
    sections.push("");
  }

  if (data.leads.length) {
    sections.push("LEADS");
    sections.push("Created,Name,Email,Phone,City,Intent,Form,Campaign,Ad,Platform,Organic");
    for (const l of data.leads) {
      sections.push([l.createdTime, escape(l.fullName), escape(l.email), escape(l.phone), escape(l.city), l.intent, escape(l.formName), escape(l.campaignName ?? ""), escape(l.adName ?? ""), l.platform, String(l.isOrganic)].join(","));
    }
    sections.push("");
  }

  if (data.pixel) {
    sections.push("PIXEL EVENTS");
    sections.push("Event,Count,Value,Change %,Match quality");
    for (const e of data.pixel.events) sections.push([e.event, e.count, e.value ?? "", e.delta, `${e.matched}%`].join(","));
    sections.push("");
    sections.push("PIXEL DIAGNOSTICS");
    sections.push("Check,Status,Detail");
    for (const d of data.pixel.diagnostics) sections.push([escape(d.title), d.status, escape(d.detail)].join(","));
  }

  return new NextResponse(sections.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="metainsight-${data.account.id}-${data.range.since}_${data.range.until}.csv"`,
    },
  });
}
