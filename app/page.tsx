import * as React from "react";
import Link from "next/link";
import {
  Activity, ArrowRight, Check, Facebook, Gauge, Layers, LayoutDashboard, Megaphone, Radio,
  ShieldCheck, Sparkles, Target, UserPlus, Zap,
} from "lucide-react";
import { getSession, isDemo } from "@/lib/data";
import { metaConfig } from "@/lib/meta";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Panel } from "@/components/ui/primitives";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: <LayoutDashboard className="h-4 w-4" />, title: "Account overview",
    body: "Spend, results, CPA, ROAS, CTR and CPM with period-over-period deltas and 14-day sparklines on every card.",
  },
  {
    icon: <Megaphone className="h-4 w-4" />, title: "Campaign drill-down",
    body: "Expand any campaign into ad sets and individual ads — with creative headlines, quality rankings and spend trends.",
  },
  {
    icon: <Target className="h-4 w-4" />, title: "Audience intelligence",
    body: "Age, gender, placement, device and region breakdowns plus a day-and-hour heat map for ad scheduling.",
  },
  {
    icon: <UserPlus className="h-4 w-4" />, title: "Lead centre",
    body: "Every instant-form and pixel lead with contact details, source campaign, intent scoring and one-click CSV export.",
  },
  {
    icon: <Radio className="h-4 w-4" />, title: "Pixel & events",
    body: "Event volumes, match quality, step-by-step conversion rates, diagnostics and the exact base code to install.",
  },
  {
    icon: <Sparkles className="h-4 w-4" />, title: "Smart suggestions",
    body: "Rule-based recommendations for fatigue, budget shifts, scaling, dayparting, CPM pressure and tracking gaps.",
  },
];

const STEPS = [
  { title: "Connect", body: "Sign in with Facebook and pick the ad account. Read-only scopes — nothing is ever modified." },
  { title: "Explore", body: "Every report is generated live from the Marketing API: insights, breakdowns, leads and pixels." },
  { title: "Act", body: "Work the prioritised action list — each recommendation names the campaign and the expected impact." },
];

