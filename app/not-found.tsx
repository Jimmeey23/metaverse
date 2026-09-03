import Link from "next/link";
import { Compass } from "lucide-react";
import { Panel } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-5">
      <Panel className="max-w-md p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-500">
          <Compass className="h-5 w-5" />
        </div>
        <h1 className="mt-4 text-xl font-semibold tracking-tight">Page not found</h1>
        <p className="mt-2 text-[13px] text-muted">The report you were looking for doesn’t exist or has moved.</p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent px-4 py-2.5 text-[13px] font-semibold text-white shadow-glow transition hover:opacity-90"
        >
          Back to dashboard
        </Link>
      </Panel>
    </div>
  );
}
