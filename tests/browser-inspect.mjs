import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const INSPECT = join(ROOT, 'skills/taste-skill/scripts/inspect.mjs');

function inspect(html, args = []) {
  const dir = mkdtempSync(join(tmpdir(), 'taste-inspect-'));
  const file = join(dir, 'index.html');
  const out = join(dir, 'out');
  writeFileSync(file, html);
  const result = spawnSync(process.execPath, [
    INSPECT, file, '--out', out, '--widths', '390', '--json', ...args,
  ], {
    cwd: dir,
    encoding: 'utf8',
    timeout: 90000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return { dir, result };
}

test('inspect reports a broken page with browser evidence', () => {
  const run = inspect(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Inspection test</title>
  <style>
    body { margin: 0; font-family: Georgia, serif; background: linear-gradient(#fff, #ddd); }
    .eyebrow { text-transform: uppercase; letter-spacing: .2em; font-size: 10px; }
    h1 { max-width: 220px; font-size: 54px; }
  </style>
</head>
<body>
  <p class="eyebrow">New product</p>
  <h1>A deliberately broken page that should fail the inspector</h1>
</body>
</html>`);
  try {
    assert.equal(run.result.status, 1, run.result.stdout + run.result.stderr);
    const report = JSON.parse(run.result.stdout);
    const ids = new Set(report.findings.map((finding) => finding.id));
    assert.equal(ids.has('eyebrow'), true);
    assert.equal(ids.has('headline-lines'), true);
    assert.equal(ids.has('edge-text'), true);
    assert.equal(existsSync(report.images[0].fold), true);
  } finally {
    rmSync(run.dir, { recursive: true, force: true });
  }
});

test('inspect keeps page-only findings out of an app-screen report', () => {
  const run = inspect(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Overview</title>
  <style>
    body { margin: 0; font: 14px/1.5 system-ui; }
    main { padding: 24px; }
  </style>
</head>
<body>
  <div class="app" data-ui>
    <main><h1>Overview</h1><p>Plan used: 72%.</p></main>
  </div>
</body>
</html>`, ['--app']);
  try {
    const report = JSON.parse(run.result.stdout);
    const ids = new Set(report.findings.map((finding) => finding.id));
    assert.notEqual(report.viewports[0].app, null);
    assert.equal(ids.has('few-pictures'), false);
    assert.equal(ids.has('no-footage'), false);
    assert.equal(ids.has('still-page'), false);
  } finally {
    rmSync(run.dir, { recursive: true, force: true });
  }
});
