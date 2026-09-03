import { loadReport } from "@/lib/data";
import { AdvancedAnalytics } from "@/components/panels/advanced-analytics";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ range?: string; since?: string; until?: string; account?: string }> }) {
  const sp = await searchParams;
  const { data } = await loadReport({ rangeKey: sp.range, since: sp.since, until: sp.until, accountId: sp.account });
  return <AdvancedAnalytics campaigns={data.campaigns} adSets={data.adSets} ads={data.ads} accountKpis={data.kpis} code={data.account.currency} />;
}
