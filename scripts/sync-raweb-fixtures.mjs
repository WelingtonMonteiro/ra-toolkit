/**
 * Regenerates tests/fixtures/raweb-source.js from a local ./RAWeb checkout.
 *
 * Run this after updating ./RAWeb: the git diff on the generated file is the
 * list of things RetroAchievements changed, and `npm test` then tells you
 * whether any of it broke the script.
 *
 *   npm run raweb:sync
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { extractSnippet, readRawebRef } from './extract-raweb.mjs';
import { apiEndpoints, snippets } from './raweb-snippets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rawebPath = path.join(root, 'RAWeb');
const outputPath = path.join(root, 'tests', 'fixtures', 'raweb-source.js');

if (!fs.existsSync(rawebPath)) {
  console.error(
    'No ./RAWeb checkout found.\n' +
      'Clone it next to the script to refresh the fixtures:\n' +
      '  git clone --depth 1 https://github.com/RetroAchievements/RAWeb.git',
  );
  process.exit(1);
}

const { commit } = readRawebRef(rawebPath);
let syncedAt;
try {
  syncedAt = execSync('git -C RAWeb log -1 --format=%ad --date=short', { cwd: root })
    .toString()
    .trim();
} catch {
  syncedAt = 'unknown';
}

const failures = [];
const extracted = snippets.map((snippet) => {
  try {
    return [snippet, extractSnippet(rawebPath, snippet)];
  } catch (error) {
    failures.push(error.message);
    return [snippet, null];
  }
});

if (failures.length) {
  console.error('Could not extract every snippet — RAWeb moved:\n');
  for (const failure of failures) console.error('  - ' + failure);
  console.error('\nUpdate the anchors in scripts/raweb-snippets.mjs, then re-run.');
  process.exit(1);
}

const missingEndpoints = apiEndpoints.filter(
  (endpoint) => !fs.existsSync(path.join(rawebPath, 'public', 'API', `${endpoint}.php`)),
);

const escape = (value) => value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const body = extracted
  .map(
    ([snippet, code]) =>
      `  ${snippet.name}: {\n` +
      `    file: '${snippet.file}',\n` +
      `    code: \`\n${escape(code)}\n\`,\n` +
      `  },`,
  )
  .join('\n\n');

const output = `/**
 * Frozen copies of the RetroAchievements markup RA Toolkit hooks onto.
 *
 * GENERATED — do not edit by hand. Run \`npm run raweb:sync\` against a local
 * ./RAWeb checkout to refresh it; the resulting diff shows what the site
 * changed. ./RAWeb itself stays local and is never committed.
 *
 * Source: https://github.com/RetroAchievements/RAWeb
 */

export const rawebRef = {
  repo: 'RetroAchievements/RAWeb',
  commit: '${commit}',
  committedAt: '${syncedAt}',
};

/** Legacy web API endpoints present in public/API at the ref above. */
export const rawebApiEndpoints = ${JSON.stringify(apiEndpoints, null, 2)
  .split('\n')
  .join('\n')};

export const rawebSource = {
${body}
};
`;

fs.writeFileSync(outputPath, output);

console.log(`Wrote ${path.relative(root, outputPath)} from RAWeb@${commit} (${syncedAt}).`);
console.log(`  ${snippets.length} snippets, ${apiEndpoints.length} API endpoints.`);
if (missingEndpoints.length) {
  console.warn(`  WARNING: missing from public/API: ${missingEndpoints.join(', ')}`);
}
