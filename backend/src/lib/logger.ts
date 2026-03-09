import pino from 'pino';

/**
 * Structured Logger
 * Uses Pino for high-performance JSON logging
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
  base: {
    service: 'tatvaops-vision-backend',
    env: process.env.NODE_ENV,
  },
});

/**
 * Create a child logger with request context
 */
export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({ requestId, userId });
}

export type Logger = typeof logger;

