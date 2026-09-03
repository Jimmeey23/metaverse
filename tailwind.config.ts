import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "hsl(var(--bg) / <alpha-value>)",
        surface: "hsl(var(--surface) / <alpha-value>)",
        elevated: "hsl(var(--elevated) / <alpha-value>)",
        line: "hsl(var(--line) / <alpha-value>)",
        ink: "hsl(var(--ink) / <alpha-value>)",
        muted: "hsl(var(--muted) / <alpha-value>)",
        faint: "hsl(var(--faint) / <alpha-value>)",
        brand: {
          50: "hsl(var(--brand-50) / <alpha-value>)",
          400: "hsl(var(--brand-400) / <alpha-value>)",
          500: "hsl(var(--brand-500) / <alpha-value>)",
          600: "hsl(var(--brand-600) / <alpha-value>)",
        },
        accent: "hsl(var(--accent) / <alpha-value>)",
        accent2: "hsl(var(--accent-2) / <alpha-value>)",
        pos: "hsl(var(--pos) / <alpha-value>)",
        neg: "hsl(var(--neg) / <alpha-value>)",
        warn: "hsl(var(--warn) / <alpha-value>)",
        info: "hsl(var(--info) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: { xl2: "1.25rem", xl3: "1.75rem" },
      boxShadow: {
        soft: "0 1px 2px hsl(var(--shadow)/0.06), 0 8px 24px -12px hsl(var(--shadow)/0.18)",
        lift: "0 2px 6px hsl(var(--shadow)/0.08), 0 24px 48px -24px hsl(var(--shadow)/0.35)",
        glow: "0 0 0 1px hsl(var(--brand-500)/0.25), 0 12px 40px -12px hsl(var(--brand-500)/0.45)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "none" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        float: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
      },
      animation: {
        "fade-up": "fade-up .5s cubic-bezier(.21,1.02,.73,1) both",
        shimmer: "shimmer 1.6s infinite",
        float: "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
