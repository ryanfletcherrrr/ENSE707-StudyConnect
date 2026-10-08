// The CI "quality check" gate (scripts/quality-check.mjs) must actually catch
// the problems it claims to catch, otherwise the gate gives false confidence.
import test from 'node:test';
import assert from 'node:assert/strict';
import { checkSource } from '../../../scripts/quality-check.mjs';

test('quality check: clean source has no problems', () => {
  const source = "import test from 'node:test';\ntest('works', () => {});\n";
  assert.deepEqual(checkSource(source), []);
});

test('quality check: flags merge-conflict markers with their line numbers', () => {
  const source = 'const a = 1;\n<<<<<<< HEAD\nconst b = 2;\n=======\nconst b = 3;\n>>>>>>> feature\n';
  const lines = checkSource(source).map((p) => p.line);
  assert.deepEqual(lines, [2, 4, 6]);
});

test('quality check: flags focused tests that would silently skip the rest', () => {
  // Built from parts so this file does not itself contain a focused test.
  const focus = '.on' + 'ly';
  assert.equal(checkSource(`test${focus}('x', () => {});`).length, 1);
  assert.equal(checkSource(`describe${focus}('x', () => {});`).length, 1);
  assert.equal(checkSource(`it${focus}('x', () => {});`).length, 1);
});

test('quality check: flags leftover debugger statements', () => {
  assert.equal(checkSource('function f() {\n  debugger;\n}\n').length, 1);
});

test('quality check: does not flag the word "only" in ordinary code', () => {
  assert.deepEqual(checkSource("const label = 'only one'; // run only on CI\n"), []);
});
