/**
 * Runway Video Generation Client
 *
 * Supports:
 * 1) Image-to-video (gen4.5): POST /v1/image_to_video
 *
 * Docs: https://docs.dev.runwayml.com/
 */

const RUNWAY_VIDEO_URI_MAX_LEN = 2048; // HTTPS video URL max length

import { logger } from '../../lib/logger';

const RUNWAY_BASE = 'https://api.dev.runwayml.com/v1';
const RUNWAY_VERSION = '2024-11-06'; // Must be exactly this per Runway API docs
const RUNWAY_PROMPT_MAX_LEN = 1000; // promptText: 1–1000 chars (UTF-16 code units)
const RUNWAY_IMAGE_URI_MAX_LEN = 2048; // HTTPS image URL max length per API docs
const POLL_INTERVAL_MS = 8_000;
const MAX_POLL_DURATION_MS = 600_000; // 10 minutes
const CREATE_TASK_TIMEOUT_MS = 90_000; // 90s for create task (image upload + API)
const VIDEO_DOWNLOAD_TIMEOUT_MS = 120_000; // 2 min to download video
const POLL_REQUEST_TIMEOUT_MS = 30_000; // 30s per poll GET
const CREATE_TASK_RETRIES = 3; // retry transient network failures
const RETRY_DELAY_MS = 2000; // 2s then 4s backoff

interface RunwayCreateResponse {
  id: string;
}

interface RunwayTaskResponse {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
  output?: string[];
  error?: string;
}

export interface RunwayGenerateOptions {
  duration?: number; // seconds, 5 or 10 for gen4_turbo
  ratio?: string;   // Runway API: "1280:720"|"720:1280"|"1104:832"|"832:1104"|"960:960"|"1584:672"
  promptText?: string;
  seed?: number;
}

