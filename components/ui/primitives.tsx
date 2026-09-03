import * as React from "react";
import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export function Panel({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("panel", className)} {...props}>
      {children}
    </div>
  );
}

export function PanelHeader({
  title, subtitle, icon, right, className,
}: { title: React.ReactNode; subtitle?: React.ReactNode; icon?: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 px-5 pt-5", className)}>
      <div className="flex items-start gap-3">
        {icon ? <div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-500 ring-1 ring-brand-500/20">{icon}</div> : null}
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h2 className={cn("text-xs font-semibold uppercase tracking-[0.14em] text-faint", className)}>{children}</h2>;
}

export function Badge({
  children, tone = "neutral", className,
}: { children: React.ReactNode; tone?: "neutral" | "brand" | "pos" | "neg" | "warn" | "info"; className?: string }) {
  const tones: Record<string, string> = {
    neutral: "bg-ink/5 text-muted ring-line",
    brand: "bg-brand-500/10 text-brand-500 ring-brand-500/25",
    pos: "bg-pos/10 text-pos ring-pos/25",
    neg: "bg-neg/10 text-neg ring-neg/25",
    warn: "bg-warn/10 text-warn ring-warn/25",
    info: "bg-info/10 text-info ring-info/25",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Delta({
  value, invert = false, suffix = "%", className, showIcon = true,
}: { value: number | null | undefined; invert?: boolean; suffix?: string; className?: string; showIcon?: boolean }) {
  if (value === null || value === undefined || !isFinite(value)) {
    return <span className={cn("text-[11px] font-medium text-faint", className)}>—</span>;
  }
  const rounded = Math.round(value * 10) / 10;
  const flat = Math.abs(rounded) < 0.05;
  const good = invert ? rounded < 0 : rounded > 0;
  const tone = flat ? "text-faint" : good ? "text-pos" : "text-neg";
  const bg = flat ? "bg-ink/5" : good ? "bg-pos/10" : "bg-neg/10";
  const Icon = flat ? Minus : rounded > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold num", bg, tone, className)}>
      {showIcon ? <Icon className="h-3 w-3" /> : null}
      {flat ? "0" : `${rounded > 0 ? "+" : ""}${rounded}`}{suffix}
    </span>
  );
}

export function ProgressBar({ value, max = 100, className, barClassName }: { value: number; max?: number; className?: string; barClassName?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-ink/10", className)}>
      <div className={cn("h-full rounded-full bg-gradient-to-r from-brand-500 to-accent", barClassName)} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div
      className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white", className)}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 52%), hsl(${(hue + 48) % 360} 70% 46%))` }}
    >
      {initials || "?"}
    </div>
  );
}

export function Sparkline({
  data, height = 34, width = 120, stroke = "hsl(var(--brand-500))", gradientId, className, strokeWidth = 1.6,
}: { data: number[]; height?: number; width?: number; stroke?: string; gradientId?: string; className?: string; strokeWidth?: number }) {
  const id = gradientId ?? `spark-${Math.abs(Math.round((data[0] ?? 1) * 1000))}-${data.length}`;
  if (!data.length) return <div style={{ height, width }} className={className} />;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = width / Math.max(data.length - 1, 1);
  const points = data.map((v, i) => [i * step, height - ((v - min) / span) * (height - 4) - 2]);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn("overflow-visible", className)} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1][0]} cy={points[points.length - 1][1]} r="2.2" fill={stroke} />
    </svg>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      {icon ? <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-500">{icon}</div> : null}
      <div>
        <p className="text-sm font-semibold">{title}</p>
        {description ? <p className="mx-auto mt-1 max-w-md text-xs text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function KeyValue({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 py-1.5 text-sm", className)}>
      <span className="text-muted">{label}</span>
      <span className="num font-medium">{value}</span>
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-line", className)} />;
}

export function ScoreGauge({
  score, size = 132, label = "Account health", className,
}: { score: number; size?: number; label?: string; className?: string }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const tone = clamped >= 75 ? "hsl(var(--pos))" : clamped >= 50 ? "hsl(var(--warn))" : "hsl(var(--neg))";
  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg viewBox="0 0 130 130" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id={`gauge-${clamped}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--brand-500))" />
            <stop offset="100%" stopColor={tone} />
          </linearGradient>
        </defs>
        <circle cx="65" cy="65" r={radius} fill="none" stroke="hsl(var(--ink) / 0.08)" strokeWidth="9" />
        <circle
          cx="65" cy="65" r={radius} fill="none" stroke={`url(#gauge-${clamped})`} strokeWidth="9"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <p className="num text-2xl font-semibold leading-none">{clamped}</p>
        <p className="mt-1 text-[10px] uppercase tracking-wide text-faint">{label}</p>
      </div>
    </div>
  );
}

export function Callout({
  tone = "info", icon, title, children, action, className,
}: {
  tone?: "info" | "warn" | "brand" | "pos";
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: "border-info/25 bg-info/5 text-info",
    warn: "border-warn/25 bg-warn/5 text-warn",
    brand: "border-brand-500/25 bg-brand-500/5 text-brand-500",
    pos: "border-pos/25 bg-pos/5 text-pos",
  };
  return (
    <div className={cn("flex flex-wrap items-center gap-3 rounded-2xl border px-4 py-3", tones[tone], className)}>
      {icon ? <span className="shrink-0">{icon}</span> : null}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        {children ? <div className="mt-0.5 text-[12px] text-muted">{children}</div> : null}
      </div>
      {action}
    </div>
  );
}
