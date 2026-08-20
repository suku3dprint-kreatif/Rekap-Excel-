import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        accent: {
          50: "#eef4ff",
          100: "#dce8ff",
          200: "#b8d0ff",
          300: "#8bb2ff",
          400: "#5b8bff",
          500: "#3763f4",
          600: "#2848d6",
          700: "#2138ab",
          800: "#1f3288",
          900: "#1e2f6e",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        DEFAULT: "6px",
      },
    },
  },
  plugins: [],
};

export default config;
