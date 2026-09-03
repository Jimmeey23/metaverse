"use client";
import * as React from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const options = [
    { key: "light", icon: Sun, label: "Light" },
    { key: "dark", icon: Moon, label: "Dark" },
    { key: "system", icon: Monitor, label: "System" },
  ];
  return (
    <div className="flex items-center gap-0.5 rounded-full border border-line bg-surface/60 p-0.5">
      {options.map(({ key, icon: Icon, label }) => {
        const active = mounted && (key === "system" ? theme === "system" : theme === key);
        return (
          <button
            key={key}
            title={`${label} theme`}
            aria-label={`${label} theme`}
            onClick={() => setTheme(key)}
            className={cn(
              "grid h-7 w-7 place-items-center rounded-full transition-all",
              active ? "bg-brand-500 text-white shadow-glow" : "text-faint hover:text-ink",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
      <span className="sr-only">{mounted ? `Active theme: ${resolvedTheme ?? theme}` : ""}</span>
    </div>
  );
}
