import { existsSync, mkdirSync, writeFileSync, readFileSync } from "fs";
import { join } from "path";
function detectRepoType() {
    const hasFrontend = ["package.json", "src", "public", "client"].some(f => existsSync(join(process.cwd(), f)));
    const hasBackend = ["server", "api", "src", "bin"].some(f => existsSync(join(process.cwd(), f)));
    if (hasFrontend && hasBackend)
        return "fullstack";
    if (hasFrontend)
        return "frontend";
    if (hasBackend)
        return "backend";
    return "backend";
}
function ensureDir(path) {
    if (!existsSync(path))
        mkdirSync(path, { recursive: true });
}
function writeJsonIfChanged(path, obj) {
    const content = JSON.stringify(obj, null, 2);
    if (!existsSync(path) || readFileSync(path, "utf8") !== content) {
        writeFileSync(path, content);
    }
}
function writeFileIfChanged(path, content) {
    if (!existsSync(path) || readFileSync(path, "utf8") !== content) {
        writeFileSync(path, content);
    }
}
function ensureNpmScripts() {
    const pkgPath = join(process.cwd(), "package.json");
    if (!existsSync(pkgPath))
        return;
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    pkg.scripts = pkg.scripts || {};
    const scripts = {
        "canaries:init": "npx canaries init",
        "canaries:ci": "npx canaries ci",
        "canaries:risk": "npx canaries risk",
        "canaries:gate": "npx canaries gate",
        "canaries:dashboard": "npx canaries dashboard"
    };
    let changed = false;
    for (const k in scripts) {
        if (!pkg.scripts[k]) {
            pkg.scripts[k] = scripts[k];
            changed = true;
        }
    }
    if (changed)
        writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
}
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
            if (existing.mode === 2)
                config = existing;
        }
        catch { }
    }
    writeJsonIfChanged(configPath, config);
    // canaries.yml workflow
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
        run: npm install
      - name: Run canaries
        run: npx canaries gate
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
