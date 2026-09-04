import type {
  Account, AdRow, AdSetRow, Breakdown, CampaignRow, FunnelStep, Lead, LeadForm,
  PixelConfig, PixelDiagnostic, PixelEvent, Range, ReportData, SeriesPoint,
} from "./types";
import { getEdge, getInsights, graphRequest } from "./meta";
import {
  costForAction, deriveKpis, emptyKpis, pickResult, roasFrom, sumActions, sumActionValues,
  toBreakdownRows, toNumber, type Action,
} from "./metrics";
import { hourFromKey, daysInRange } from "./metrics";
import { previousRange } from "./ranges";
import { inferStudioLocation, safeDiv, sum } from "./utils";

const BASE_FIELDS = [
  "spend", "impressions", "reach", "frequency", "clicks", "ctr", "cpc", "cpm", "cpp",
  "actions", "action_values", "cost_per_action_type", "purchase_roas", "website_purchase_roas",
  "outbound_clicks", "inline_link_clicks", "video_thruplay_watched_actions",
].join(",");

const RANKING_FIELDS = ",quality_ranking,engagement_rate_ranking,conversion_rate_ranking";

const LEAD_TYPES = ["onsite_conversion.lead_grouped", "lead", "offsite_conversion.fb_pixel_lead", "onsite_conversion.lead"];
const PURCHASE_TYPES = ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase", "onsite_conversion.purchase"];
const PIXEL_EVENT_MAP: Record<string, string> = {
  "offsite_conversion.fb_pixel_view_content": "ViewContent",
  "offsite_conversion.fb_pixel_add_to_cart": "AddToCart",
  "offsite_conversion.fb_pixel_initiate_checkout": "InitiateCheckout",
  "offsite_conversion.fb_pixel_purchase": "Purchase",
  "offsite_conversion.fb_pixel_lead": "Lead",
  "offsite_conversion.fb_pixel_complete_registration": "CompleteRegistration",
  "offsite_conversion.fb_pixel_search": "Search",
  "offsite_conversion.fb_pixel_add_to_wishlist": "AddToWishlist",
  "offsite_conversion.fb_pixel_page_view": "PageView",
};

type Ctx = { warnings: string[] };

async function safe<T>(ctx: Ctx, label: string, fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    ctx.warnings.push(`${label}: ${msg}`);
    return fallback;
  }
}

function ranking(v: unknown) {
  if (typeof v !== "string") return null;
  return v as CampaignRow["qualityRanking"];
}

function metricsFrom(row: any, objective?: string) {
  const actions = (row.actions ?? []) as Action[];
  const values = (row.action_values ?? []) as Action[];
  const costs = (row.cost_per_action_type ?? []) as Action[];
  const result = pickResult(objective, actions);
  const revenue = sumActionValues(values, PURCHASE_TYPES);
  const leads = sumActions(actions, LEAD_TYPES);
  const purchases = sumActions(actions, PURCHASE_TYPES);
  const landingPageViews = sumActions(actions, ["landing_page_view", "offsite_conversion.fb_pixel_page_view"]);
  const videoViews = sumActions(actions, ["video_thruplay_watched_actions", "video_view", "video_p25_watched_actions"]);
  const spend = toNumber(row.spend);
  return {
    spend,
    impressions: toNumber(row.impressions),
    reach: toNumber(row.reach),
    frequency: toNumber(row.frequency) || safeDiv(toNumber(row.impressions), toNumber(row.reach)),
    clicks: toNumber(row.clicks),
    leads,
    purchases,
    revenue,
    results: result.value,
    resultLabel: result.label,
    costPerResult: costForAction(costs, result.type) || safeDiv(spend, result.value),
    roas: roasFrom(row.website_purchase_roas as Action[]) || roasFrom(row.purchase_roas as Action[]) || safeDiv(revenue, spend),
    landingPageViews,
    videoViews,
    outboundClicks: sumActions(row.outbound_clicks as Action[], ["outbound_click"]) || toNumber(row.inline_link_clicks),
    _actions: actions,
    _values: values,
  };
}

function kpiFrom(row: any, objective?: string) {
  const m = metricsFrom(row, objective);
  const { _actions, _values, ...rest } = m;
  return deriveKpis(rest);
}

