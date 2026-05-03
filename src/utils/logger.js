const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

const envLevel = process.env.LOG_LEVEL?.toLowerCase();
const defaultLevel = process.env.NODE_ENV === "production" ? "info" : "debug";
const currentLevel = LEVELS[envLevel] !== undefined ? envLevel : defaultLevel;

const shouldLog = (level) => LEVELS[level] <= LEVELS[currentLevel];

const format = (scope, message) => `[${scope}] ${message}`;

export const logger = {
  error(scope, message, meta) {
    if (shouldLog("error")) console.error(format(scope, message), meta || "");
  },
  warn(scope, message, meta) {
    if (shouldLog("warn")) console.warn(format(scope, message), meta || "");
  },
  info(scope, message, meta) {
    if (shouldLog("info")) console.log(format(scope, message), meta || "");
  },
  debug(scope, message, meta) {
    if (shouldLog("debug")) console.log(format(scope, message), meta || "");
  },
};
