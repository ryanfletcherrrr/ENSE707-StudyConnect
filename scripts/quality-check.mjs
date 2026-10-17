// Dependency-free "lint" gate used by CI (Task 5 quality gate).
//
// The project deliberately has no npm dependencies, so instead of ESLint this
// script runs the checks that catch the mistakes that actually slip into a
// merge of a group project:
//   1. Syntax: every .js file must parse (`node --check`).
//   2. Merge-conflict markers (<<<<<<<, =======, >>>>>>>) left in a file.
//   3. Focused tests (`test.only`, `describe.only`, `it.only`), which make the
//      test runner silently skip every other test while still reporting green.
//   4. Leftover `debugger;` statements.
//
// Usage: node scripts/quality-check.mjs [dir ...]
// With no arguments it checks the backend and frontend source and test folders.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultDirs = ['backend/src', 'frontend/public/js', 'frontend/server', 'frontend/tests'];
const skipDirs = new Set(['node_modules', '.git', 'data']);

function collectJsFiles(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    if (skipDirs.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) files.push(...collectJsFiles(full));
    else if (name.endsWith('.js') || name.endsWith('.mjs')) files.push(full);
  }
  return files;
}

const textRules = [
  { name: 'merge-conflict marker', pattern: /^(<<<<<<<|>>>>>>>)(\s|$)|^=======$/ },
  { name: 'focused test (.only)', pattern: /\b(test|it|describe)\.only\s*\(/ },
  { name: 'debugger statement', pattern: /^\s*debugger\s*;?\s*$/ },
];

export function checkSource(text) {
  const problems = [];
  text.split('\n').forEach((line, index) => {
    for (const rule of textRules) {
      if (rule.pattern.test(line)) problems.push({ line: index + 1, rule: rule.name });
    }
  });
  return problems;
}

function main() {
  const args = process.argv.slice(2);
  const dirs = (args.length > 0 ? args : defaultDirs).map((d) => resolve(root, d));
  const problems = [];
  let checked = 0;

  for (const dir of dirs) {
    for (const file of collectJsFiles(dir)) {
      checked += 1;
      const rel = relative(root, file);

      const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
      if (syntax.status !== 0) {
        problems.push(`${rel}: syntax error\n${syntax.stderr.trim()}`);
      }

      for (const found of checkSource(readFileSync(file, 'utf8'))) {
        problems.push(`${rel}:${found.line}: ${found.rule}`);
      }
    }
  }

  if (problems.length > 0) {
    console.error(`Quality check failed (${problems.length} problem(s) in ${checked} files):`);
    for (const problem of problems) console.error(`  - ${problem}`);
    process.exit(1);
  }

  console.log(`Quality check passed: ${checked} files, no syntax errors or hygiene problems.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
