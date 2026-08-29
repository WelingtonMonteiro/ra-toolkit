/**
 * Bundle entry point. Everything below is wired from ./bootstrap.js.
 */

import { start } from './bootstrap.js';
import { CURRENT_VERSION } from './core/version.js';

console.log('[RA Toolkit] \u2705 Script loaded \u2014 v' + CURRENT_VERSION + ' \u2014 ' + location.href);

start();
