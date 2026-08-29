import { describe, expect, it } from 'vitest';

import { extractSnippet } from '../scripts/extract-raweb.mjs';
import { apiEndpoints, snippets } from '../scripts/raweb-snippets.mjs';
import { rawebSource } from './fixtures/raweb-source.js';
import { hasRaweb, RAWEB_PATH, readRaweb } from './helpers/harness.js';

/**
 * Drift check: are the frozen fixtures still what RetroAchievements ships?
 *
 * Only runs when a local ./RAWeb checkout is present — it is a reference copy
 * that is never committed. After updating it, a failure here means the site
 * changed: run `npm run raweb:sync` and read the diff.
 */

const describeDrift = hasRaweb() ? describe : describe.skip;

describeDrift('frozen RAWeb fixtures', () => {
  it.each(snippets.map((snippet) => [snippet.name, snippet]))(
    '%s still matches the live source',
    (name, snippet) => {
      const live = extractSnippet(RAWEB_PATH, snippet);

      // Both sides are trimmed: the generated file stores each snippet between
      // newlines, so only the leading indentation of the first line differs.
      expect(
        live.trim(),
        `${snippet.file} changed — run \`npm run raweb:sync\` and review the diff`,
      ).toBe(rawebSource[name].code.trim());
    },
  );

  it.each(apiEndpoints)('%s is still served by RAWeb', async (endpoint) => {
    expect(() => readRaweb(`public/API/${endpoint}.php`)).not.toThrow();
  });
});
