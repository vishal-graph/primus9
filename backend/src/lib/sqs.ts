/**
 * @deprecated SQS Service — DEPRECATED
 *
 * All job dispatch has been migrated to BullMQ (Redis).
 * Use `aiJobQueue.add()` from `../workers/queue` to enqueue jobs.
 *
 * This file is kept in place for:
 * - Reference / documentation
 * - Potential future migration back to cloud-native SQS
 * - The standalone `worker/` service (which still reads from SQS if deployed separately)
 *
 * DO NOT add new callers to `queueProducers` or `sqsService`.
 * All new job dispatch must go through BullMQ.
 */

import {
  SQSClient,
  SendMessageCommand,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  GetQueueAttributesCommand,
  Message,
} from '@aws-sdk/client-sqs';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from './logger';

/**
 * @deprecated
 * AWS SQS Client and Queue Management
 *
 * Architecture Decision (SUPERSEDED):
 * - Was used to replace BullMQ for cloud-native async processing
 * - Now superseded: BullMQ (Redis) is the single source of truth
 */

// Queue names mapped to their URLs (set via environment)
export type QueueType =
  | 'floorplan-analysis'
  | 'moodboard-generation'
  | 'interior-view-generation'
  | 'component-update'
  | 'notification'
  | 'pdf-export'
  | 'sense-inference';

export interface QueueMessage<T = unknown> {
  id: string;
  type: string;
  payload: T;
  metadata: {
    userId: string;
    projectId?: string;
    roomId?: string;
    correlationId: string;
    timestamp: string;
    retryCount?: number;
  };
}

export interface SendMessageOptions {
  delaySeconds?: number;
  deduplicationId?: string;
  messageGroupId?: string;
}

class SQSService {
  private client: SQSClient;
  private queueUrls: Map<QueueType, string>;
  private dlqUrls: Map<QueueType, string>;

  constructor() {
    this.client = new SQSClient({
      region: config.awsRegion,
      credentials: {
        accessKeyId: config.awsAccessKeyId,
        secretAccessKey: config.awsSecretAccessKey,
      },
    });

    // Initialize queue URL mappings from config (filter out undefined)
    this.queueUrls = new Map(
      Object.entries({
        'floorplan-analysis': config.sqsQueueFloorplanAnalysis,
        'moodboard-generation': config.sqsQueueMoodboardGeneration,
        'interior-view-generation': config.sqsQueueInteriorViewGeneration,
        'component-update': config.sqsQueueComponentUpdate,
        'notification': config.sqsQueueNotification,
        'pdf-export': config.sqsQueuePdfExport,
        'sense-inference': config.sqsQueueSenseInference,
      }).filter(([_, url]) => url !== undefined) as [QueueType, string][]
    );

    // Dead-letter queue URLs (filter out undefined)
    this.dlqUrls = new Map(
      Object.entries({
        'floorplan-analysis': config.sqsDlqFloorplanAnalysis,
        'moodboard-generation': config.sqsDlqMoodboardGeneration,
        'interior-view-generation': config.sqsDlqInteriorViewGeneration,
        'component-update': config.sqsDlqComponentUpdate,
        'notification': config.sqsDlqNotification,
        'pdf-export': config.sqsDlqPdfExport,
        'sense-inference': config.sqsDlqSenseInference,
      }).filter(([_, url]) => url !== undefined) as [QueueType, string][]
    );
  }

  /**
   * Get queue URL by type
   */
  getQueueUrl(queueType: QueueType): string {
    const url = this.queueUrls.get(queueType);
    if (!url) {
      throw new Error(`Queue URL not configured for: ${queueType}`);
    }
    return url;
  }

  /**
   * Send a message to a queue
   * 
   * @param queueType - Target queue type
   * @param message - Message payload
   * @param options - Optional delivery settings
   */
  async sendMessage<T>(
    queueType: QueueType,
    message: QueueMessage<T>,
    options: SendMessageOptions = {}
  ): Promise<string> {
    const queueUrl = this.getQueueUrl(queueType);
    const messageBody = JSON.stringify(message);

    try {
      const command = new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: messageBody,
        DelaySeconds: options.delaySeconds,
        // For FIFO queues (optional)
        MessageDeduplicationId: options.deduplicationId,
        MessageGroupId: options.messageGroupId,
        MessageAttributes: {
          'CorrelationId': {
            DataType: 'String',
            StringValue: message.metadata.correlationId,
          },
          'MessageType': {
            DataType: 'String',
            StringValue: message.type,
          },
        },
      });

      const result = await this.client.send(command);

      logger.info({
        queueType,
        messageId: result.MessageId,
        correlationId: message.metadata.correlationId,
      }, 'SQS message sent');

