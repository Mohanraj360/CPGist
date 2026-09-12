import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f1115",
        panel: "#161922",
        accent: "#4f7cff",
        muted: "#8890a4",
      },
    },
  },
  plugins: [],
};
export default config;
