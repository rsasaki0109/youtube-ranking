import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Base path for GitHub Project Pages (https://<owner>/<repo>/).
// - On GitHub Actions, derive "/<repo>/" from GITHUB_REPOSITORY so forks work
//   without editing config.
// - Locally (dev / preview), serve from "/" unless VITE_BASE is set.
function resolveBase(): string {
  if (process.env.VITE_BASE) return process.env.VITE_BASE;
  const repo = process.env.GITHUB_REPOSITORY; // e.g. "octocat/youtube-ranking"
  if (process.env.GITHUB_ACTIONS === "true" && repo && repo.includes("/")) {
    return `/${repo.split("/")[1]}/`;
  }
  return "/";
}

export default defineConfig({
  base: resolveBase(),
  plugins: [react(), tailwindcss()],
});
