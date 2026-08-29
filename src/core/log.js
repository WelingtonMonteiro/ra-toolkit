/**
 * Structured logging, gated by the debug-logging setting.
 */

// =========================================
//        Structured Logging
// =========================================
export var LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3, off: 4 };
var currentLogLevel = LOG_LEVELS.info; // default until config loads

export var log = {
  _format: function (level, msg) {
    return "[RA Toolkit][" + level.toUpperCase() + "] " + msg;
  },
  debug: function (msg) {
    if (currentLogLevel <= LOG_LEVELS.debug) GM_log(log._format("debug", msg));
  },
  info: function (msg) {
    if (currentLogLevel <= LOG_LEVELS.info) GM_log(log._format("info", msg));
  },
  warn: function (msg) {
    if (currentLogLevel <= LOG_LEVELS.warn) {
      GM_log(log._format("warn", msg));
      console.warn(log._format("warn", msg));
    }
  },
  error: function (msg) {
    if (currentLogLevel <= LOG_LEVELS.error) {
      GM_log(log._format("error", msg));
      console.error(log._format("error", msg));
    }
  }
};

/** Raises or lowers the verbosity; called once the config is loaded. */
export function setLogLevel(level) {
  currentLogLevel = level;
}
