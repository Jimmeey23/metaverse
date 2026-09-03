import type { Insight, ReportData } from "./types";
import { currency, pct } from "./format";
import { avg, safeDiv, sum } from "./utils";

type Builder = (d: ReportData) => Insight[];

const fmtMoney = (d: ReportData, v: number) => currency(v, d.account.currency, { compact: true });
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const rules: Builder[] = [
  /* 1. Wasted spend with zero results */
  (d) => {
    const total = d.kpis.spend || 1;
    const zero = d.campaigns.filter((c) => c.results === 0 && c.spend > total * 0.03 && c.status === "ACTIVE");
    if (!zero.length) return [];
    const waste = sum(zero.map((c) => c.spend));
    return [{
      id: "zero-results",
      severity: "critical",
      title: `${zero.length} active campaign${zero.length > 1 ? "s" : ""} spending with zero results`,
      detail: `${zero.map((c) => c.name).join(", ")} delivered no ${d.kpis.resultLabel.toLowerCase()} in this period while consuming ${fmtMoney(d, waste)} (${pct((waste / total) * 100, 1)} of spend). Check conversion tracking, audience size and landing page before spending more.`,
      impact: `Recover up to ${fmtMoney(d, waste * 0.8)}`,
      metric: { label: "Spend at risk", value: fmtMoney(d, waste), delta: -Math.round((waste / total) * 100) },
      action: "Pause or rebuild — verify pixel events, then restart with a tighter audience and a proven creative.",
      entities: zero.map((c) => c.name),
    }];
  },

  /* 2. Creative fatigue */
  (d) => {
    const accountCtr = d.kpis.ctr || 1;
    const fatigued = d.campaigns.filter((c) => c.status === "ACTIVE" && c.frequency >= 2.1 && c.ctr < accountCtr * 0.85 && c.spend > d.kpis.spend * 0.05);
    if (!fatigued.length) return [];
    return fatigued.slice(0, 2).map((c) => ({
      id: `fatigue-${c.id}`,
      severity: "warning",
      title: `Creative fatigue in “${c.name}”`,
      detail: `Frequency is ${c.frequency.toFixed(2)} with CTR at ${pct(c.ctr)}, ${pct(Math.abs(1 - c.ctr / accountCtr) * 100, 0)} below the account average of ${pct(accountCtr)}. Audiences are seeing the same creative too often.`,
      impact: "Refreshing creative typically recovers 15–30% CTR",
      metric: { label: "Frequency", value: c.frequency.toFixed(2), delta: Math.round((c.ctr / accountCtr - 1) * 100) },
      action: "Add 2–3 fresh variations (new hook, UGC or Reels crop) and rotate the existing winner out for 7 days.",
      entities: [c.name],
    }));
  },

  /* 3. Budget reallocation */
  (d) => {
    const conversions = d.kpis.leads + d.kpis.purchases;
    const accountCpa = conversions > 0 ? d.kpis.spend / conversions : d.kpis.costPerResult;
    if (!(accountCpa > 0) || d.campaigns.length < 3) return [];
    const active = d.campaigns.filter((c) => c.status === "ACTIVE" && c.spend > d.kpis.spend * 0.04 && c.results > 0);
    const winners = [...active].sort((a, b) => a.costPerResult - b.costPerResult).slice(0, 2);
    const losers = [...active].sort((a, b) => b.costPerResult - a.costPerResult).slice(0, 2);
    if (!winners.length || !losers.length) return [];
    const best = winners[0];
    const worst = losers[0];
    if (worst.costPerResult < best.costPerResult * 1.6) return [];
    const shift = Math.min(worst.spend * 0.3, d.kpis.spend * 0.12);
    const extraResults = safeDiv(shift, best.costPerResult) - safeDiv(shift, worst.costPerResult);
    return [{
      id: "reallocate",
      severity: "opportunity",
      title: `Shift ${fmtMoney(d, shift)} from “${worst.name}” to “${best.name}”`,
      detail: `Best performer converts at ${fmtMoney(d, best.costPerResult)} per ${best.resultLabel.toLowerCase().replace(/s$/, "")} versus ${fmtMoney(d, worst.costPerResult)} for the weakest — a ${(worst.costPerResult / Math.max(best.costPerResult, 0.01)).toFixed(1)}× gap.`,
      impact: `≈ +${Math.round(extraResults)} results at the same budget`,
      metric: { label: "CPA gap", value: `${fmtMoney(d, best.costPerResult)} → ${fmtMoney(d, worst.costPerResult)}`, delta: Math.round((worst.costPerResult / Math.max(best.costPerResult, 0.01) - 1) * 100) },
      action: "Move 20–30% of the weaker campaign's daily budget to the winner, then re-check in 3 days (respect learning phase).",
      entities: [worst.name, best.name],
    }];
  },

  /* 4. Scale winners on ROAS */
  (d) => {
    const scalers = d.campaigns.filter((c) => c.status === "ACTIVE" && c.roas >= 2.5 && c.spend > 0 && c.budgetType === "daily" && c.budget > 0);
    if (!scalers.length) return [];
    const c = scalers.sort((a, b) => b.roas - a.roas)[0];
    const newBudget = c.budget * 1.25;
    return [{
      id: "scale-winner",
      severity: "opportunity",
      title: `Scale “${c.name}” — ${c.roas.toFixed(2)}× ROAS`,
      detail: `Every ${fmtMoney(d, 1)} spent returns ${fmtMoney(d, c.roas)}. Budget is ${fmtMoney(d, c.budget)}/day with CPA at ${fmtMoney(d, c.costPerResult)} — room to grow before efficiency drops.`,
      impact: `+25% budget ≈ ${fmtMoney(d, (newBudget - c.budget) * 30 * (c.roas - 1))} extra monthly profit`,
      metric: { label: "ROAS", value: `${c.roas.toFixed(2)}×`, delta: 25 },
      action: `Raise the daily budget to ${fmtMoney(d, newBudget)} in 20–25% steps every 48h (staying under 25% keeps you out of a fresh learning phase).`,
      entities: [c.name],
    }];
  },

  /* 5. Auction pressure / rising CPM */
  (d) => {
    if (!d.prevKpis.cpm || !d.kpis.cpm) return [];
    const change = (d.kpis.cpm / d.prevKpis.cpm - 1) * 100;
    if (change < 15) return [];
    return [{
      id: "cpm-rising",
      severity: change > 35 ? "warning" : "info",
      title: `CPM up ${pct(change, 0)} versus the previous period`,
      detail: `Cost per 1,000 impressions moved from ${fmtMoney(d, d.prevKpis.cpm)} to ${fmtMoney(d, d.kpis.cpm)}. Auction pressure is rising — either competition increased or your audience is saturating.`,
      impact: change > 35 ? "Broaden targeting to protect volume" : "Monitor — normal seasonal movement",
      metric: { label: "CPM", value: fmtMoney(d, d.kpis.cpm), delta: Math.round(change) },
      action: "Broaden the audience, add fresh creative, and test Advantage+ placements to unlock cheaper inventory.",
      entities: [],
    }];
  },

  /* 6. CTR below benchmark */
  (d) => {
    if (d.kpis.ctr >= 1.0 || !d.kpis.impressions) return [];
    return [{
      id: "ctr-low",
      severity: "opportunity",
      title: `Account CTR of ${pct(d.kpis.ctr)} is below the 1% benchmark`,
      detail: `You paid for ${Math.round(d.kpis.impressions).toLocaleString()} impressions and earned ${Math.round(d.kpis.clicks).toLocaleString()} clicks. Strong feed creative usually clears 1.2–2% CTR.`,
      impact: "0.5pt CTR lift ≈ 30–50% more clicks at the same spend",
      metric: { label: "CTR", value: pct(d.kpis.ctr), delta: -Math.round((1 / Math.max(d.kpis.ctr, 0.01) - 1) * 100) },
      action: "Lead with the offer in the first 3 seconds, add motion (Reels/video), and test 3 hooks against the same body copy.",
      entities: [],
    }];
  },

  /* 7. Landing-page conversion */
  (d) => {
    const lp = d.kpis.landingPageViews || 0;
    const leads = d.kpis.leads || d.kpis.results || 0;
    if (lp < 100) return [];
    const rate = safeDiv(leads, lp) * 100;
    if (rate >= 4) return [];
    return [{
      id: "lp-conversion",
      severity: rate < 2 ? "warning" : "info",
      title: `Landing page converts ${pct(rate, 1)} of visitors`,
      detail: `${Math.round(lp).toLocaleString()} landing page views produced ${Math.round(leads).toLocaleString()} leads. A well-tuned page sits between 5–12%.`,
      impact: `Fixing the form could add ~${Math.round(lp * 0.03)} leads/month`,
      metric: { label: "View → lead", value: pct(rate, 1), delta: -Math.round((4 / Math.max(rate, 0.01) - 1) * 100) },
      action: "Cut form fields to 3 or fewer, move the form above the fold, add trust badges, and match the ad's headline on the page.",
      entities: [],
    }];
  },

  /* 8. Dayparting */
  (d) => {
    if (!d.hourly.length) return [];
    const byHour = new Map<number, number>();
    for (const cell of d.hourly) byHour.set(cell.hour, (byHour.get(cell.hour) ?? 0) + cell.value);
    const entries = [...byHour.entries()].sort((a, b) => b[1] - a[1]);
    if (!entries.length || !entries[0][1]) return [];
    const best = entries.slice(0, 5).map(([h]) => h).sort((a, b) => a - b);
    const worst = entries.slice(-5).map(([h]) => h).sort((a, b) => a - b);
    const bestShare = sum(entries.slice(0, 5).map((e) => e[1])) / Math.max(sum(entries.map((e) => e[1])), 1);
    return [{
      id: "daypart",
      severity: "opportunity",
      title: `${bestShare > 0.35 ? "Concentrate" : "Consider"} spend on ${best[0]}:00–${best[best.length - 1]}:59`,
      detail: `${best.map((h) => `${h}:00`).join(", ")} drive ${pct(bestShare * 100, 0)} of results, while ${worst.map((h) => `${h}:00`).join(", ")} are weakest.`,
      impact: bestShare > 0.35 ? "Ad scheduling can cut 10–20% of wasted spend" : "Test scheduling before committing",
      metric: { label: "Peak window", value: `${best[0]}:00–${best[best.length - 1]}:59`, delta: Math.round(bestShare * 100) },
      action: "Switch the campaign to a schedule that covers peak hours, or set bid caps for off-peak delivery.",
      entities: [],
    }];
  },

  /* 9. Best / worst day of week */
  (d) => {
    if (!d.weekday?.length) return [];
    const withResults = d.weekday.filter((w) => w.results > 0);
    if (withResults.length < 3) return [];
    const best = [...withResults].sort((a, b) => b.results / Math.max(b.spend, 1) - a.results / Math.max(a.spend, 1))[0];
    const worst = [...withResults].sort((a, b) => a.results / Math.max(a.spend, 1) - b.results / Math.max(b.spend, 1))[0];
    if (best.day === worst.day) return [];
    return [{
      id: "weekday",
      severity: "info",
      title: `${DAY_NAMES[["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(best.day)]}s perform best, ${DAY_NAMES[["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(worst.day)]}s weakest`,
      detail: `${best.day} returns ${best.results.toFixed(1)} results per ${fmtMoney(d, 1000)} spent; ${worst.day} returns ${(worst.results / Math.max(worst.spend, 1) * 1000).toFixed(1)}.`,
      impact: "Weekday bid adjustments can lift weekly efficiency",
      metric: { label: "Best day", value: best.day, delta: Math.round((best.results / Math.max(best.spend, 1)) / Math.max(worst.results / Math.max(worst.spend, 1), 0.0001) * 10 - 10) },
      action: "Use dayparting rules or a weekday-only schedule to weight budget toward the stronger days.",
      entities: [],
    }];
  },

  /* 10. Placement / device pruning */
  (d) => {
    const rows = d.breakdowns.platform_position?.rows ?? [];
    if (rows.length < 4) return [];
    const totalSpend = sum(rows.map((r) => r.spend)) || 1;
    const candidates = rows.filter((r) => r.spend > totalSpend * 0.03 && r.results > 0);
    if (candidates.length < 2) return [];
    const worst = [...candidates].sort((a, b) => b.costPerResult - a.costPerResult)[0];
    const best = [...candidates].sort((a, b) => a.costPerResult - b.costPerResult)[0];
    if (worst.costPerResult < best.costPerResult * 2) return [];
    return [{
      id: "placement-prune",
      severity: "opportunity",
      title: `“${worst.key}” costs ${(worst.costPerResult / Math.max(best.costPerResult, 0.01)).toFixed(1)}× more per result`,
      detail: `${worst.key} spent ${fmtMoney(d, worst.spend)} at ${fmtMoney(d, worst.costPerResult)} per result, while ${best.key} delivers at ${fmtMoney(d, best.costPerResult)}.`,
      impact: `Redirecting could save ~${fmtMoney(d, worst.spend * 0.6)}`,
      metric: { label: "CPA", value: fmtMoney(d, worst.costPerResult), delta: Math.round((worst.costPerResult / Math.max(best.costPerResult, 0.01) - 1) * 100) },
      action: "Turn off manual placements for the weakest slot, or switch to Advantage+ placements with the worst placement excluded.",
      entities: [worst.key],
    }];
  },

  /* 11. Audience saturation */
  (d) => {
    if (d.kpis.frequency < 3 || !d.kpis.reach) return [];
    return [{
      id: "frequency",
      severity: d.kpis.frequency > 5 ? "warning" : "info",
      title: `Average frequency is ${d.kpis.frequency.toFixed(2)} — audience is saturating`,
      detail: `You reached ${Math.round(d.kpis.reach).toLocaleString()} people an average of ${d.kpis.frequency.toFixed(1)} times each. Above 3, incremental impressions usually stop converting.`,
      impact: "Broadening reach re-opens cheaper delivery",
      metric: { label: "Frequency", value: d.kpis.frequency.toFixed(2), delta: Math.round((d.kpis.frequency - 2) * 20) },
      action: "Expand geo, widen age range, add a lookalike, or refresh creative so the same people see something new.",
      entities: [],
    }];
  },

  /* 12. Lead quality */
  (d) => {
    if (d.leads.length < 20) return [];
    const missing = d.leads.filter((l) => !l.email || !l.phone).length;
    const share = missing / d.leads.length;
    const hot = d.leads.filter((l) => l.intent === "Hot").length;
    if (share < 0.15) return [];
    return [{
      id: "lead-quality",
      severity: share > 0.3 ? "warning" : "info",
      title: `${pct(share * 100, 0)} of leads are missing contact details`,
      detail: `${missing} of ${d.leads.length} leads have no email or phone — they cannot be followed up. ${hot} leads (${pct((hot / d.leads.length) * 100, 0)}) scored as high-intent.`,
      impact: `${missing} unreachable leads this period`,
      metric: { label: "Incomplete", value: pct(share * 100, 0), delta: Math.round(share * 100) },
      action: "In instant forms, ask for email + phone as pre-filled fields and add a short qualifying question (budget or timeline).",
      entities: [],
    }];
  },

  /* 13. Pixel health */
  (d) => {
    if (!d.pixel) return [];
    const problems = d.pixel.diagnostics.filter((x) => x.status !== "pass");
    if (!problems.length) return [];
    const failing = problems.filter((p) => p.status === "fail");
    return [{
      id: "pixel-health",
      severity: failing.length ? "critical" : "warning",
      title: failing.length ? `${failing.length} pixel check${failing.length > 1 ? "s" : ""} failing` : `${problems.length} pixel warnings to resolve`,
      detail: problems.slice(0, 3).map((p) => `${p.title}: ${p.detail}`).join(" "),
      impact: failing.length ? "Broken tracking means Meta optimises on bad data" : "Better signal improves delivery",
      metric: { label: "Checks passed", value: `${d.pixel.diagnostics.length - problems.length}/${d.pixel.diagnostics.length}`, delta: -problems.length },
      action: "Open Events Manager → Data sources, fix the failing checks, then verify with the Test Events tool.",
      entities: problems.map((p) => p.title),
    }];
  },

  /* 14. Under-used conversions API / signal */
  (d) => {
    const purchases = d.kpis.purchases || 0;
    if (!d.pixel || purchases < 5) return [];
    const pageView = d.pixel.events.find((e) => e.event === "PageView")?.count ?? 0;
    const purchase = d.pixel.events.find((e) => e.event === "Purchase")?.count ?? purchases;
    if (!pageView || !purchase) return [];
    const rate = (purchase / pageView) * 100;
    if (rate >= 1.2) return [];
    return [{
      id: "signal-loss",
      severity: "info",
      title: `Purchase rate is ${pct(rate, 2)} of page views`,
      detail: `Meta is seeing ${Math.round(purchase).toLocaleString()} purchases from ${Math.round(pageView).toLocaleString()} page views. Low relative signal makes optimisation noisier, especially on iOS traffic.`,
      impact: "CAPI + AEM setup typically recovers 8–15% signal",
      metric: { label: "Page view → purchase", value: pct(rate, 2) },
      action: "Send server-side events via Conversions API with event_id deduplication, and verify domain + 8 ranked events under Aggregated Event Measurement.",
      entities: [],
    }];
  },

  /* 15. Efficiency momentum */
  (d) => {
    if (d.series.length < 14) return [];
    const half = Math.floor(d.series.length / 2);
    const first = d.series.slice(0, half);
    const second = d.series.slice(half);
    const cpaFirst = safeDiv(sum(first.map((s) => s.spend)), sum(first.map((s) => s.results)));
    const cpaSecond = safeDiv(sum(second.map((s) => s.spend)), sum(second.map((s) => s.results)));
    if (!cpaFirst || !cpaSecond) return [];
    const change = (cpaSecond / cpaFirst - 1) * 100;
    if (Math.abs(change) < 12) return [];
    const better = change < 0;
    return [{
      id: "momentum",
      severity: better ? "info" : "warning",
      title: `Cost per result ${better ? "improved" : "worsened"} ${pct(Math.abs(change), 0)} across the period`,
      detail: `First half averaged ${fmtMoney(d, cpaFirst)} per result, the second half ${fmtMoney(d, cpaSecond)}.`,
      impact: better ? "Momentum is positive — protect it before scaling" : "Investigate before raising budgets",
      metric: { label: "CPA trend", value: fmtMoney(d, cpaSecond), delta: Math.round(change) },
      action: better
        ? "Keep changes small this week so the algorithm can stabilise, then scale budgets 20% at a time."
        : "Check frequency, creative age, audience overlap and landing page changes made mid-period.",
      entities: [],
    }];
  },
];

const SEVERITY_ORDER: Record<Insight["severity"], number> = { critical: 0, warning: 1, opportunity: 2, info: 3 };

export function generateInsights(data: ReportData): Insight[] {
  const out: Insight[] = [];
  for (const rule of rules) {
    try {
      out.push(...rule(data));
    } catch {
      /* a broken rule must never break the report */
    }
  }
  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}

export function insightScore(data: ReportData, insights: Insight[]) {
  const penalty = insights.reduce((acc, i) => acc + (i.severity === "critical" ? 18 : i.severity === "warning" ? 8 : 0), 0);
  const ctrScore = Math.min(25, (data.kpis.ctr / 1.5) * 25);
  const roasScore = Math.min(25, (data.kpis.roas / 4) * 25);
  const freqScore = Math.min(25, Math.max(0, 25 - Math.max(0, data.kpis.frequency - 1.5) * 10));
  const stability = Math.min(25, 25 - Math.min(20, Math.abs(avg(data.series.map((s) => s.spend)) / Math.max(avg(data.series.map((s) => s.spend)) || 1, 1) * 5)));
  return Math.max(10, Math.round(ctrScore + roasScore + freqScore + stability - penalty));
}
