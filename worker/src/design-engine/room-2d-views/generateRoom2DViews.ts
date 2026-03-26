/**
 * TatvaOps Vision - Room 2D Views Generation
 *
 * 3D Views (bird's-eye corner): moodboard + full-floor isometric as reference images only.
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

const VIEW_TIMEOUT_MS = 180_000;
const VIEW_TEMPERATURE = 0.25;

function hashPrompt(prompt: string): string {
  return createHash('sha256').update(prompt).digest('hex').substring(0, 16);
}

/** Fetch remote image as base64 for Gemini inlineData */
async function fetchUrlAsReference(
  url: string,
  label: string
): Promise<{ data: string; mimeType: string } | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 120_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      logger.warn('Reference image fetch failed', { label, status: res.status });
      return null;
    }
    const mimeRaw = res.headers.get('content-type') || 'image/png';
    const mimeType = mimeRaw.split(';')[0].trim();
    if (mimeType.includes('svg')) {
      logger.warn('Skipping SVG reference', { label });
      return null;
    }
    const buf = await res.arrayBuffer();
    const data = Buffer.from(buf).toString('base64');
    if (data.length < 100) {
      logger.warn('Reference image too small', { label });
      return null;
    }
    return { data, mimeType: mimeType || 'image/png' };
  } catch (e) {
    logger.warn('Reference image fetch error', { label, error: String(e) });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function generateRoom2DViews(
  input: Room2DViewInput
): Promise<Room2DViewsResult> {
  const startTime = Date.now();
  logger.info('Starting room 3D views generation (moodboard + isometric references)', {
    jobId: input.jobId,
    roomId: input.roomId,
    projectId: input.projectId,
    hasIsometric: !!input.isometricUrl,
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

  type LoadedRef = { data: string; mimeType: string; kind: 'moodboard' | 'isometric' };
  const loaded: LoadedRef[] = [];

  const mb = await fetchUrlAsReference(input.moodboardUrl, 'moodboard');
  if (!mb) {
    throw new Error('Failed to load moodboard image for 3D view generation');
  }
  loaded.push({ ...mb, kind: 'moodboard' });

  if (input.isometricUrl) {
    const iso = await fetchUrlAsReference(input.isometricUrl, 'isometric');
    if (iso) {
      loaded.push({ ...iso, kind: 'isometric' });
    } else {
      logger.warn('Isometric reference omitted (fetch failed); continuing without full-floor context');
    }
  }

  const hasIsometricReference = loaded.some((r) => r.kind === 'isometric');

  const prompt = buildBirdViewPrompt({
    roomGeometry: input.roomGeometry,
    styleInstruction,
    connectedRooms: input.connectedRooms,
    hasIsometricReference,
    enrichedSpatialNotes: input.enrichedSpatialNotes,
    designIntent: input.designIntent,
  });

  const promptHash = hashPrompt(prompt);
  const gemini = getGeminiClient();

  const referenceImages = loaded.map((r) => ({ data: r.data, mimeType: r.mimeType }));

  logger.info('Reference images assembled for 3D view', {
    count: referenceImages.length,
    hasIsometric: hasIsometricReference,
  });

  const { imageData, mimeType } = await gemini.generateImageWithReferences(prompt, referenceImages, {
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