export class RunwayClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    if (!apiKey?.trim()) {
      throw new Error('RUNWAY_API_KEY is required for Runway client');
    }
    this.apiKey = apiKey.trim();
  }

  /**
   * Generate video from a single image URL (e.g. signed S3 URL for room 2D view).
   * Returns video buffer and mime type.
   */
  async generateVideo(
    imageUrl: string,
    options: RunwayGenerateOptions = {}
  ): Promise<{ videoData: Buffer; mimeType: string }> {
    const {
      duration = 10,
      ratio = '1280:720',
      promptText = 'Camera slowly moves through the interior space. Smooth, cinematic motion.',
      seed,
    } = options;

    logger.info('Starting Runway image-to-video', {
      imageUrlLength: imageUrl.length,
      duration,
      ratio,
    });

    const taskId = await this.createTask(imageUrl, promptText, duration, ratio, seed);
    const outputUrl = await this.pollTask(taskId);

    const downloadController = new AbortController();
    const downloadTimeoutId = setTimeout(
      () => downloadController.abort(),
      VIDEO_DOWNLOAD_TIMEOUT_MS
    );
    let videoResponse: Response;
    try {
      videoResponse = await fetch(outputUrl, { signal: downloadController.signal });
    } catch (err: unknown) {
      clearTimeout(downloadTimeoutId);
      const cause = err instanceof Error ? err.cause || err.message : String(err);
      const msg =
        err instanceof Error && err.name === 'AbortError'
          ? `Runway video download timed out after ${VIDEO_DOWNLOAD_TIMEOUT_MS / 1000}s`
          : `Runway video download failed: ${cause}`;
      logger.error({ err, cause: (err as Error)?.cause }, 'Runway video download fetch failed');
      throw new Error(msg);
    }
    clearTimeout(downloadTimeoutId);
    if (!videoResponse.ok) {
      throw new Error(`Runway: failed to download video: ${videoResponse.status}`);
    }
    const arrayBuffer = await videoResponse.arrayBuffer();
    const videoData = Buffer.from(arrayBuffer);

    logger.info('Runway video downloaded', { taskId, size: videoData.length });

    return {
      videoData,
      mimeType: 'video/mp4',
    };
  }


  private async createTask(
    imageUrl: string,
    promptText: string,
    duration: number,
    ratio: string,
    seed?: number
  ): Promise<string> {
    if (imageUrl.length > RUNWAY_IMAGE_URI_MAX_LEN) {
      throw new Error(
        `Runway image URL must be ≤${RUNWAY_IMAGE_URI_MAX_LEN} characters (got ${imageUrl.length}). ` +
          'Use a shorter-lived signed URL or upload via Runway /v1/uploads and use runway:// URI.'
      );
    }
    const truncated =
      promptText.length > RUNWAY_PROMPT_MAX_LEN
        ? promptText.slice(0, RUNWAY_PROMPT_MAX_LEN)
        : promptText;
    if (truncated !== promptText) {
      logger.warn(
        { originalLen: promptText.length, maxLen: RUNWAY_PROMPT_MAX_LEN },
        'Runway prompt truncated to fit API limit'
      );
    }
    const body: Record<string, unknown> = {
      promptText: truncated,
      promptImage: [
        {
          uri: imageUrl,
          position: 'first',
        },
      ],
      model: 'gen4.5',
      ratio,
      duration,
    };
    if (seed !== undefined) {
      body.seed = seed;
    }

    let lastErr: unknown;
    for (let attempt = 1; attempt <= CREATE_TASK_RETRIES; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CREATE_TASK_TIMEOUT_MS);
      try {
        const res = await fetch(`${RUNWAY_BASE}/image_to_video`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'X-Runway-Version': RUNWAY_VERSION,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const text = await res.text();
        if (!res.ok) {
          logger.error({ status: res.status, body: text }, 'Runway create task failed');
          throw new Error(`Runway API error ${res.status}: ${text}`);
        }
        let data: RunwayCreateResponse;
        try {
          data = JSON.parse(text) as RunwayCreateResponse;
        } catch {
          throw new Error(`Runway API invalid response: ${text}`);
        }
        if (!data.id) {
          throw new Error(`Runway API did not return task id: ${text}`);
        }
        logger.info('Runway task created', { taskId: data.id });
        return data.id;
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        lastErr = err;
        const isRetryable =
          (err instanceof Error && (err.name === 'AbortError' || err.message === 'fetch failed')) ||
          String(err).includes('fetch failed') ||
          (err instanceof TypeError && err.message === 'fetch failed');
        if (isRetryable && attempt < CREATE_TASK_RETRIES) {
          const delay = RETRY_DELAY_MS * attempt;
          logger.warn(
            { attempt, maxAttempts: CREATE_TASK_RETRIES, delayMs: delay, cause: (err as Error)?.cause ?? (err as Error)?.message },
            'Runway create task fetch failed, retrying'
          );
          await this.sleep(delay);
          continue;
        }
        const cause = err instanceof Error
          ? (err.cause && typeof (err.cause as Error).message === 'string'
            ? (err.cause as Error).message
            : err.message)
          : String(err);
        const msg =
          err instanceof Error && err.name === 'AbortError'
            ? `Runway API request timed out after ${CREATE_TASK_TIMEOUT_MS / 1000}s`
            : `Runway API request failed: ${cause}`;
        logger.error({ err, cause: (err as Error)?.cause }, 'Runway create task fetch failed');
        throw new Error(msg);
      }
    }
    const cause = lastErr instanceof Error
      ? (lastErr.cause && typeof (lastErr.cause as Error).message === 'string'
        ? (lastErr.cause as Error).message
        : lastErr.message)
      : String(lastErr);
    throw new Error(`Runway API request failed after ${CREATE_TASK_RETRIES} attempts: ${cause}`);
  }

  private async pollTask(taskId: string): Promise<string> {
    const url = `${RUNWAY_BASE}/tasks/${taskId}`;
    const startTime = Date.now();

    while (Date.now() - startTime < MAX_POLL_DURATION_MS) {
      await this.sleep(POLL_INTERVAL_MS);

      const pollController = new AbortController();
      const pollTimeoutId = setTimeout(() => pollController.abort(), POLL_REQUEST_TIMEOUT_MS);
      let res: Response;
      try {
        res = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'X-Runway-Version': RUNWAY_VERSION,
          },
          signal: pollController.signal,
        });
      } catch (err: unknown) {
        clearTimeout(pollTimeoutId);
        logger.warn({ 
          taskId, 
          err: (err as Error)?.message,
          code: (err as any)?.code,
          cause: (err as Error)?.cause 
        }, 'Runway poll request failed, will retry');
        continue;
      }
      clearTimeout(pollTimeoutId);

      const text = await res.text();
      if (!res.ok) {
        logger.warn({ taskId, status: res.status, body: text }, 'Runway poll error');
        continue;
      }

      let data: RunwayTaskResponse;
      try {
        data = JSON.parse(text) as RunwayTaskResponse;
      } catch {
        continue;
      }

      if (data.status === 'SUCCEEDED') {
        const outputUrl = data.output?.[0];
        if (!outputUrl) {
          throw new Error('Runway task succeeded but no output URL');
        }
        return outputUrl;
      }

      if (data.status === 'FAILED' || data.status === 'CANCELED') {
        const err = data.error || data.status;
        throw new Error(`Runway task ${data.status}: ${err}`);
      }

      logger.debug('Runway task pending', { taskId, status: data.status });
    }

    throw new Error(`Runway video generation timed out after ${MAX_POLL_DURATION_MS / 1000}s`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
