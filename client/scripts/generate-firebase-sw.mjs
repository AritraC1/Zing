// Generates public/firebase-messaging-sw.js from the Firebase web
// config in the environment (client/.env, falling back to the repo
// root .env). Run automatically via the `predev`/`prebuild` scripts.
//
// The SW runs detached from the app bundle, so it cannot use
// import.meta.env — the config must be inlined at generation time.
// These values are public client identifiers (same ones the browser
// bundle already ships), not secrets.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const clientRoot = join(here, "..");
const repoRoot = join(clientRoot, "..");

const templatePath = join(here, "firebase-messaging-sw.template.js");
const outPath = join(clientRoot, "public", "firebase-messaging-sw.js");

// Later files win; .env in client/ overrides the repo root .env.
const envFiles = [join(repoRoot, ".env"), join(clientRoot, ".env")];
const env = {};

for (const file of envFiles) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const value = match[2].trim().replace(/^["']|["']$/g, "");
    if (value !== "") env[match[1]] = value;
  }
}

// Process env wins over files (CI overrides).
Object.assign(env, process.env);

const map = {
  __FIREBASE_API_KEY__: env.VITE_FIREBASE_API_KEY || "",
  __FIREBASE_AUTH_DOMAIN__: env.VITE_FIREBASE_AUTH_DOMAIN || "",
  __FIREBASE_PROJECT_ID__: env.VITE_FIREBASE_PROJECT_ID || "",
  __FIREBASE_STORAGE_BUCKET__: env.VITE_FIREBASE_STORAGE_BUCKET || "",
  __FIREBASE_MESSAGING_SENDER_ID__: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  __FIREBASE_APP_ID__: env.VITE_FIREBASE_APP_ID || "",
};

let template = readFileSync(templatePath, "utf8");
for (const [placeholder, value] of Object.entries(map)) {
  template = template.replaceAll(placeholder, value);
}

writeFileSync(outPath, template);

const missing = Object.entries(map)
  .filter(([, v]) => v === "")
  .map(([k]) => k);

if (missing.length > 0) {
  console.warn(
    `[generate-firebase-sw] missing Firebase config: ${missing.join(", ")} — push notifications will not work until these VITE_FIREBASE_* vars are set.`,
  );
} else {
  console.log("[generate-firebase-sw] public/firebase-messaging-sw.js written");
}
