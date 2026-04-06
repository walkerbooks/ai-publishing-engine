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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
