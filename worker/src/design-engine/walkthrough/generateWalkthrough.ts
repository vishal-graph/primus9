/**
 * TatvaOps Vision - Walkthrough Video Generation (Runway)
 *
 * Two-step flow so prompt is primary and bird's-eye image is reference only:
 * 1) gen4_turbo image_to_video: bird view + minimal prompt → short clip
 * 2) gen4_aleph video_to_video: that clip + full prompt (primary) + bird view as reference only
 */

import { randomUUID } from 'crypto';
import { logger } from '../../lib/logger';
import { generateSignedUrl, uploadToS3 } from '../../lib/s3';
import { RunwayClient } from './runwayClient';
import { extractStyleFromMoodboard } from '../elevation/styleExtractor';
import type { WalkthroughResult } from './types';

export interface GenerateWalkthroughInput {
  roomName: string;
  roomType: string;
  dimensions?: { width?: number; height?: number; area?: number };
  moodboardS3Key: string;
  elevationS3Key: string;
  twoDViewS3Keys: string[];
  s3Bucket: string;
  rendersBucket: string;
  runwayApiKey: string;
  /** Signed URL for the first 2D view (bird's-eye) image. */
  firstViewSignedUrl: string;
}

/** Runway API limits promptText to 1000 characters. Keep prompt under that. */
const RUNWAY_PROMPT_MAX_LEN = 1000;

/** Core: ignore image angle; camera at eye height only; person POV; full room. */
const RUNWAY_PROMPT_CORE =
  'Do not use the image’s camera angle. The image may be from above or bird’s-eye—ignore that. Camera must be at human eye height only: as if a person standing on the floor, looking horizontally at the room. Eye-level view throughout: we see walls, furniture, and the space at standing height, never from above or top-down. Use the image only for the room’s style, colors, and layout; reinterpret everything from ground-level first-person view. Smooth pan/sweep at 1.8x pace so the full room is visible; cover at least 300 degrees. No shaking. Photorealistic walkthrough, person’s perspective only.';

async function buildRunwayDynamicPrompt(input: GenerateWalkthroughInput): Promise<string> {
  let context = `${input.roomName} (${input.roomType.replace('_', ' ')}). `;
  try {
    const moodboardUrl = await generateSignedUrl(
      input.s3Bucket,
      input.moodboardS3Key,
      3600
    );
    const style = await extractStyleFromMoodboard(
      moodboardUrl,
      input.roomType,
      input.roomName
    );
    context += `${style.aesthetic}. ${style.colorPalette.slice(0, 2).join(', ')}. `;
  } catch (err) {
    logger.warn('Moodboard style extraction skipped for walkthrough prompt', {
      roomName: input.roomName,
      error: String(err),
    });
  }
  const full = `${RUNWAY_PROMPT_CORE} Context: ${context}`.trim();
  if (full.length <= RUNWAY_PROMPT_MAX_LEN) return full;
  return full.slice(0, RUNWAY_PROMPT_MAX_LEN);
}

/**
 * Generate walkthrough video for a single room (Runway Gen-4.5 image-to-video).
 * Requires RUNWAY_API_KEY and a bird's-eye 2D view signed URL.
 */
export async function generateWalkthrough(
  input: GenerateWalkthroughInput
): Promise<WalkthroughResult> {
  const startTime = Date.now();

  if (!input.runwayApiKey?.trim()) {
    throw new Error('RUNWAY_API_KEY is required for walkthrough generation');
  }
  if (!input.firstViewSignedUrl?.trim()) {
    throw new Error('firstViewSignedUrl (bird’s-eye 2D view) is required for walkthrough generation');
  }

  logger.info('Starting walkthrough generation (Runway)', {
    roomName: input.roomName,
    roomType: input.roomType,
    flow: 'gen4.5 image-to-video',
  });

  const promptText = await buildRunwayDynamicPrompt(input);
  if (promptText.length > 1000) {
    throw new Error('Runway prompt must be ≤1000 characters');
  }
  
  const runway = new RunwayClient(input.runwayApiKey);

  // Direct image-to-video (Gen-4.5)
  const { videoData, mimeType } = await runway.generateVideo(
    input.firstViewSignedUrl,
    {
      duration: 10,
      ratio: '1280:720',
      promptText: promptText,
    }
  );

  const generationTimeMs = Date.now() - startTime;
  logger.info('Walkthrough video generated (Runway gen4.5)', {
    generationTimeMs,
    videoSize: videoData.length,
  });

  return {
    videoData,
    mimeType,
    durationSeconds: 10,
    resolution: '1920x1080',
    generationTimeMs,
  };
}
