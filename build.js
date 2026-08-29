/**
 * Bundles src/ into the published userscript.
 *
 * Both builds are written to dist/. The published one, dist/RA_Toolkit.user.js,
 * is committed: it is what the README install link points at and what anyone
 * who installed from the GitHub raw URL is tracking.
 *
 *   node build.js                    # the published bundle
 *   node build.js --check            # fail if the committed bundle is stale
 *   RA_TOOLKIT_DEBUG=1 node build.js # a private debug build (see below)
 *
 * A debug build writes RA_Toolkit.debug.user.js instead. It is the only build
 * that exposes the "Enable debug logging" toggle in the settings panel, so the
 * published script cannot have debug logging switched on by whoever installs
 * it. The debug file is gitignored, is named differently so Tampermonkey keeps
 * it separate, and drops @updateURL/@downloadURL so it is never auto-updated
 * back to the public build.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const root = path.dirname(fileURLToPath(import.meta.url));

const isDebugBuild =
  process.env.RA_TOOLKIT_DEBUG === '1' || process.argv.includes('--debug');

const distDir = path.join(root, 'dist');
const outFile = path.join(
  distDir,
  isDebugBuild ? 'RA_Toolkit.debug.user.js' : 'RA_Toolkit.user.js',
);

mkdirSync(distDir, { recursive: true });

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

let header = readFileSync(path.join(root, 'src', 'header.txt'), 'utf8')
  .replace('__VERSION__', pkg.version)
  .trimEnd();

if (isDebugBuild) {
  header = header
    .replace(/^(\/\/ @name\s+.*)$/m, '$1 (debug)')
    // Never let Tampermonkey replace a debug build with the public one.
    .replace(/^\/\/ @(updateURL|downloadURL)\s+.*$\n?/gm, '');
}

const result = await build({
  entryPoints: [path.join(root, 'src', 'main.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  charset: 'utf8',
  // Greasy Fork requires readable source, and an unminified bundle also keeps
  // Tampermonkey's stack traces pointing at something a human can follow.
  minify: false,
  legalComments: 'inline',
  banner: { js: header },
  define: { __DEBUG_BUILD__: isDebugBuild ? 'true' : 'false' },
  // Blocks labelled `DEBUG:` are stripped from the published bundle, so its
  // source has no trace of the debug toggle.
  dropLabels: isDebugBuild ? [] : ['DEBUG'],
  write: false,
});

const bundled = result.outputFiles[0].text;

if (process.argv.includes('--check')) {
  const current = readFileSync(outFile, 'utf8');
  if (current !== bundled) {
    console.error(
      `dist/${path.basename(outFile)} is out of date with src/.\n` +
        'Run `npm run build` and commit the result.',
    );
    process.exit(1);
  }
  console.log(`dist/${path.basename(outFile)} is up to date with src/.`);
} else {
  writeFileSync(outFile, bundled);
  const lines = bundled.split('\n').length;
  console.log(
    `Wrote dist/${path.basename(outFile)} — v${pkg.version}, ${lines} lines` +
      (isDebugBuild ? ', debug logging available.' : '.'),
  );
}
