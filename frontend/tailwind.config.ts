import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        signal: {
          blue: "#3A76F0",
          "blue-dark": "#2C6BED",
          bubbleSent: "#3A76F0",
          // token-driven so they flip with the .dark class (see globals.css)
          bubbleReceived: "var(--sig-bubble-received)",
          bg: "var(--sig-bg)",
          panel: "var(--sig-panel)",
          border: "var(--sig-border)",
          text: "var(--sig-text)",
          textMuted: "var(--sig-text-muted)",
          online: "#3AC15C",
        },
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