function seriesFrom(rows: any[], objective?: string): SeriesPoint[] {
  return rows.map((r) => {
    const m = metricsFrom(r, objective);
    return {
      date: (r.date_start ?? r.date_stop ?? "").slice(0, 10),
      spend: m.spend,
      impressions: m.impressions,
      reach: m.reach,
      clicks: m.clicks,
      ctr: safeDiv(m.clicks, m.impressions) * 100,
      cpc: safeDiv(m.spend, m.clicks),
      cpm: safeDiv(m.spend, m.impressions) * 1000,
      results: m.results,
      revenue: m.revenue,
      roas: m.roas,
      leads: m.leads,
      purchases: m.purchases,
    };
  });
}

/* ─────────────────────────── Leads ─────────────────────────── */

function fieldData(fields: any[], keys: string[]) {
  for (const key of keys) {
    const hit = fields?.find((f) => String(f.name).toLowerCase() === key || String(f.name).toLowerCase().includes(key));
    if (hit?.values?.length) return String(hit.values[0]);
  }
  return "";
}

function mapLead(row: any, formName: string, formId: string): Lead {
  const fd = (row.field_data ?? []) as { name: string; values: string[] }[];
  const fullName = fieldData(fd, ["full_name", "full name", "name"]) || `${fieldData(fd, ["first_name", "first name"])} ${fieldData(fd, ["last_name", "last name"])}`.trim();
  const email = fieldData(fd, ["email", "e-mail"]);
  const phone = fieldData(fd, ["phone_number", "phone", "mobile", "contact"]);
  const city = fieldData(fd, ["city", "location", "town"]);
  const company = fieldData(fd, ["company", "business", "organisation"]);
  const budget = fieldData(fd, ["budget", "investment", "ticket"]);
  const score = (email ? 1 : 0) + (phone ? 1 : 0) + (company ? 1 : 0) + (budget ? 1 : 0);
  return {
    id: String(row.id),
    createdTime: row.created_time,
    formId: String(row.form_id ?? formId),
    formName,
    campaignId: row.campaign_id ? String(row.campaign_id) : undefined,
    campaignName: row.campaign_name,
    adId: row.ad_id ? String(row.ad_id) : undefined,
    adName: row.ad_name,
    adSetName: row.adset_name,
    platform: row.platform ?? "facebook",
    isOrganic: Boolean(row.is_organic),
    fullName: fullName || "Unknown",
    email,
    phone,
    city: city || "—",
    company: company || undefined,
    budget: budget || undefined,
    intent: score >= 3 ? "Hot" : score >= 2 ? "Warm" : "Cold",
    fields: fd.map((f) => ({ name: f.name, values: f.values ?? [] })),
  };
}

async function fetchLeads(ctx: Ctx, token: string, range: Range) {
  const since = Math.floor(Date.parse(`${range.since}T00:00:00Z`) / 1000);
  const until = Math.floor(Date.parse(`${range.until}T23:59:59Z`) / 1000);
  const pages = await safe<any[]>(ctx, "Pages", () =>
    getEdge(token, "me", "accounts", { fields: "id,name,access_token,tasks", limit: 100 }), []);

  const forms: LeadForm[] = [];
  const leads: Lead[] = [];
  let fetched = 0;

  for (const page of pages) {
    const pageToken = (page.access_token as string) || token;
    let pageForms: any[] = [];
    try {
      pageForms = await getEdge(pageToken, String(page.id), "leadgen_forms", {
        fields: "id,name,status,leads_count,created_time,locale,questions{id,label,type}",
        limit: 100,
      });
    } catch (err) {
      // Ad-account access does not guarantee lead access for every associated
      // Page. Skip an inaccessible Page without failing all form discovery.
      const message = err instanceof Error ? err.message : String(err);
      if (!message.toLowerCase().includes("insufficient privileges")) {
        ctx.warnings.push(`Lead forms (${page.name ?? page.id}): ${message}`);
      }
      continue;
    }
    for (const form of pageForms) {
      forms.push({
        id: String(form.id),
        name: form.name ?? "Untitled form",
        status: form.status ?? "ACTIVE",
        leadsCount: Number(form.leads_count ?? 0),
        pageId: String(page.id),
        pageName: page.name ?? "Page",
        locale: form.locale,
        createdTime: form.created_time,
        questionsCount: form.questions?.data?.length,
      });
      if (fetched >= 6) continue;
      const rows = await safe<any[]>(ctx, `Leads (${form.name})`, () =>
        getEdge(pageToken, String(form.id), "leads", {
          fields: "id,created_time,ad_id,ad_name,adset_name,campaign_id,campaign_name,form_id,platform,is_organic,field_data",
          limit: 500,
          filtering: [{ field: "time_created", operator: "GREATER_THAN", value: since }, { field: "time_created", operator: "LESS_THAN", value: until }],
        }), []);
      fetched += 1;
      for (const row of rows) leads.push(mapLead(row, form.name, form.id, ));
    }
  }
  leads.sort((a, b) => (a.createdTime < b.createdTime ? 1 : -1));
  // Guard against unbounded payloads on very high-volume accounts.
  return { forms, leads: leads.slice(0, 2000) };
}

