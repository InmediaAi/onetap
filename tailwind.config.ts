import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // OneTap Atelier palette — modern black & white editorial.
        // Crisp white surfaces, near-black ink, neutral greys. Black is the accent.
        noir: "#111111",
        ivory: "#FFFFFF",
        stone: "#8A8A8A", // accent → neutral mid grey
        taupe: "#6B6B6B",
        rose: "#EDEDED",
        ivoryPanel: "#F5F5F5",
        ivoryDeep: "#EDEDED",
        noirRaise: "#1A1A1A",
        noirLine: "#2A2A2A",
        // Legacy aliases kept so existing utility classes re-theme automatically.
        canvas: "#FFFFFF", // → ivory
        ink: "#111111", // → noir
        muted: "#6B6B6B", // → taupe
        hairline: "rgba(0, 0, 0, 0.1)", // → stone-soft
      },
      fontFamily: {
        display: ["var(--font-display)", "'Helvetica Neue'", "Arial", "sans-serif"],
        sans: ["'Helvetica Neue'", "Helvetica", "Arial", "sans-serif"],
      },
      maxWidth: {
        editorial: "1440px",
      },
      letterSpacing: {
        luxe: "0.18em",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.6s ease forwards",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
