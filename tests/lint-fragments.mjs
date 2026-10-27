import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LINT = join(ROOT, 'skills/taste-skill/scripts/lint.mjs');

const lint = (file) => spawnSync(process.execPath, [LINT, '--json', file], {
  cwd: ROOT,
  encoding: 'utf8',
});

test('the bundled interface fragments pass page-mode lint', () => {
  for (const asset of ['app.css', 'charts.js']) {
    const result = lint(join(ROOT, 'skills/taste-skill/assets', asset));
    assert.equal(result.status, 0, `${asset}\n${result.stdout}${result.stderr}`);
    assert.deepEqual(JSON.parse(result.stdout).findings, []);
  }
});

test('a fragment declaration suppresses only UI-surface rules', () => {
  const dir = mkdtempSync(join(tmpdir(), 'taste-lint-'));
  const file = join(dir, 'fragment.css');
  try {
    writeFileSync(file, [
      '/* taste-skill-fragment */',
      '.panel { border: 1px solid #ddd; }',
      '.hero { background: linear-gradient(#fff, #ddd); }',
    ].join('\n'));
    const result = lint(file);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const ids = new Set(JSON.parse(result.stdout).findings.map((finding) => finding.id));
    assert.equal(ids.has('gradient'), true);
    assert.equal(ids.has('hairline'), false);
    assert.equal(ids.has('outlined-box'), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('fragment text outside a header comment does not suppress UI-surface rules', () => {
  const dir = mkdtempSync(join(tmpdir(), 'taste-lint-'));
  const file = join(dir, 'content.css');
  try {
    writeFileSync(file, [
      '.panel::after {',
      '  content: "taste-skill-fragment";',
      '  border-top: 1px solid #ddd;',
      '}',
    ].join('\n'));
    const result = lint(file);
    assert.equal(result.status, 1, result.stdout + result.stderr);
    const ids = new Set(JSON.parse(result.stdout).findings.map((finding) => finding.id));
    assert.equal(ids.has('hairline'), true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