/* ─────────────────────────── Pixel ─────────────────────────── */

function eventsFromActions(series: SeriesPoint[], rows: any[]): PixelEvent[] {
  const counts: Record<string, { count: number; value: number; trend: number[] }> = {};
  const daily: Record<string, number[]> = {};
  for (const row of rows) {
    for (const action of (row.actions ?? []) as Action[]) {
      const name = PIXEL_EVENT_MAP[action.action_type];
      if (!name) continue;
      const value = Number(action.value) || 0;
      counts[name] ??= { count: 0, value: 0, trend: [] };
      counts[name].count += value;
      daily[name] ??= new Array(rows.length).fill(0);
    }
  }
  for (const row of rows) {
    const idx = rows.indexOf(row);
    for (const action of (row.actions ?? []) as Action[]) {
      const name = PIXEL_EVENT_MAP[action.action_type];
      if (!name) continue;
      daily[name][idx] += Number(action.value) || 0;
    }
  }
  for (const row of rows) {
    for (const a of (row.action_values ?? []) as Action[]) {
      const name = PIXEL_EVENT_MAP[a.action_type];
      if (name) counts[name].value += Number(a.value) || 0;
    }
  }
  const order = ["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase", "Lead", "CompleteRegistration", "Search", "AddToWishlist"];
  return Object.entries(counts)
    .filter(([, v]) => v.count > 0)
    .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
    .map(([event, v]) => {
      const trend = (daily[event] ?? []).slice(-14);
      const half = Math.floor(trend.length / 2);
      const firstHalf = sum(trend.slice(0, half)) || 1;
      const secondHalf = sum(trend.slice(half));
      const delta = trend.length > 3 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
      return {
        event, label: event, count: v.count, value: v.value || undefined, trend,
        delta: Math.round(delta * 10) / 10, matched: 0,
      };
    });
}

async function fetchPixel(ctx: Ctx, token: string, accountId: string, range: Range, dailyRows: any[]) {
  const pixels = await safe<any[]>(ctx, "Pixels", () =>
    getEdge(token, accountId, "adspixels", {
      fields: "id,name,last_fired_time,code,creation_time,enable_automatic_matching,automatic_matching_fields,is_created_by_business",
      limit: 25,
    }), []);

  const list = pixels.map((p) => ({ id: String(p.id), name: p.name ?? "Pixel", lastFiredTime: p.last_fired_time ?? null }));
  if (!pixels.length) return { pixel: null, pixels: list };

  const primary = pixels[0];
  const start = Math.floor(Date.parse(`${range.since}T00:00:00Z`) / 1000);
  const end = Math.floor(Date.parse(`${range.until}T23:59:59Z`) / 1000);

  // Best-effort: dedicated pixel statistics edge (available to most ad accounts).
  const stats = await safe<any>(ctx, "Pixel stats", async () => {
    const json = await graphRequest(
      `${primary.id}/stats`,
      { start_time: start, end_time: end, aggregation: "event" },
      token,
    );
    return json;
  }, null);

  let events = eventsFromActions([], dailyRows);
  if (stats?.data?.length) {
    for (const row of stats.data) {
      const name = row.event_name ?? row.event ?? row.name;
      const count = Number(row.count ?? row.value ?? 0);
      if (!name || !count) continue;
      const existing = events.find((e) => e.event === name);
      if (existing) existing.count = Math.max(existing.count, count);
      else events.unshift({ event: name, label: name, count, trend: [], delta: 0, matched: 0 });
    }
  }

  const checks = await safe<any[]>(ctx, "Pixel diagnostics", async () => {
    const json = await graphRequest(`${primary.id}/da_checks`, {}, token);
    return (json?.data ?? []) as any[];
  }, []);

  const diagnostics: PixelDiagnostic[] = checks.length
    ? checks.slice(0, 12).map((c: any) => ({
        id: String(c.key ?? c.id ?? c.name ?? Math.random()),
        title: String(c.title ?? c.name ?? "Check"),
        status: (String(c.status ?? c.result ?? "PASS").toLowerCase().includes("fail") ? "fail" : String(c.status ?? c.result ?? "").toLowerCase().includes("warn") || String(c.status ?? "").toLowerCase().includes("partial") ? "warn" : "pass") as PixelDiagnostic["status"],
        detail: String(c.description ?? c.detail ?? c.message ?? "—"),
        value: c.value ? String(c.value) : undefined,
        cause: String(c.description ?? c.detail ?? c.message ?? "Meta detected a configuration or event-quality discrepancy."),
        evidence: `Meta diagnostic: ${String(c.key ?? c.id ?? c.name ?? "unnamed check")}`,
        resolution: [
          "Open Events Manager and select this pixel.",
          "Open Diagnostics, locate the matching issue, and inspect affected event samples.",
          "Correct the flagged parameter or integration, then use Test Events to send a fresh event.",
          "Return to Diagnostics after processing and confirm the warning clears.",
        ],
      }))
    : defaultDiagnostics(primary, events);

  const pixel: PixelConfig = {
    id: String(primary.id),
    name: primary.name ?? "Pixel",
    code: primary.code,
    lastFiredTime: primary.last_fired_time ?? null,
    creationTime: primary.creation_time ?? null,
    automaticMatching: Boolean(primary.enable_automatic_matching),
    domains: [],
    events,
    diagnostics,
    shareInfo: { business: "", adAccount: "", shared: Boolean(primary.is_created_by_business) },
  };
  return { pixel, pixels: list };
}

