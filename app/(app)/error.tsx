"use client";
import * as React from "react";
import Link from "next/link";
import { AlertOctagon, RefreshCw } from "lucide-react";
import { Panel } from "@/components/ui/primitives";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl py-16">
      <Panel className="p-8 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-neg/10 text-neg">
          <AlertOctagon className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold tracking-tight">This report could not be generated</h2>
        <p className="mx-auto mt-2 max-w-md text-[13px] text-muted">
          {error.message || "Something went wrong while loading your ad data."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-500 to-accent px-4 py-2.5 text-[13px] font-semibold text-white shadow-glow transition hover:opacity-90"
          >
            <RefreshCw className="h-4 w-4" /> Try again
          </button>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-[13px] font-medium transition hover:border-brand-500/40"
          >
            Check connection
          </Link>
        </div>
        {error.digest ? <p className="mt-4 text-[10px] text-faint">Reference: {error.digest}</p> : null}
      </Panel>
    </div>
  );
}
