"use client";
import * as React from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = React.useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface/60 px-2.5 py-1.5 text-[11px] font-medium transition hover:border-brand-500/40",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-pos" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : label}
    </button>
  );
}