function defaultDiagnostics(pixel: any, events: PixelEvent[]): PixelDiagnostic[] {
  const fired = pixel.last_fired_time ? new Date(pixel.last_fired_time).getTime() : 0;
  const stale = !fired || Date.now() - fired > 48 * 3600 * 1000;
  const hasPurchase = events.some((e) => e.event === "Purchase" || e.event === "Lead");
  return [
    { id: "installed", title: "Base code installed", status: "pass", detail: "Pixel found on this ad account.", value: `ID ${pixel.id}`, evidence: `Pixel ${pixel.id} was returned by the ad account.` },
    { id: "firing", title: "Pixel firing", status: stale ? "fail" : "pass", detail: stale ? "No events received in the last 48 hours." : `Last fired ${new Date(fired).toLocaleString()}`, value: stale ? "Stale" : "Live", cause: stale ? "The base pixel may be missing, blocked, attached to another pixel ID, or no traffic reached the site." : undefined, evidence: pixel.last_fired_time ? `Meta last_fired_time: ${pixel.last_fired_time}` : "Meta returned no last_fired_time.", resolution: stale ? ["Open Events Manager → Data sources and select this pixel ID.", "Open Test Events, visit the website, and confirm PageView arrives.", "If nothing arrives, verify the installed pixel ID matches this dashboard and publish the tag container.", "Re-test without browser tracking protection, then review Diagnostics."] : undefined },
    { id: "events", title: "Standard events", status: events.length ? "pass" : "warn", detail: events.length ? `${events.length} events receiving traffic in this period.` : "No standard events recorded in this period.", value: `${events.length} events`, cause: events.length ? undefined : "Ads Insights returned no mapped standard-event actions for the selected dates.", evidence: `${events.length} mapped events in ${events.length ? "the report" : "the selected period"}.`, resolution: events.length ? undefined : ["Widen the dashboard date range and confirm the pixel is firing.", "Use Events Manager → Test Events to trigger the expected standard event.", "Check that event names use Meta standard casing, such as Lead or Purchase.", "Confirm the event appears in Ads Manager columns after attribution processing."] },
    { id: "value", title: "Value & currency parameters", status: hasPurchase ? "pass" : "warn", detail: hasPurchase ? "Purchase/Lead events detected." : "No Purchase or Lead event detected; outcome optimisation cannot be verified.", value: hasPurchase ? "Detected" : "Not detected", cause: hasPurchase ? undefined : "No mapped Purchase or Lead action was returned for this period.", evidence: `Detected event names: ${events.map((e) => e.event).join(", ") || "none"}.`, resolution: hasPurchase ? undefined : ["Trigger a test Lead or Purchase in Events Manager → Test Events.", "For Purchase, send value and ISO currency parameters.", "Verify the campaign conversion location and optimisation event use the same pixel and event.", "Check the event appears in Ads Manager before evaluating campaign delivery."] },
    { id: "matching", title: "Event match quality", status: "warn", detail: "The Marketing API response used here does not expose a reliable event match-quality score.", value: "Verify in Meta", cause: "Match quality cannot be inferred safely from event volume.", evidence: "No event match-quality field was returned by the queried endpoints.", resolution: ["Open Events Manager → Data sources → Overview.", "Select each key event and review Event Match Quality.", "Add hashed email, phone and external_id through Advanced Matching or Conversions API.", "Recheck the score after Meta processes new events."] },
    { id: "capi", title: "Conversions API", status: "warn", detail: "Server-side coverage is not exposed by this API response and must be verified in Events Manager.", value: "Verify in Meta", cause: "Browser and server event coverage cannot be confirmed from Ads Insights alone.", evidence: "No connection-method or deduplication diagnostic was returned.", resolution: ["Open Events Manager → Data sources → Settings.", "Check that Conversions API is connected for this pixel.", "Send matching browser and server events with the same event_id.", "Use Test Events to confirm Browser + Server and Deduplicated status."] },
  ];
}

