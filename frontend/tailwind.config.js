/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0F172A",
          dark: "#0B0F19",
          light: "#1E293B",
        },
        steel: {
          DEFAULT: "#475569",
          light: "#94A3B8",
          dark: "#334155",
        },
        paper: "#F8FAFC",
        line: "#E2E8F0",
        teal: {
          50: "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          500: "#14B8A6",
          600: "#0D9488",
          700: "#0F766E",
          800: "#115E59",
          900: "#134E4A",
          DEFAULT: "#0D9488",
          dark: "#0F766E",
        },
        brand: {
          50: "#EEF2FF",
          100: "#E0E7FF",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
          DEFAULT: "#4F46E5",
        },
        moss: "#10B981",
        amber: "#F59E0B",
        rust: "#EF4444",
      },
      fontFamily: {
        display: ["'Outfit'", "'Plus Jakarta Sans'", "sans-serif"],
        sans: ["'Plus Jakarta Sans'", "'IBM Plex Sans'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.03)",
        glass: "0 8px 32px 0 rgba(15, 23, 42, 0.08)",
        glow: "0 0 20px -3px rgba(13, 148, 136, 0.35)",
        "glow-brand": "0 0 25px -5px rgba(79, 70, 229, 0.4)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "slide-up": "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-slow": "pulseSlow 2.5s infinite ease-in-out",
        "scan-line": "scanLine 2s infinite ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSlow: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(0.97)" },
        },
        scanLine: {
          "0%": { top: "0%" },
          "50%": { top: "95%" },
          "100%": { top: "0%" },
        },
      },
    },
  },
  plugins: [],
}
