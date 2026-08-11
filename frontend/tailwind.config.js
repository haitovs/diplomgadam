/**
 * Warm editorial palette. Two families do all the work:
 *
 *   sand  — warm neutrals for surfaces, borders and text. Replaces the cool
 *           blue-grey, which made food photography look cold.
 *   clay  — a terracotta accent that belongs next to food.
 *
 * Every pairing used in the interface was checked rather than eyeballed:
 * clay-600 carries white text at 5.83:1, clay-600 on cream reads at 5.45:1,
 * and clay-400 on the dark surface reads at 6.36:1.
 */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: {
          50: "#FDFCFA",
          100: "#FAF7F2",
          200: "#F3EDE3",
          300: "#E7DFD3",
          400: "#D6CABA",
          500: "#B3A695",
          600: "#8A8075",
          700: "#6B6257",
          800: "#3A342C",
          900: "#231E19",
          950: "#17130F",
        },
        clay: {
          50: "#FDF6F1",
          100: "#FAE9DD",
          200: "#F3CDB4",
          300: "#E9A882",
          400: "#DD7F4F",
          500: "#C85C2A",
          600: "#AB4520",
          700: "#8A3618",
          800: "#6B2A14",
          900: "#4E1F10",
        },
        // Kept so any stragglers still compile; new work should use clay.
        brand: {
          50: "#FDF6F1",
          100: "#FAE9DD",
          200: "#F3CDB4",
          300: "#E9A882",
          400: "#DD7F4F",
          500: "#C85C2A",
          600: "#AB4520",
          700: "#8A3618",
          800: "#6B2A14",
          900: "#4E1F10",
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', "Georgia", "serif"],
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        // A display scale with tightened tracking, for headings only.
        "display-sm": ["1.75rem", { lineHeight: "1.15", letterSpacing: "-0.01em" }],
        "display-md": ["2.25rem", { lineHeight: "1.1", letterSpacing: "-0.015em" }],
        "display-lg": ["3rem", { lineHeight: "1.05", letterSpacing: "-0.02em" }],
        "display-xl": ["3.75rem", { lineHeight: "1", letterSpacing: "-0.025em" }],
      },
      borderRadius: {
        card: "1rem",
        panel: "1.5rem",
      },
      boxShadow: {
        // Warm-tinted rather than neutral black, so shadows sit on cream
        // instead of greying it.
        soft: "0 1px 2px rgba(35, 30, 25, 0.04), 0 2px 8px rgba(35, 30, 25, 0.04)",
        lifted: "0 2px 4px rgba(35, 30, 25, 0.04), 0 12px 28px rgba(35, 30, 25, 0.08)",
        deep: "0 4px 8px rgba(35, 30, 25, 0.06), 0 24px 48px rgba(35, 30, 25, 0.12)",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
