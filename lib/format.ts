const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", INR: "₹", JPY: "¥", AUD: "A$", CAD: "C$", SGD: "S$", AED: "AED ", BRL: "R$",
};

export function currency(value: number, code = "USD", opts: { compact?: boolean; decimals?: number } = {}) {
  const { compact = false, decimals } = opts;
  const symbol = CURRENCY_SYMBOL[code] ?? `${code} `;
  const abs = Math.abs(value);
  let n = value;
  let suffix = "";
  if (compact && abs >= 1000) {
    if (abs >= 1_000_000) { n = value / 1_000_000; suffix = "M"; }
    else if (abs >= 1_000) { n = value / 1_000; suffix = "K"; }
  }
  const d = decimals ?? (compact ? (Math.abs(n) >= 100 ? 1 : Math.abs(n) >= 10 ? 1 : 2) : abs >= 100 ? 0 : 2);
  const formatted = n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  return `${value < 0 ? "-" : ""}${symbol}${formatted}${suffix}`;
}

export function num(value: number, decimals = 0) {
  if (!isFinite(value)) return "—";
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export function compact(value: number, decimals = 1) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(decimals)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(decimals)}M`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(0)}K`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(decimals)}K`;
  return num(value, abs < 10 && !Number.isInteger(value) ? 1 : 0);
}

export function pct(value: number, decimals = 2) {
  if (!isFinite(value)) return "—";
  return `${value.toFixed(decimals)}%`;
}

export function delta(value: number | null | undefined, decimals = 1) {
  if (value === null || value === undefined || !isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}%`;
}

export function shortDate(iso: string) {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function longDate(iso: string) {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function dateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function relative(iso: string | null | undefined) {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return longDate(iso);
}

export function eventLabel(event: string) {
  const map: Record<string, string> = {
    PageView: "Page View",
    ViewContent: "View Content",
    AddToCart: "Add to Cart",
    InitiateCheckout: "Initiate Checkout",
    AddPaymentInfo: "Add Payment Info",
    Purchase: "Purchase",
    Lead: "Lead",
    CompleteRegistration: "Complete Registration",
    Contact: "Contact",
    Subscribe: "Subscribe",
    CustomizeProduct: "Customize Product",
    Search: "Search",
    AddToWishlist: "Add to Wishlist",
    Schedule: "Schedule",
    StartTrial: "Start Trial",
    SubmitApplication: "Submit Application",
  };
  return map[event] ?? event.replace(/_/g, " ");
}

export function objectiveLabel(objective: string) {
  const map: Record<string, string> = {
    OUTCOME_AWARENESS: "Awareness",
    OUTCOME_ENGAGEMENT: "Engagement",
    OUTCOME_TRAFFIC: "Traffic",
    OUTCOME_LEADS: "Leads",
    OUTCOME_SALES: "Sales",
    OUTCOME_APP_PROMOTION: "App promotion",
    LINK_CLICKS: "Traffic",
    CONVERSIONS: "Sales",
    LEAD_GENERATION: "Leads",
    BRAND_AWARENESS: "Awareness",
    REACH: "Reach",
    VIDEO_VIEWS: "Video views",
    POST_ENGAGEMENT: "Engagement",
    MESSAGES: "Messages",
    PRODUCT_CATALOG_SALES: "Catalog sales",
    STORE_VISITS: "Store visits",
  };
  return map[objective] ?? objective.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export function rankingLabel(r?: string | null) {
  if (!r || r === "UNKNOWN") return "—";
  if (r.includes("ABOVE_AVERAGE_100")) return "Top 10%";
  if (r.includes("ABOVE_AVERAGE_75")) return "Above avg";
  if (r.includes("AVERAGE_50")) return "Average";
  if (r.includes("BELOW_AVERAGE")) return "Below avg";
  return r.replace(/_/g, " ");
}

export function rankingTone(r?: string | null) {
  if (!r || r === "UNKNOWN") return "text-faint";
  if (r.includes("ABOVE_AVERAGE_100")) return "text-pos";
  if (r.includes("ABOVE_AVERAGE_75")) return "text-pos/80";
  if (r.includes("AVERAGE_50")) return "text-warn";
  if (r.includes("BELOW_AVERAGE")) return "text-neg";
  return "text-faint";
}
