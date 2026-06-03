import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** GitHub Pages: https://mavix237.github.io/my-mess/ */
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE ?? "/",
});