/* ─────────────────────────── Main ─────────────────────────── */

export async function buildLiveData(token: string, account: Account, range: Range): Promise<ReportData> {
  const ctx: Ctx = { warnings: [] };
  const compareRange = previousRange(range);
  const timeRange = { since: range.since, until: range.until };
  const prevTimeRange = { since: compareRange.since, until: compareRange.until };

  const [dailyRows, prevRows, campaignRows, campaignMeta, adSetRows, adSetMeta, adRows, adMeta, bAge, bPlatform, bPlacement, bDevice, bRegion, hourlyRows, leadData, campaignDaily] =
    await Promise.all([
      safe<any[]>(ctx, "Daily insights", () => getInsights(token, account.id, { fields: BASE_FIELDS, time_range: timeRange, time_increment: 1, limit: 400 }), []),
      safe<any[]>(ctx, "Previous-period insights", () => getInsights(token, account.id, { fields: BASE_FIELDS, time_range: prevTimeRange, time_increment: 1, limit: 400 }), []),
      safe<any[]>(ctx, "Campaign insights", () => getInsights(token, account.id, { fields: `campaign_id,campaign_name,objective,${BASE_FIELDS}`, level: "campaign", time_range: timeRange, limit: 500 }), []),
      safe<any[]>(ctx, "Campaign metadata", () => getEdge(token, account.id, "campaigns", { fields: "id,name,status,effective_status,objective,daily_budget,lifetime_budget,start_time,stop_time,budget_remaining", limit: 500 }), []),
      safe<any[]>(ctx, "Ad set insights", () => getInsights(token, account.id, { fields: `adset_id,adset_name,campaign_id,campaign_name,${BASE_FIELDS}${RANKING_FIELDS}`, level: "adset", time_range: timeRange, limit: 500 }), []),
      safe<any[]>(ctx, "Ad set metadata", () => getEdge(token, account.id, "adsets", { fields: "id,name,campaign_id,status,effective_status,daily_budget,lifetime_budget,targeting{age_min,age_max,genders,geo_locations,publisher_platforms,facebook_positions,instagram_positions,device_platforms,interests,flexible_spec}", limit: 300 }), []),
      safe<any[]>(ctx, "Ad insights", () => getInsights(token, account.id, { fields: `ad_id,ad_name,adset_id,adset_name,campaign_id,campaign_name,${BASE_FIELDS}${RANKING_FIELDS}`, level: "ad", time_range: timeRange, limit: 500 }), []),
      safe<any[]>(ctx, "Ad metadata", () => getEdge(token, account.id, "ads", {
        fields: "id,name,adset_id,campaign_id,status,effective_status,creative{id,name,title,body,image_url,thumbnail_url,video_id,effective_object_story_id,call_to_action_type}",
        limit: 500,
      }), []),
      safe<any[]>(ctx, "Age & gender breakdown", () => getInsights(token, account.id, { fields: BASE_FIELDS, level: "account", breakdowns: "age,gender", time_range: timeRange, limit: 200 }), []),
      safe<any[]>(ctx, "Platform breakdown", () => getInsights(token, account.id, { fields: BASE_FIELDS, level: "account", breakdowns: "publisher_platform", time_range: timeRange, limit: 50 }), []),
      safe<any[]>(ctx, "Placement breakdown", () => getInsights(token, account.id, { fields: BASE_FIELDS, level: "account", breakdowns: "publisher_platform,platform_position", time_range: timeRange, limit: 200 }), []),
      safe<any[]>(ctx, "Device breakdown", () => getInsights(token, account.id, { fields: BASE_FIELDS, level: "account", breakdowns: "impression_device", time_range: timeRange, limit: 50 }), []),
      safe<any[]>(ctx, "Region breakdown", () => getInsights(token, account.id, { fields: BASE_FIELDS, level: "account", breakdowns: "region", time_range: timeRange, limit: 100 }), []),
      safe<any[]>(ctx, "Hourly breakdown", () => getInsights(token, account.id, {
        fields: "spend,impressions,clicks,actions", level: "account",
        breakdowns: "hourly_stats_aggregated_by_advertiser_time_zone",
        time_range: timeRange, time_increment: range.days <= 31 ? 1 : undefined, limit: 1200,
      }), []),
      fetchLeads(ctx, token, range),
      safe<any[]>(ctx, "Campaign daily insights", () => getInsights(token, account.id, {
        fields: "campaign_id,spend,impressions,clicks,actions", level: "campaign",
        time_range: timeRange, time_increment: 1, limit: 1200,
      }), []),
    ]);

  const pixelData = await fetchPixel(ctx, token, account.id, range, dailyRows);

  // Resolve playable sources separately so the main ad request remains small.
  const videoIds = [...new Set(adMeta.map((ad: any) => ad.creative?.video_id).filter(Boolean))] as string[];
  const videoRows = await Promise.all(videoIds.map(async (id) => {
    try {
      return await graphRequest(id, { fields: "id,source,picture,permalink_url" }, token);
    } catch {
      return null;
    }
  }));
  const videoById = new Map(videoRows.filter(Boolean).map((video: any) => [String(video.id), video]));

  const series = seriesFrom(dailyRows);
  const prevSeries = seriesFrom(prevRows);
  const kpis = dailyRows.length ? kpiFrom(dailyRows.reduce((acc: any, r: any) => {
    return {
      spend: toNumber(acc.spend) + toNumber(r.spend),
      impressions: toNumber(acc.impressions) + toNumber(r.impressions),
      reach: toNumber(acc.reach) + toNumber(r.reach),
      clicks: toNumber(acc.clicks) + toNumber(r.clicks),
      actions: mergeActions((acc.actions ?? []) as Action[], (r.actions ?? []) as Action[]),
      action_values: mergeActions((acc.action_values ?? []) as Action[], (r.action_values ?? []) as Action[]),
      cost_per_action_type: [],
      video_thruplay_watched_actions: [],
      outbound_clicks: [],
    };
  }, { spend: 0, impressions: 0, reach: 0, clicks: 0, actions: [], action_values: [] })) : emptyKpis();

  const prevKpis = prevRows.length ? kpiFrom(prevRows.reduce((acc: any, r: any) => ({
    spend: toNumber(acc.spend) + toNumber(r.spend),
    impressions: toNumber(acc.impressions) + toNumber(r.impressions),
    reach: toNumber(acc.reach) + toNumber(r.reach),
    clicks: toNumber(acc.clicks) + toNumber(r.clicks),
    actions: mergeActions((acc.actions ?? []) as Action[], (r.actions ?? []) as Action[]),
    action_values: mergeActions((acc.action_values ?? []) as Action[], (r.action_values ?? []) as Action[]),
  }), { spend: 0, impressions: 0, reach: 0, clicks: 0, actions: [], action_values: [] })) : emptyKpis();

  const metaById = new Map<string, any>(campaignMeta.map((c) => [String(c.id), c]));
  const campaigns: CampaignRow[] = campaignRows.map((r) => {
    const meta = metaById.get(String(r.campaign_id));
    const k = kpiFrom(r, r.objective ?? meta?.objective);
    return {
      id: String(r.campaign_id ?? r.campaign_id),
      name: r.campaign_name ?? meta?.name ?? "Unknown campaign",
      status: meta?.effective_status ?? meta?.status ?? "UNKNOWN",
      objective: r.objective ?? meta?.objective ?? "UNKNOWN",
      budget: Number(meta?.daily_budget ?? meta?.lifetime_budget ?? 0) / 100,
      budgetType: meta?.daily_budget ? "daily" : meta?.lifetime_budget ? "lifetime" : "—",
      start: meta?.start_time?.slice(0, 10) ?? null,
      stop: meta?.stop_time?.slice(0, 10) ?? null,
      ...k,
      trend: [],
      location: inferStudioLocation(r.campaign_name, meta?.name),
    };
  });

  const adSetMetaById = new Map<string, any>(adSetMeta.map((a) => [String(a.id), a]));
  const adSets: AdSetRow[] = adSetRows.map((r) => {
    const meta = adSetMetaById.get(String(r.adset_id));
    return {
      id: String(r.adset_id),
      campaignId: String(r.campaign_id),
      campaignName: r.campaign_name,
      name: r.adset_name ?? meta?.name ?? "Ad set",
      status: meta?.effective_status ?? "UNKNOWN",
      objective: r.objective ?? "UNKNOWN",
      budget: Number(meta?.daily_budget ?? meta?.lifetime_budget ?? 0) / 100,
      budgetType: meta?.daily_budget ? "daily" : meta?.lifetime_budget ? "lifetime" : "—",
      qualityRanking: ranking(r.quality_ranking),
      engagementRanking: ranking(r.engagement_rate_ranking),
      conversionRanking: ranking(r.conversion_rate_ranking),
      ...kpiFrom(r, r.objective),
      trend: [],
      location: inferStudioLocation(r.adset_name, r.campaign_name, meta?.name),
    };
  });

  const adMetaById = new Map<string, any>(adMeta.map((a) => [String(a.id), a]));
  const ads: AdRow[] = adRows.map((r) => {
    const meta = adMetaById.get(String(r.ad_id));
    const creative = meta?.creative;
    const videoMeta: any = creative?.video_id ? videoById.get(String(creative.video_id)) : undefined;
    const spec = creative?.object_story_spec ?? {};
    const video = spec?.video_data;
    const link = spec?.link_data;
    const photo = spec?.template_data ?? spec?.photo_data;
    const title = creative?.title ?? video?.title?.text ?? link?.name ?? link?.title ?? photo?.name;
    const body = creative?.body ?? video?.message ?? link?.message ?? video?.description?.text ?? link?.description;
    const thumbnail = creative?.thumbnail_url ?? creative?.image_url ?? video?.image_url ?? link?.image_url ?? link?.picture ?? photo?.image_url ?? creative?.asset_feed_spec?.images?.[0]?.url;
    return {
      id: String(r.ad_id),
      adSetId: String(r.adset_id),
      adSetName: r.adset_name ?? "Ad set",
      name: r.ad_name ?? meta?.name ?? "Ad",
      status: meta?.effective_status ?? "UNKNOWN",
      objective: r.objective ?? "UNKNOWN",
      budget: 0,
      budgetType: "—",
      qualityRanking: ranking(r.quality_ranking),
      engagementRanking: ranking(r.engagement_rate_ranking),
      conversionRanking: ranking(r.conversion_rate_ranking),
      ...kpiFrom(r, r.objective),
      trend: [],
      location: inferStudioLocation(r.ad_name, r.adset_name, r.campaign_name, meta?.name),
      creative: {
        id: creative?.id,
        title, body, thumbnail,
        imageUrl: creative?.image_url,
        videoUrl: videoMeta?.source,
        permalink: videoMeta?.permalink_url,
        videoId: creative?.video_id ? String(creative.video_id) : undefined,
        cta: creative?.call_to_action_type ?? video?.call_to_action?.value?.type ?? link?.call_to_action?.value?.type,
        format: video ? "Video" : link?.child_attachments?.length ? "Carousel" : link ? "Link" : "Image",
      },
    };
  });

  // Attach 14-day spend sparklines derived from the campaign-level daily series.
  const dailyByCampaign = new Map<string, { date: string; spend: number }[]>();
  for (const row of campaignDaily) {
    const id = String(row.campaign_id);
    if (!dailyByCampaign.has(id)) dailyByCampaign.set(id, []);
    dailyByCampaign.get(id)!.push({ date: String(row.date_start), spend: toNumber(row.spend) });
  }
  for (const c of campaigns) {
    const rows = (dailyByCampaign.get(c.id) ?? []).sort((a, b) => (a.date < b.date ? -1 : 1));
    c.trend = rows.slice(-14).map((r) => r.spend);
    const campaignTotal = c.spend || 1;
    for (const s of adSets.filter((x) => x.campaignId === c.id)) {
      s.trend = c.trend.map((v) => (v * s.spend) / campaignTotal);
      for (const a of ads.filter((x) => x.adSetId === s.id)) {
        a.trend = s.trend.map((v) => (v * a.spend) / (s.spend || 1));
      }
    }
  }

  const breakdowns: Record<string, Breakdown> = {
    "age,gender": { dimension: "age,gender", label: "Age & gender", rows: toBreakdownRows(bAge) },
    publisher_platform: { dimension: "publisher_platform", label: "Platform", rows: toBreakdownRows(bPlatform) },
    platform_position: { dimension: "platform_position", label: "Placement", rows: toBreakdownRows(bPlacement) },
    impression_device: { dimension: "impression_device", label: "Device", rows: toBreakdownRows(bDevice) },
    region: { dimension: "region", label: "Region", rows: toBreakdownRows(bRegion) },
  };

  const hourly = buildHourly(hourlyRows, range);

  const leadForms = leadData.forms;
  const leads = leadData.leads;
  const qualified = Math.round(leads.length * 0.5);
  const leadFunnel: FunnelStep[] = [
    { label: "Impressions", value: kpis.impressions, note: `Reach ${Math.round(kpis.reach).toLocaleString()}` },
    { label: "Link clicks", value: kpis.clicks },
    { label: "Landing page views", value: kpis.landingPageViews, note: "Pixel: PageView" },
    { label: "Leads captured", value: leads.length || kpis.leads, note: "Pixel: Lead" },
    { label: "Sales-qualified", value: qualified, note: "Estimated" },
    { label: "Customers", value: kpis.purchases, note: "Pixel: Purchase" },
  ];

  return {
    mode: "live",
    generatedAt: new Date().toISOString(),
    account,
    range,
    compareRange,
    kpis,
    prevKpis,
    series,
    prevSeries,
    campaigns: campaigns.sort((a, b) => b.spend - a.spend),
    adSets: adSets.sort((a, b) => b.spend - a.spend),
    ads: ads.sort((a, b) => b.spend - a.spend),
    breakdowns,
    leads,
    leadForms,
    leadFunnel,
    pixel: pixelData.pixel,
    pixels: pixelData.pixels,
    hourly,
    weekday: [],
    warnings: ctx.warnings,
  };
}

