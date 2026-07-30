import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Kendry & Slate practice-management system.
// Served from rose.lawyer/firm so it shares an origin — and therefore a
// Supabase auth session — with Rose. Formerly a Lovable project; the Lovable
// tagger and MCP plugin have been removed (the MCP surface is now Rose's
// authenticated /mcp-server, not a public endpoint on this app).
export default defineConfig(() => ({
  base: "/firm/",
  server: { host: "::", port: 8080 },
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  define: { __BUILD_TIME__: JSON.stringify(new Date().toISOString()) },
}));
