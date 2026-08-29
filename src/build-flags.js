/**
 * Flags baked in when the bundle is built.
 *
 * `__DEBUG_BUILD__` is replaced by build.js with a literal, so the branches it
 * guards are dropped from the published bundle entirely. The `typeof` check
 * keeps the modules importable in tests, where nothing replaces it.
 */

export const IS_DEBUG_BUILD =
  typeof __DEBUG_BUILD__ !== 'undefined' && __DEBUG_BUILD__ === true;