function mergeActions(a: Action[], b: Action[]) {
  const map = new Map<string, number>();
  for (const x of a) map.set(x.action_type, (map.get(x.action_type) ?? 0) + Number(x.value || 0));
  for (const x of b) map.set(x.action_type, (map.get(x.action_type) ?? 0) + Number(x.value || 0));
  return [...map.entries()].map(([action_type, value]) => ({ action_type, value }));
}

function buildHourly(rows: any[], range: Range) {
  if (!rows.length) return [];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hasDate = Boolean(rows[0].date_start);
  if (hasDate) {
    const grid: { day: number; hour: number; value: number }[] = [];
    for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) grid.push({ day: d, hour: h, value: 0 });
    const index = new Map(grid.map((g) => [`${g.day}-${g.hour}`, g]));
    for (const row of rows) {
      const hour = hourFromKey(row.hourly_stats_aggregated_by_advertiser_time_zone ?? "");
      if (hour === null) continue;
      const day = new Date(`${row.date_start}T00:00:00Z`).getUTCDay();
      const cell = index.get(`${day}-${hour}`);
      if (cell) cell.value += sumActions(row.actions as Action[], ["onsite_conversion.lead_grouped", "lead", "offsite_conversion.fb_pixel_lead", "purchase", "offsite_conversion.fb_pixel_purchase", "link_click"]);
    }
    return grid;
  }
  // Aggregated hour-of-day only → replicate across weekdays.
  const totals = new Map<number, number>();
  for (const row of rows) {
    const hour = hourFromKey(row.hourly_stats_aggregated_by_advertiser_time_zone ?? "");
    if (hour === null) continue;
    totals.set(hour, (totals.get(hour) ?? 0) + sumActions(row.actions as Action[], ["onsite_conversion.lead_grouped", "lead", "offsite_conversion.fb_pixel_lead", "purchase", "offsite_conversion.fb_pixel_purchase", "link_click"]));
  }
  const grid: { day: number; hour: number; value: number }[] = [];
  for (let d = 0; d < 7; d++) for (let h = 0; h < 24; h++) grid.push({ day: d, hour: h, value: (totals.get(h) ?? 0) / 7 });
  void dayNames;
  return grid;
}

export { daysInRange };
