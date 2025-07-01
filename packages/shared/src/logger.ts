// Log levels
type LogLevel = "debug" | "info" | "warn" | "perf" | "error";

// Colors for console output
const LOG_COLORS = {
  debug: "\x1b[34m", // Blue
  info: "\x1b[32m", // Green
  warn: "\x1b[33m", // Yellow
  perf: "\x1b[35m", // Magenta
  error: "\x1b[31m", // Red
  reset: "\x1b[0m", // Reset
};

// Format log message
const formatLog = (level: LogLevel, message: string, meta?: any) => {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? JSON.stringify(meta, null, 2) : "";

  return {
    raw: { timestamp, level, message, ...meta },
    formatted: `${
      LOG_COLORS[level]
    }[${timestamp}] [${level.toUpperCase()}] ${message}${
      LOG_COLORS.reset
    } ${metaStr}`,
  };
};

// Error logger
export const logError = (error: Error, context?: any) => {
  const { formatted } = formatLog("error", error.message, {
    ...context,
    stack: error.stack,
  });
  console.error(formatted);
};

const ENABLE_LOGGING = true;
// Custom logger
export const logger = ENABLE_LOGGING
  ? {
      info(message: string, meta?: any) {
        const { formatted } = formatLog("info", message, meta);
        console.log(formatted);
      },

      error(message: string, error?: Error, meta?: any) {
        const { formatted } = formatLog(
          "error",
          message,
          error
            ? {
                ...meta,
                error: error.message,
                stack: error.stack,
              }
            : meta
        );
        console.error(formatted);
      },

      warn(message: string, meta?: any) {
        const { formatted } = formatLog("warn", message, meta);
        console.warn(formatted);
      },

      debug(message: string, meta?: any) {
        const { formatted } = formatLog("debug", message, meta);
        console.debug(formatted);
      },

      perf(message: string, meta?: any) {
        const { formatted } = formatLog("perf", message, meta);
        console.log(formatted);
      },

      // Raw log data for external logging services
      raw(level: LogLevel, message: string, meta?: any) {
        return formatLog(level, message, meta).raw;
      },
    }
  : {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      info: () => undefined,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      error: () => undefined,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      warn: () => undefined,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      debug: () => undefined,
      perf: () => undefined,
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      raw: () => undefined,
    };