      return result.MessageId!;
    } catch (error) {
      logger.error({
        queueType,
        error,
        correlationId: message.metadata.correlationId,
      }, 'Failed to send SQS message');
      throw error;
    }
  }

  /**
   * Receive messages from a queue (for workers)
   * 
   * @param queueType - Source queue type
   * @param maxMessages - Maximum messages to receive (1-10)
   * @param waitTimeSeconds - Long polling wait time
   */
  async receiveMessages(
    queueType: QueueType,
    maxMessages: number = 1,
    waitTimeSeconds: number = 20
  ): Promise<Message[]> {
    const queueUrl = this.getQueueUrl(queueType);

    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: Math.min(maxMessages, 10),
        WaitTimeSeconds: waitTimeSeconds,
        MessageAttributeNames: ['All'],
        AttributeNames: ['All'],
      });

      const result = await this.client.send(command);
      return result.Messages || [];
    } catch (error) {
      logger.error({ queueType, error }, 'Failed to receive SQS messages');
      throw error;
    }
  }

  /**
   * Delete a message after successful processing
   */
  async deleteMessage(queueType: QueueType, receiptHandle: string): Promise<void> {
    const queueUrl = this.getQueueUrl(queueType);

    try {
      const command = new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      });

      await this.client.send(command);
      logger.debug({ queueType }, 'SQS message deleted');
    } catch (error) {
      logger.error({ queueType, error }, 'Failed to delete SQS message');
      throw error;
    }
  }

  /**
   * Get queue statistics (for monitoring)
   */
  async getQueueStats(queueType: QueueType): Promise<{
    approximateMessages: number;
    approximateMessagesNotVisible: number;
    approximateMessagesDelayed: number;
  }> {
    const queueUrl = this.getQueueUrl(queueType);

    try {
      const command = new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: [
          'ApproximateNumberOfMessages',
          'ApproximateNumberOfMessagesNotVisible',
          'ApproximateNumberOfMessagesDelayed',
        ],
      });

      const result = await this.client.send(command);
      const attrs = result.Attributes || {};

      return {
        approximateMessages: parseInt(attrs.ApproximateNumberOfMessages || '0'),
        approximateMessagesNotVisible: parseInt(attrs.ApproximateNumberOfMessagesNotVisible || '0'),
        approximateMessagesDelayed: parseInt(attrs.ApproximateNumberOfMessagesDelayed || '0'),
      };
    } catch (error) {
      logger.error({ queueType, error }, 'Failed to get queue stats');
      throw error;
    }
  }

  /**
   * Parse a received SQS message body
   */
  parseMessage<T>(message: Message): QueueMessage<T> | null {
    try {
      if (!message.Body) return null;
      return JSON.parse(message.Body) as QueueMessage<T>;
    } catch (error) {
      logger.error({ error, messageId: message.MessageId }, 'Failed to parse SQS message');
      return null;
    }
  }
}

// Singleton instance
export const sqsService = new SQSService();

/**
 * Helper function to create a queue message
 */
