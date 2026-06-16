import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Deploy at the site root (Netlify / Vercel / Cloudflare Pages).
  // If you deploy under a sub-path (e.g. GitHub Pages /repo/), set base to "/repo/".
  base: "/",
});
