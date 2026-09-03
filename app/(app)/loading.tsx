import * as React from "react";
import { Panel } from "@/components/ui/primitives";

function Bar({ className }: { className?: string }) {
  return <div className={`skeleton rounded-md ${className ?? ""}`} />;
}

export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <div className="flex items-baseline justify-between gap-3">
        <div className="space-y-2">
          <Bar className="h-5 w-52" />
          <Bar className="h-3 w-72" />
        </div>
        <Bar className="h-3 w-32" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Panel key={i} className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Bar className="h-2.5 w-20" />
                <Bar className="h-6 w-24" />
              </div>
              <Bar className="h-9 w-9 rounded-xl" />
            </div>
            <div className="mt-4 flex items-end justify-between">
              <Bar className="h-3 w-16" />
              <Bar className="h-8 w-24" />
            </div>
          </Panel>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="p-5 xl:col-span-2">
          <Bar className="h-4 w-40" />
          <Bar className="mt-2 h-3 w-64" />
          <Bar className="mt-6 h-[300px] w-full rounded-xl" />
        </Panel>
        <Panel className="p-5">
          <Bar className="h-4 w-32" />
          <Bar className="mt-6 h-[132px] w-full rounded-xl" />
          <Bar className="mt-4 h-3 w-full" />
          <Bar className="mt-2 h-3 w-5/6" />
        </Panel>
      </div>

      <Panel className="p-5">
        <Bar className="h-4 w-48" />
        <Bar className="mt-2 h-3 w-80" />
        <div className="mt-5 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Bar key={i} className="h-9 w-full" />
          ))}
        </div>
      </Panel>

      <p className="text-center text-[11px] text-faint">Loading report…</p>
    </div>
  );
}
