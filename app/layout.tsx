import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/shell/providers";

export const metadata: Metadata = {
  title: "MetaInsight — Meta Ads Intelligence",
  description:
    "Connect your Meta ad account and get modern, advanced reporting: performance trends, campaign analytics, leads, pixel diagnostics and actionable suggestions.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0d16" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-bg text-ink antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
