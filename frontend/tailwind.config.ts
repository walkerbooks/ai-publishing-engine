import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: "hsl(var(--accent))",
        bubble: { user: "#1e3a5f" },
        walker: {
          charcoal: "#1a2332",
          navy: "#2d4a6b",
          teal: "#3ecfaa",
          mist: "#e8eef4",
          slate: "#7a9ab5",
          /** Solid dark surfaces (no gradient). */
          night: "#0D1B2A",
          /** Outline / preview cards on dark — deeper blue than grey neutrals. */
          nightPanel: "#112236",
        },
      },
      backgroundImage: {
        /** Full spectrum accent strip (page top, progress) — full brand range. */
        "walker-signature":
          "linear-gradient(135deg, #1a2332 0%, #2d4a6b 50%, #3ecfaa 100%)",
        /** Pale horizon — light hero / content. */
        "walker-signature-soft":
          "linear-gradient(135deg, #e8eef4 0%, #dde8f2 50%, #c5e8dc 100%)",
        /** Dark: accent gradient — use sparingly (e.g. outline column bottom-right). */
        "walker-hero-night":
          "linear-gradient(135deg, #0D1B2A 0%, #112236 60%, #0D4A3A 100%)",
        "walker-nav":
          "linear-gradient(135deg, #0D1B2A 0%, #112236 60%, #0D4A3A 100%)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float-soft": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        bob: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-5px) rotate(1.5deg)" },
        },
        "path-draw": {
          "0%": { "stroke-dashoffset": "120" },
          "100%": { "stroke-dashoffset": "0" },
        },
        "sand-fall": {
          "0%": { transform: "translateY(0)", opacity: "0.85" },
          "100%": { transform: "translateY(18px)", opacity: "0.15" },
        },
        "gear-spin": {
          to: { transform: "rotate(360deg)" },
        },
        "writing-line": {
          "0%, 100%": { "stroke-dashoffset": "0", opacity: "1" },
          "50%": { "stroke-dashoffset": "40", opacity: "0.45" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float-soft": "float-soft 4.5s ease-in-out infinite",
        bob: "bob 3.8s ease-in-out infinite",
        "path-draw": "path-draw 2.8s ease-in-out infinite alternate",
        "sand-fall": "sand-fall 2.2s ease-in infinite",
        "gear-spin": "gear-spin 14s linear infinite",
        "writing-line": "writing-line 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