export function createQueueMessage<T>(
  type: string,
  payload: T,
  metadata: Omit<QueueMessage<T>['metadata'], 'correlationId' | 'timestamp'>
): QueueMessage<T> {
  return {
    id: uuidv4(),
    type,
    payload,
    metadata: {
      ...metadata,
      correlationId: uuidv4(),
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Queue producer functions for different job types
 * Used by Next.js Server Actions and Express API
 */
export const queueProducers = {
  /**
   * Enqueue floor plan analysis job
   */
  async enqueueFloorPlanAnalysis(params: {
    jobId: string;
    userId: string;
    projectId: string;
    imageUrl: string;
  }): Promise<string> {
    const message = createQueueMessage('FLOORPLAN_ANALYSIS', params, {
      userId: params.userId,
      projectId: params.projectId,
    });
    return sqsService.sendMessage('floorplan-analysis', message);
  },

  /**
   * Enqueue moodboard generation job
   * 
   * SUPPORTS TWO FORMATS:
   * 1. Legacy: designIntent (direct DesignIntent object)
   * 2. New: intentPayload (from UI forms, needs mapping in worker)
   */
  async enqueueMoodboardGeneration(params: {
    jobId: string;
    userId: string;
    projectId: string;
    roomId: string;
    roomName?: string;
    roomType?: string;
    areaEstimate?: number;
    // Legacy format - direct DesignIntent
    designIntent?: {
      roomType: string;
      aestheticStyle: string;
      themeMood: string;
      colorPalette: string;
      materialPreferences: string;
      texturePreferences: string;
      furniturePreferences: string;
      decorPreferences: string;
      lightingPreferences: string;
      notes: string;
    };
    // New format - IntentPayload from UI forms
    intentPayload?: Record<string, unknown>;
    isGlobalIntent?: boolean;
    // Common
    referenceImages?: string[];
    regenerationOverrides?: Record<string, unknown>;
    version?: number;
  }): Promise<string> {
    const message = createQueueMessage('MOODBOARD_GENERATION', {
      jobId: params.jobId,
      userId: params.userId,
      projectId: params.projectId,
      roomId: params.roomId,
      roomName: params.roomName,
      roomType: params.roomType,
      areaEstimate: params.areaEstimate,
      designIntent: params.designIntent,
      intentPayload: params.intentPayload,
      isGlobalIntent: params.isGlobalIntent,
      referenceImages: params.referenceImages,
      regenerationOverrides: params.regenerationOverrides,
      version: params.version || 1,
    }, {
      userId: params.userId,
      projectId: params.projectId,
      roomId: params.roomId,
    });
    return sqsService.sendMessage('moodboard-generation', message);
  },

  /**
   * Enqueue interior view generation job
   * Also supports elevation jobs when wallsToGenerate is provided
   */
  async enqueueInteriorViewGeneration(params: {
    userId: string;
    projectId: string;
    roomId: string;
    // For interior views
    viewAngle?: number;
    style?: string;
    // For elevations
    jobId?: string;
    wallsToGenerate?: string[];
    version?: number;
  }): Promise<string> {
    // Determine job type based on parameters
    const jobType = params.wallsToGenerate ? 'ELEVATION' : 'INTERIOR';

    const message = createQueueMessage(jobType, params, {
      userId: params.userId,
      projectId: params.projectId,
      roomId: params.roomId,
    });
    return sqsService.sendMessage('interior-view-generation', message);
  },

  /**
   * @deprecated Use enqueueIsometricGeneration instead
   * Enqueue elevation generation job (2D wall elevations)
   * ============================================================
   * ❗ DEPRECATED: Use isometric generation instead ❗
   * ============================================================
   */
  async enqueueElevationGeneration(params: {
    jobId: string;
    userId: string;
    projectId: string;
    roomId: string;
    wallsToGenerate?: ('NORTH' | 'EAST' | 'SOUTH' | 'WEST')[];
    version?: number;
  }): Promise<string> {
    logger.warn('enqueueElevationGeneration is deprecated, use enqueueIsometricGeneration instead');
    const message = createQueueMessage('ELEVATION', {
      ...params,
      wallsToGenerate: params.wallsToGenerate || ['NORTH', 'EAST', 'SOUTH', 'WEST'],
      version: params.version || 1,
    }, {
      userId: params.userId,
      projectId: params.projectId,
      roomId: params.roomId,
    });
    return sqsService.sendMessage('interior-view-generation', message);
  },

  /**
   * Enqueue isometric floor elevation generation (NEW - SOURCE OF TRUTH)
   * ============================================================
   * ❗ THIS IS THE SINGLE SOURCE OF TRUTH FOR ELEVATIONS ❗
   * ❗ ONE IMAGE = ENTIRE FLOOR ❗
   * ❗ FLOOR PLAN GEOMETRY IS LAW ❗
   * ============================================================
   */
  async enqueueIsometricGeneration(params: {
    jobId: string;
    userId: string;
    projectId: string;
    floor?: number;
    version?: number;
  }): Promise<string> {
    const message = createQueueMessage('INTERIOR_ISOMETRIC', {
      ...params,
      floor: params.floor || 1,
      version: params.version || 1,
    }, {
      userId: params.userId,
      projectId: params.projectId,
    });
    return sqsService.sendMessage('interior-view-generation', message);
  },

  /**
   * Enqueue component update job
   */
  async enqueueComponentUpdate(params: {
    userId: string;
    projectId: string;
    roomId: string;
    componentId: string;
    changes: Record<string, unknown>;
  }): Promise<string> {
    const message = createQueueMessage('COMPONENT_UPDATE', params, {
      userId: params.userId,
      projectId: params.projectId,
      roomId: params.roomId,
    });
    return sqsService.sendMessage('component-update', message);
  },

  /**
   * Enqueue notification
   */
  async enqueueNotification(params: {
    userId: string;
    type: string;
    channel: 'EMAIL' | 'WHATSAPP' | 'SMS';
    recipient: string;
    templateId: string;
    variables: Record<string, unknown>;
  }): Promise<string> {
    const message = createQueueMessage('NOTIFICATION', params, {
      userId: params.userId,
    });
    return sqsService.sendMessage('notification', message);
  },

  /**
   * Enqueue PDF export job
   * Generates branded PDF documents from moodboards/elevations
   */
  async enqueuePdfExport(params: {
    jobId: string;
    exportId: string;
    userId: string;
    projectId: string;
    type: 'MOODBOARD_PDF' | 'ELEVATION_PDF' | 'FULL_DESIGN_PDF';
    options?: {
      includeDescriptions?: boolean;
      includeElevations?: boolean;
      brandingTheme?: string;
    };
  }): Promise<string> {
    const message = createQueueMessage('PDF_EXPORT', {
      ...params,
      options: params.options || { includeDescriptions: true },
    }, {
      userId: params.userId,
      projectId: params.projectId,
    });
    return sqsService.sendMessage('pdf-export', message);
  },

  /**
   * Enqueue sense inference job (3D Walkthrough - Intent Graph)
   * Analyzes user inputs and generates structured Intent Graph
   */
  async enqueueSenseInference(params: {
    jobId: string;
    userId: string;
    projectId: string;
    inputs: {
      images?: string[];
      floorPlan?: string;
      moodboards?: string[];
      text?: string;
      hints?: Record<string, unknown>;
    };
  }): Promise<string> {
    const message = createQueueMessage('SENSE_INFERENCE', params, {
      userId: params.userId,
      projectId: params.projectId,
    });
    return sqsService.sendMessage('sense-inference', message);
  },
};

