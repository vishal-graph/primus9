import {
  CloudWatchLogsClient,
  PutLogEventsCommand,
  CreateLogStreamCommand,
  DescribeLogStreamsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import { config } from '../config';
import { logger } from './logger';

/**
 * CloudWatch Logs Integration
 * 
 * Architecture Decision:
 * - Pushes structured logs to CloudWatch for centralized monitoring
 * - Supports CloudWatch Logs Insights queries
 * - Batches log events for efficiency
 * - Graceful degradation if CloudWatch is unavailable
 */

interface LogEvent {
  timestamp: number;
  message: string;
}

class CloudWatchLogger {
  private client: CloudWatchLogsClient;
  private logGroup: string;
  private logStream: string;
  private enabled: boolean;
  private buffer: LogEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private sequenceToken: string | undefined;
  private initialized = false;

  constructor() {
    this.enabled = config.cloudwatchEnabled && !!config.cloudwatchLogGroup;
    this.logGroup = config.cloudwatchLogGroup ?? '';
    this.logStream = config.cloudwatchLogStream || this.generateLogStreamName();

    this.client = new CloudWatchLogsClient({
      region: config.awsRegion,
      credentials: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey,
      },
    });

    if (this.enabled) {
      this.initialize();
    }
  }

  /**
   * Initialize log stream
   */
  private async initialize(): Promise<void> {
    try {
      // Try to get existing log stream
      const describeCommand = new DescribeLogStreamsCommand({
        logGroupName: this.logGroup,
        logStreamNamePrefix: this.logStream,
        limit: 1,
      });

      const response = await this.client.send(describeCommand);
      const existingStream = response.logStreams?.find(
        (s) => s.logStreamName === this.logStream
      );

      if (existingStream) {
        this.sequenceToken = existingStream.uploadSequenceToken;
      } else {
        // Create new log stream
        const createCommand = new CreateLogStreamCommand({
          logGroupName: this.logGroup,
          logStreamName: this.logStream,
        });
        await this.client.send(createCommand);
      }

      this.initialized = true;

      // Start flush interval (every 5 seconds)
      this.flushInterval = setInterval(() => this.flush(), 5000);

      logger.info({
        logGroup: this.logGroup,
        logStream: this.logStream,
      }, 'CloudWatch logging initialized');
    } catch (error) {
      logger.warn({ error }, 'Failed to initialize CloudWatch logging');
      this.enabled = false;
    }
  }

  /**
   * Generate a unique log stream name
   */
  private generateLogStreamName(): string {
    const date = new Date().toISOString().split('T')[0];
    const instance = process.env.HOSTNAME || process.env.INSTANCE_ID || 'local';
    return `${config.serviceName}/${date}/${instance}`;
  }

  /**
   * Log an event to CloudWatch
   */
  log(level: string, message: string, data?: Record<string, unknown>): void {
    if (!this.enabled) return;

    const logEvent: LogEvent = {
      timestamp: Date.now(),
      message: JSON.stringify({
        level,
        message,
        ...data,
        timestamp: new Date().toISOString(),
        service: config.serviceName,
      }),
    };

    this.buffer.push(logEvent);

    // Flush if buffer is large
    if (this.buffer.length >= 100) {
      this.flush();
    }
  }

  /**
   * Flush buffered logs to CloudWatch
   */
  async flush(): Promise<void> {
    if (!this.enabled || !this.initialized || this.buffer.length === 0) {
      return;
    }

    const events = [...this.buffer];
    this.buffer = [];

    try {
      const command = new PutLogEventsCommand({
        logGroupName: this.logGroup,
        logStreamName: this.logStream,
        logEvents: events.sort((a, b) => a.timestamp - b.timestamp),
        sequenceToken: this.sequenceToken,
      });

      const response = await this.client.send(command);
      this.sequenceToken = response.nextSequenceToken;
    } catch (error: unknown) {
      // Handle InvalidSequenceTokenException
      if ((error as { name?: string }).name === 'InvalidSequenceTokenException') {
        // Re-fetch sequence token and retry
        await this.initialize();
        this.buffer.push(...events);
      } else {
        // Put events back in buffer for retry
        this.buffer.push(...events);
        logger.warn({ error }, 'Failed to flush logs to CloudWatch');
      }
    }
  }

  /**
   * Shutdown - flush remaining logs
   */
  async shutdown(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flush();
  }
}

export const cloudwatch = new CloudWatchLogger();

/**
 * Metrics helper for CloudWatch custom metrics
 */
export const metrics = {
  /**
   * Record a job processing metric
   */
  recordJobMetric(
    jobType: string,
    status: 'started' | 'completed' | 'failed',
    durationMs?: number
  ): void {
    cloudwatch.log('metric', 'job_processing', {
      metricType: 'job',
      jobType,
      status,
      durationMs,
    });
  },

  /**
   * Record an API latency metric
   */
  recordApiLatency(
    endpoint: string,
    method: string,
    statusCode: number,
    durationMs: number
  ): void {
    cloudwatch.log('metric', 'api_latency', {
      metricType: 'api',
      endpoint,
      method,
      statusCode,
      durationMs,
    });
  },

  /**
   * Record a queue depth metric
   */
  recordQueueDepth(queueName: string, depth: number): void {
    cloudwatch.log('metric', 'queue_depth', {
      metricType: 'queue',
      queueName,
      depth,
    });
  },
};

