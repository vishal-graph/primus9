import pino from 'pino';
import { config } from '../config';

/**
 * Structured Logger with CloudWatch Integration
 * 
 * Architecture Decision:
 * - Uses Pino for high-performance JSON logging
 * - Structured logs for CloudWatch Logs Insights queries
 * - Includes correlation IDs for distributed tracing
 */

// Custom log formatter for CloudWatch compatibility
const cloudwatchFormatter = {
  // CloudWatch expects these specific field names
  messageKey: 'message',
  timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
};

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(config.nodeEnv === 'development'
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {
        // Production: JSON format for CloudWatch
        formatters: {
          level: (label) => ({ level: label }),
        },
        ...cloudwatchFormatter,
      }),
  base: {
    service: config.serviceName,
    env: config.nodeEnv,
    version: process.env.npm_package_version || '0.1.0',
  },
});

/**
 * Create a child logger with job context
 */
export function createJobLogger(jobId: string, jobType: string, correlationId?: string) {
  return logger.child({
    jobId,
    jobType,
    correlationId,
  });
}

/**
 * Create a child logger with request context
 */
export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({
    requestId,
    userId,
  });
}

export type Logger = typeof logger;

