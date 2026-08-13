// Minimal .env loader so the project needs zero external dependencies
// (replaces the "dotenv" package). Reads KEY=VALUE lines from a .env file
// in the backend project root and copies them into process.env, without
// overwriting variables that are already set (e.g. by the shell or CI).
import fs from 'node:fs';
import path from 'node:path';

let loaded = false;

export function loadEnv(file = path.resolve(process.cwd(), '.env')) {
  if (loaded) return;
  loaded = true;

  if (!fs.existsSync(file)) return;

  const contents = fs.readFileSync(file, 'utf8');
  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();

    // Strip matching surrounding quotes, e.g. KEY="some value"
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
