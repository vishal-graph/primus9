/**
 * TatvaOps Vision - Room 2D Views Generation
 *
 * Single top-down bird's-eye view per room. Moodboard primary, elevation secondary.
 */

import { createHash } from 'crypto';
import { getGeminiClient } from '../common/gemini-client';
import {
  extractStyleFromMoodboard,
  generateStyleHash,
  buildStyleInstructionString,
} from '../elevation/styleExtractor';
import { Room2DViewInput, Room2DViewOutput, Room2DViewsResult } from './types';
import { buildBirdViewPrompt } from './promptBuilder';
import { logger } from '../../lib/logger';

const VIEW_TIMEOUT_MS = 120000;
const VIEW_TEMPERATURE = 0.3;

function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').substring(0, 16);
}

export async function generateRoom2DViews(
  input: Room2DViewInput
): Promise<Room2DViewsResult> {
  const startTime = Date.now();
  logger.info('Starting room 2D views generation (single bird view)', {
    jobId: input.jobId,
    roomId: input.roomId,
    projectId: input.projectId,
  });

  const style = await extractStyleFromMoodboard(
    input.moodboardUrl,
    input.roomGeometry.roomType,
    input.roomGeometry.roomName
  );

  const styleHash = generateStyleHash(style);
  const styleInstruction = buildStyleInstructionString(
    style,
    'NORTH',
    input.roomGeometry.roomName
  );

  const prompt = buildBirdViewPrompt({
    roomGeometry: input.roomGeometry,
    styleInstruction,
    connectedRooms: input.connectedRooms,
    isometricUrl: input.isometricUrl,
  });

  const promptHash = hashPrompt(prompt);
  const gemini = getGeminiClient();

  const { imageData, mimeType } = await gemini.generateImage(prompt, {
    timeoutMs: VIEW_TIMEOUT_MS,
    temperature: VIEW_TEMPERATURE,
  });

  const view: Room2DViewOutput = {
    viewType: 'BIRD_VIEW',
    imageData,
    mimeType,
    geometryHash: input.roomGeometry.geometryHash,
    styleHash,
    promptHash,
    durationMs: Date.now() - startTime,
  };

  return { views: [view] };
}
