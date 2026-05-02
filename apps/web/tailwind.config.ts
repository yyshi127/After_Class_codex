import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        serenity: {
          bg: "#eef5f7",
          surface: "#f7fbfc",
          ink: "#25313b",
          muted: "#6f7f8c",
          blue: "#8eb8d8",
          mint: "#95d9c3",
          peach: "#f6c7ad",
        },
      },
      boxShadow: {
        neumorphic: "10px 10px 24px rgba(139, 158, 169, 0.26), -10px -10px 24px rgba(255, 255, 255, 0.86)",
        insetSoft: "inset 6px 6px 14px rgba(139, 158, 169, 0.18), inset -6px -6px 14px rgba(255, 255, 255, 0.9)",
      },
    },
  },
  plugins: [],
};

export default config;
