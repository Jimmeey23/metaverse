"use client";
import * as React from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { usePathname } from "next/navigation";

export function AppShell({
  accounts, mode, userName, userPicture, generatedAt, children,
}: {
  accounts: { id: string; name: string; currency: string }[];
  mode: "live" | "demo";
  userName: string;
  userPicture?: string;
  generatedAt?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="app-canvas flex min-h-screen">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen shrink-0 print:hidden lg:block">
        <Sidebar mode={mode} userName={userName} userPicture={userPicture} />
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 print:hidden lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 animate-fade-up shadow-lift">
            <Sidebar mode={mode} userName={userName} userPicture={userPicture} onClose={() => setOpen(false)} />
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar accounts={accounts} mode={mode} onMenu={() => setOpen(true)} generatedAt={generatedAt} />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-4 pb-12 pt-5 sm:px-6 lg:px-8">
          {children}
        </main>
        <footer className="border-t border-line px-4 py-4 text-center text-[11px] text-faint print:hidden sm:px-6 lg:px-8">
          {mode === "demo"
            ? "Showing sample data — connect a Meta ad account to see live reporting."
            : "Data via the Meta Marketing API. Not affiliated with Meta Platforms, Inc."}
        </footer>
      </div>
    </div>
  );
}
