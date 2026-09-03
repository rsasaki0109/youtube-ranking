// Copies repo data JSON into public/data/ so Vite serves/bundles it.
// Falls back to data/sample/ when generated data is missing (fresh clone).
/* global console */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "data");
mkdirSync(outDir, { recursive: true });

for (const file of ["rankings.json", "latest.json"]) {
  const primary = join(root, "data", file);
  const fallback = join(root, "data", "sample", file);
  const src = existsSync(primary) ? primary : fallback;
  if (!existsSync(src)) {
    console.warn(`[copy-data] missing ${src}, skipping`);
    continue;
  }
  copyFileSync(src, join(outDir, file));
  console.log(`[copy-data] ${src} -> public/data/${file}`);
}
