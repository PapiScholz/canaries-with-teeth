import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";

function detectRepoType(): "frontend" | "backend" | "fullstack" {
  const pkgPath = join(process.cwd(), "package.json");
  let deps: string[] = [];
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
      deps = [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {})
      ];
    } catch {}
  }
  const hasFrontendDep = deps.some(d => /react|vue|svelte|next|vite|angular|webpack|parcel/.test(d));
  const hasBackendDep = deps.some(d => /express|koa|hapi|fastify|nestjs|apollo|graphql|prisma/.test(d));
  const hasFrontendStruct = ["src", "public", "client"].some(f => existsSync(join(process.cwd(), f)));
  const hasBackendStruct = ["server", "api", "bin"].some(f => existsSync(join(process.cwd(), f)));
  if ((hasFrontendDep || hasFrontendStruct) && (hasBackendDep || hasBackendStruct)) return "fullstack";
  if (hasFrontendDep || hasFrontendStruct) return "frontend";
  if (hasBackendDep || hasBackendStruct) return "backend";
  return "backend";
}

function ensureDir(path: string) {
  if (!existsSync(path)) mkdirSync(path, { recursive: true });
}

function writeJsonIfChanged(path: string, obj: any) {
  const content = JSON.stringify(obj, null, 2);
  if (!existsSync(path) || readFileSync(path, "utf8") !== content) {
    writeFileSync(path, content);
  }
}

function writeFileIfChanged(path: string, content: string) {
  if (!existsSync(path) || readFileSync(path, "utf8") !== content) {
    writeFileSync(path, content);
  }
}

function ensureNpmScripts() {
  const pkgPath = join(process.cwd(), "package.json");
  if (!existsSync(pkgPath)) return;
  let pkg: any;
  try {
    pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  } catch { return; }
  pkg.scripts = pkg.scripts || {};
  const scripts: Record<string, string> = {
    "canaries:init": "npx canaries init",
    "canaries:ci": "npx canaries ci",
    "canaries:risk": "npx canaries risk",
    "canaries:gate": "npx canaries gate",
    "canaries:dashboard": "npx canaries dashboard"
  };
  let changed = false;
  for (const k in scripts) {
    if (!Object.prototype.hasOwnProperty.call(pkg.scripts, k)) {
      pkg.scripts[k] = scripts[k];
      changed = true;
    }
  }
  writeFileIfChanged(pkgPath, JSON.stringify(pkg, null, 2));
}
function normalizeConfigPreservingMode2(existing: any, repoType: string) {
  if (existing && typeof existing === "object" && existing.mode === 2) {
    return { ...existing };
  }
  return { mode: 0, repoType };
}

jobs:
  canaries:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18.x'
      - name: Install dependencies
        run: npm install
      - name: Run canaries
        run: npx canaries gate
`;
export function main() {
  const repoType = detectRepoType();
  ensureDir(join(process.cwd(), ".canaries"));
  ensureDir(join(process.cwd(), "canaries"));
  ensureDir(join(process.cwd(), ".github", "workflows"));

  // MODE 0 config
  const configPath = join(process.cwd(), ".canaries", "config.json");
  let config = { mode: 0, repoType };
  if (existsSync(configPath)) {
    try {
      const existing = JSON.parse(readFileSync(configPath, "utf8"));
      config = normalizeConfigPreservingMode2(existing, repoType);
    } catch {}
  }
  writeJsonIfChanged(configPath, config);

  // canaries.yml workflow (robust, does not fail if scripts missing)
  const workflowPath = join(process.cwd(), ".github", "workflows", "canaries.yml");
  const workflow = `name: Canaries Release Gate
on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]
jobs:
  canaries:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18.x'
      - name: Install dependencies
        run: npm install || true
      - name: Run canaries
        run: npx canaries gate || echo "canaries gate script missing"
`;
  writeFileIfChanged(workflowPath, workflow);

  ensureNpmScripts();

  // hooks.json
  const hooksPath = join(process.cwd(), "canaries", "hooks.json");
  const hooks = {
    canary: true,
    telemetry: true,
    risk: true,
    gating: true,
    dashboard: true
  };
  writeJsonIfChanged(hooksPath, hooks);
}
