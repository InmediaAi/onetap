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
        // OneTap Atelier palette — drawn from the brand guidelines.
        // No pure white/black. Warm Stone is the sole accent.
        noir: "#1A1814",
        ivory: "#F5F0E8",
        stone: "#C8B89A",
        taupe: "#8C7B6B",
        rose: "#E8D5C4",
        ivoryPanel: "#EDE5D8",
        ivoryDeep: "#E7DECF",
        noirRaise: "#221F1A",
        noirLine: "#312C25",
        // Legacy aliases kept so existing utility classes re-theme automatically.
        canvas: "#F5F0E8", // → ivory
        ink: "#1A1814", // → noir
        muted: "#8C7B6B", // → taupe
        hairline: "rgba(200, 184, 154, 0.32)", // → stone-soft
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "Georgia", "serif"],
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
