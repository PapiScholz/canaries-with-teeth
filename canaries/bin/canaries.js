#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseArgs(argv) {
  const args = {};
  let lastKey = null;
  for (let i = 2; i < argv.length; ++i) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      lastKey = arg.slice(2);
      args[lastKey] = true;
    } else if (lastKey) {
      args[lastKey] = arg;
      lastKey = null;
    }
  }
  return args;
}

function readReport(reportPath) {
  try {
    return JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  } catch (e) {
    console.error('Failed to read report.json:', e.message);
    process.exit(1);
  }
}

function copyFile(src, dest) {
  fs.copyFileSync(src, dest);
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function renderTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || '');
}

function dashboardCmd(args) {
  const reportPath = args.report || path.resolve(process.cwd(), 'report.json');
  const outDir = args.out || path.resolve(process.cwd(), 'canary-dashboard');
  const title = args.title || 'Canary Dashboard';
  const templates = path.resolve(__dirname, '../templates');
  const report = readReport(reportPath);
  ensureDir(outDir);
  // Copy app.js and styles.css
  copyFile(path.join(templates, 'app.js'), path.join(outDir, 'app.js'));
  copyFile(path.join(templates, 'styles.css'), path.join(outDir, 'styles.css'));
  // Render index.html with embedded report
  const indexTmpl = fs.readFileSync(path.join(templates, 'index.html'), 'utf8');
  const indexHtml = renderTemplate(indexTmpl, {
    TITLE: title,
    REPORT: JSON.stringify(report)
  });
  fs.writeFileSync(path.join(outDir, 'index.html'), indexHtml);
  console.log('Dashboard generated at:', outDir);
}

function main() {
  const args = parseArgs(process.argv);
  const cmd = process.argv[2];
  if (cmd === 'dashboard') {
    dashboardCmd(args);
  } else {
    console.error('Usage: canaries dashboard [--report path] [--out dir] [--title title]');
    process.exit(1);
  }
}

main();