export default async function LandingPage() {
  const session = await getSession();
  const connected = !isDemo(session);
  const config = metaConfig();

  return (
    <div className="app-canvas min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 via-accent to-accent-2 text-white shadow-glow">
              <Zap className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-sm font-semibold leading-none tracking-tight">MetaInsight</p>
              <p className="text-[10px] leading-none text-faint">Ads intelligence suite</p>
            </div>
          </div>
          <nav className="ml-auto hidden items-center gap-6 text-[13px] text-muted md:flex">
            <a href="#features" className="transition hover:text-ink">Features</a>
            <a href="#how" className="transition hover:text-ink">How it works</a>
            <a href="#connect" className="transition hover:text-ink">Connect</a>
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-6">
            <ThemeToggle />
            <Link
              href="/dashboard"
              className="rounded-xl border border-line px-3 py-2 text-[13px] font-medium transition hover:border-brand-500/40"
            >
              Open dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-14 sm:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/10 px-3 py-1 text-[11px] font-semibold text-brand-500">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Meta Marketing API · {config.version}
            </span>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Every number in your
              <span className="grad-text"> Meta ad account</span>, explained.
            </h1>
            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted">
              Connect an ad account and get advanced reporting in seconds: performance trends, campaign and
              creative drill-downs, audience and placement intelligence, captured leads, pixel diagnostics and a
              prioritised list of actions worth taking.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              {connected ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
                >
                  <LayoutDashboard className="h-4 w-4" /> Go to live dashboard
                </Link>
              ) : (
                <a
                  href="/api/meta/login"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
                >
                  <Facebook className="h-4 w-4" /> Connect your Meta account
                </a>
              )}
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-line px-5 py-3 text-sm font-medium transition hover:border-brand-500/40"
              >
                Explore the live demo <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[12px] text-faint">
              {["Read-only permissions", "Long-lived tokens", "No data written to disk", "CSV export"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-pos" /> {t}</span>
              ))}
            </div>

            {!config.configured ? (
              <p className="mt-6 rounded-xl border border-warn/25 bg-warn/5 px-4 py-3 text-[12px] text-muted">
                <span className="font-semibold text-warn">Credentials not set.</span> Add META_APP_ID and META_APP_SECRET to
                <code className="mx-1 rounded bg-ink/5 px-1.5 py-0.5">.env.local</code>
                to enable the live connection — the demo works either way.
              </p>
            ) : null}
          </div>

          {/* Hero preview */}
          <div className="animate-fade-up [animation-delay:120ms]">
            <Panel className="overflow-hidden p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-faint">Amount spent</p>
                  <p className="num mt-1 text-3xl font-semibold">₹4.28L</p>
                </div>
                <span className="rounded-full bg-pos/10 px-2.5 py-1 text-[11px] font-semibold text-pos">+18.4%</span>
              </div>
              <div className="mt-5 flex h-28 items-end gap-1.5">
                {[38, 52, 44, 61, 57, 72, 66, 58, 74, 69, 83, 78, 92, 88, 96, 84, 97, 90].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-md"
                    style={{
                      height: `${h}%`,
                      background: `linear-gradient(180deg, hsl(var(--chart-1) / ${0.35 + (h / 100) * 0.6}), hsl(var(--chart-2) / ${0.15 + (h / 100) * 0.4}))`,
                    }}
                  />
                ))}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { label: "Results", value: "3,182" },
                  { label: "CPA", value: "₹134" },
                  { label: "ROAS", value: "3.42×" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-line/70 px-2.5 py-2">
                    <p className="text-[10px] uppercase tracking-wide text-faint">{s.label}</p>
                    <p className="num text-[15px] font-semibold">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-2">
                {[
                  ["Mumbai — High Intent Leads", 68, "₹98"],
                  ["Catalog Sales — Advantage+", 92, "₹412"],
                  ["Retargeting — Cart Abandoners", 54, "₹186"],
                  ["Video Views — Brand Film", 22, "—"],
                ].map(([label, width, value]) => (
                  <div key={label as string}>
                    <div className="mb-1 flex justify-between text-[11px]">
                      <span className="truncate text-muted">{label}</span>
                      <span className="num text-faint">{value}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ink/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-2 rounded-xl border border-brand-500/20 bg-brand-500/5 p-3">
                <Sparkles className="h-4 w-4 shrink-0 text-brand-500" />
                <p className="text-[11px] text-muted">
                  <span className="font-semibold text-ink">Shift ₹1,260/day</span> from “Video Views” to “Retargeting” — projected +41 results at the same budget.
                </p>
              </div>
            </Panel>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-14">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Reporting that goes deeper than Ads Manager</h2>
          <p className="mt-3 text-sm text-muted">
            Six report surfaces, one connected account, and a recommendation engine that tells you what to change next.
          </p>
        </div>
        <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Panel key={f.title} className="panel-hover p-5">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/10 text-brand-500 ring-1 ring-brand-500/20">
                {f.icon}
              </div>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{f.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{f.body}</p>
            </Panel>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-line/60 bg-ink/[0.015]">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Live in three steps</h2>
              <p className="mt-3 text-sm text-muted">
                OAuth handled end to end: short-lived tokens are exchanged for long-lived tokens, then stored in a
                signed httpOnly cookie. Reports are cached for five minutes to stay inside Meta's rate limits.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {["Next.js 15", "React 19", "Tailwind CSS", "Recharts", "Meta Graph API"].map((t) => (
                  <span key={t} className="rounded-full border border-line px-3 py-1 text-[11px] text-muted">{t}</span>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              {STEPS.map((s, i) => (
                <Panel key={s.title} className="flex items-start gap-4 p-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent text-sm font-semibold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold tracking-tight">{s.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.body}</p>
                  </div>
                </Panel>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="connect" className="mx-auto max-w-6xl px-5 py-16">
        <Panel className="relative overflow-hidden p-8 text-center sm:p-12">
          <div className="absolute inset-x-0 -top-24 mx-auto h-48 w-[70%] rounded-full bg-brand-500/20 blur-3xl" />
          <div className="relative">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 via-accent to-accent-2 text-white shadow-glow">
              <Gauge className="h-5 w-5" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">Ready to see your own numbers?</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted">
              Connect an ad account for live reporting, or explore the full product right now with a realistic demo
              account — no setup required.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <a
                href="/api/meta/login"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent px-5 py-3 text-sm font-semibold text-white shadow-glow transition hover:opacity-90"
              >
                <Facebook className="h-4 w-4" /> Connect Meta
              </a>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-line px-5 py-3 text-sm font-medium transition hover:border-brand-500/40"
              >
                <Layers className="h-4 w-4" /> Explore demo dashboard
              </Link>
            </div>
            <p className="mt-5 inline-flex items-center gap-1.5 text-[11px] text-faint">
              <ShieldCheck className="h-3.5 w-3.5" /> Read-only access · disconnect any time
            </p>
          </div>
        </Panel>
      </section>

      <footer className="border-t border-line/60 px-5 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-[11px] text-faint">
          <p>MetaInsight — an independent analytics client for the Meta Marketing API.</p>
          <p>Not affiliated with, endorsed by or sponsored by Meta Platforms, Inc.</p>
        </div>
      </footer>
    </div>
  );
}
