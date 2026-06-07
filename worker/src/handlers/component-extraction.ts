/**
 * TatvaOps Vision - Component & Material Extraction Handler
 *
 * Extracts structured room-wise components and materials
 * from moodboard, 3D elevation, and 2D room views.
 */

import { Message } from '@aws-sdk/client-sqs';
import { Prisma } from '@prisma/client';
import { logger } from '../lib/logger';
import { getPrisma } from '../lib/prisma';
import { config } from '../config';
import { validateJobGuardrails } from '../services/plan-guardrails';
import { downloadFromS3, uploadToS3 } from '../lib/s3';
import { getGeminiClient } from '../design-engine/common/gemini-client';
import { buildComponentExtractionPrompt } from '../design-engine/component-extraction/promptBuilder';
import {
  buildRoomScaleContextBlock,
  ensureNumericApproximateSize,
  extractCirculationHintFromProjectMetadata,
  extractRoomMetricsFromRoom,
  stripBareSizeLetterLabel,
  type RoomExtractionMetrics,
} from '../design-engine/component-extraction/roomScaleForExtraction';
import {
  ComponentExtractionResult,
  ComponentExtractionRow,
  PricingType,
} from '../design-engine/component-extraction/types';
import { GeminiPart } from '../design-engine/types';
import { inferShoppableHotspots } from '../services/shoppable-hotspots';
import { catalogMatchesFromMoodboardMetadata } from '../services/moodboard-catalog-matches';
import { enrichExtractionRowsWithCatalog } from '../services/extraction-catalog-bridge';

const prisma = getPrisma();

async function failComponentExtractionJob(jobId: string, error: string): Promise<boolean> {
  await prisma.aIJob.update({
    where: { id: jobId },
    data: {
      status: 'FAILED',
      completedAt: new Date(),
      error,
      result: { error },
    },
  });
  return true;
}

interface ComponentExtractionJobPayload {
  jobId: string;
  projectId: string;
  roomId: string;
  userId: string;
  version?: number;
}

const REQUIRED_VIEW_TYPES = ['BIRD_VIEW'] as const;

const BUY_LINK_FALLBACKS: Record<string, Array<{ label: string; url: string; note?: string }>> = {
  Furniture: [
    { label: 'IKEA India', url: 'https://www.ikea.com/in/en/cat/furniture-fu001/' },
    { label: 'Pepperfry', url: 'https://www.pepperfry.com/furniture.html' },
    { label: 'Urban Ladder', url: 'https://www.urbanladder.com/furniture' },
  ],
  'Fixed Components': [
    { label: 'Hafele', url: 'https://www.hafeleindia.com/en/' },
    { label: 'Hettich', url: 'https://www.hettich.com/india/en-in/' },
  ],
  'Materials & Finishes': [
    { label: 'Asian Paints', url: 'https://www.asianpaints.com/' },
    { label: 'Kajaria', url: 'https://www.kajariaceramics.com/' },
    { label: 'Asian Granito', url: 'https://www.asiangranito.com/' },
  ],
  Lighting: [
    { label: 'Amazon India', url: 'https://www.amazon.in/s?i=lighting' },
    { label: 'Flipkart', url: 'https://www.flipkart.com/search?q=lighting' },
  ],
  'Decor & Accessories': [
    { label: 'Pepperfry', url: 'https://www.pepperfry.com/home-decor.html' },
    { label: 'Amazon India', url: 'https://www.amazon.in/s?i=home-decor' },
  ],
};

function extractJsonBlock(text: string): string {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in response');
  }
  return text.slice(start, end + 1);
}

const APPROX_DISCLAIMER =
  'Approximate—estimated from visuals; not measured on site; verify before procurement.';

function ensureApproximateDisclaimer(
  row: ComponentExtractionRow
): ComponentExtractionRow {
  const cat = row.componentCategory;
  if (cat !== 'Furniture' && cat !== 'Fixed Components') {
    return row;
  }
  const text = (row.approximateSize || '').trim();
  // Let ensureNumericApproximateSize fill dimensions first—never inject bare S/M/L here.
  if (!text) {
    return row;
  }
  const hasApproxHint =
    /\bapprox\.?|approximate|estimated|not measured|verify before|~/.test(text.toLowerCase());
  if (hasApproxHint) {
    return row;
  }
  return { ...row, approximateSize: `${text} | ${APPROX_DISCLAIMER}` };
}

const VALID_COMPONENT_CATEGORIES = new Set([
  'Furniture',
  'Fixed Components',
  'Materials & Finishes',
  'Lighting',
  'Decor & Accessories',
]);

/** Gemini often returns "Fixed" or "Materials" — map so fallbacks and buy links work. */
function normalizeComponentCategory(raw: unknown): ComponentExtractionRow['componentCategory'] {
  const s = String(raw ?? '').trim();
  if (VALID_COMPONENT_CATEGORIES.has(s)) {
    return s as ComponentExtractionRow['componentCategory'];
  }
  const lower = s.toLowerCase().replace(/\s+/g, ' ');
  if (lower === 'fixed' || lower === 'fixed component' || lower.startsWith('fixed')) {
    return 'Fixed Components';
  }
  if (
    lower === 'materials' ||
    lower === 'finishes' ||
    lower === 'material' ||
    lower === 'finish' ||
    lower === 'materials and finishes' ||
    (lower.includes('material') && lower.includes('finish'))
  ) {
    return 'Materials & Finishes';
  }
  if (lower === 'furniture') return 'Furniture';
  if (lower === 'lighting' || lower === 'light' || lower === 'lights') return 'Lighting';
  if (lower === 'decor' || lower === 'accessories' || lower === 'decor & accessories') {
    return 'Decor & Accessories';
  }
  return 'Materials & Finishes';
}

const VALID_PRICING_TYPES = new Set<PricingType>(['area', 'unit', 'custom']);

// Labour cost guardrails (per line item) in INR.
// Prevents the model from emitting unrealistic tiny or huge labour values.
const MIN_LABOUR_COST = 100;
const MAX_LABOUR_COST = 50000;

function coerceRupee(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[₹Rs.,\s]/gi, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? Math.round(n) : 0;
  }
  return 0;
}

/**
 * Ensures BOQ fields exist (older extractions / partial model output) and total = material + labour.
 */
function normalizePricingFields(row: ComponentExtractionRow): ComponentExtractionRow {
  const raw = row as unknown as Record<string, unknown>;
  let pricingType = String(raw.pricingType ?? '')
    .toLowerCase()
    .trim();
  if (!VALID_PRICING_TYPES.has(pricingType as PricingType)) {
    pricingType = 'unit';
  }
  const materialCost = coerceRupee(raw.materialCost);
  let labourCost = coerceRupee(raw.labourCost);

  // Clamp labour cost into a sensible range when present.
  if (labourCost > 0 && labourCost < MIN_LABOUR_COST) {
    labourCost = MIN_LABOUR_COST;
  } else if (labourCost > MAX_LABOUR_COST) {
    labourCost = MAX_LABOUR_COST;
  }
  let totalCost = coerceRupee(raw.totalCost);
  const sum = materialCost + labourCost;
  let notes = String(raw.notes ?? row.notes ?? '').trim();
  if (Math.abs(totalCost - sum) > 1) {
    totalCost = sum;
    const fix = 'Adjusted totalCost to materialCost + labourCost.';
    notes = notes ? `${notes} ${fix}` : fix;
  }
  const calculation = String(raw.calculation ?? row.calculation ?? '').trim();
  return {
    ...row,
    pricingType: pricingType as PricingType,
    materialCost,
    labourCost,
    totalCost,
    calculation,
    notes,
  };
}

/** Gemini sometimes returns snake_case or alternate keys. */
function pickApproximateSizeFromRow(row: Record<string, unknown>): string {
  const v =
    row.approximateSize ??
    row.approximate_size ??
    row.size ??
    row.approximateDimensions ??
    row.dimension ??
    '';
  if (v == null) return '';
  return String(v);
}

function normalizeRows(
  result: ComponentExtractionResult,
  roomName: string,
  roomMetrics: RoomExtractionMetrics | null
): ComponentExtractionRow[] {
  if (!result?.rows || !Array.isArray(result.rows)) {
    return [];
  }

  return result.rows
    .map((row) => {
      const componentCategory = normalizeComponentCategory(row.componentCategory);
      return {
        ...row,
        roomName: row.roomName || roomName,
        componentCategory,
        approximateSize: stripBareSizeLetterLabel(
          pickApproximateSizeFromRow(row as unknown as Record<string, unknown>).trim()
        ),
        suggestedBuyLinks:
          Array.isArray(row.suggestedBuyLinks) && row.suggestedBuyLinks.length > 0
            ? row.suggestedBuyLinks
            : BUY_LINK_FALLBACKS[componentCategory] || [],
      };
    })
    .map(ensureApproximateDisclaimer)
    .map((row) => ensureNumericApproximateSize(row, roomMetrics))
    .map(normalizePricingFields)
    .filter((row) => typeof row.confidence === 'number' && row.confidence >= 50);
}

async function buildImagePart(
  bucket: string,
  key: string,
  label: string
): Promise<GeminiPart[]> {
  const { data, contentType } = await downloadFromS3(bucket, key);
  const mimeType = contentType || 'image/jpeg';
  const base64 = data.toString('base64');
  return [
    { text: label },
    {
      inlineData: {
        mimeType,
        data: base64,
      },
    },
  ];
}

export async function handleComponentExtraction(
  message: Message
): Promise<boolean> {
  const requestId = message.MessageId || 'unknown';

  logger.info('Processing component extraction job', {
    requestId,
    messageId: message.MessageId,
  });

  let jobId: string | undefined;
  let projectId: string | undefined;
  let roomId: string | undefined;
  let userId: string | undefined;

  try {
    if (!message.Body) {
      logger.error('Empty message body');
      return true;
    }

    let rawPayload: any;
    try {
      rawPayload = JSON.parse(message.Body);
    } catch (parseError) {
      logger.error('Failed to parse message body', {
        requestId,
        error: String(parseError),
        body: message.Body?.substring(0, 200),
      });
      return true;
    }

    const payload: ComponentExtractionJobPayload = rawPayload.payload || rawPayload;
    jobId = payload.jobId;
    projectId = payload.projectId;
    roomId = payload.roomId;
    userId = payload.userId;

    if (!jobId || !projectId || !roomId || !userId) {
      logger.error('Missing required job fields', { jobId, projectId, roomId, userId });
      if (jobId) {
        return failComponentExtractionJob(jobId, 'Invalid job payload: missing required fields');
      }
      return true;
    }

    await prisma.aIJob.update({
      where: { id: jobId },
      data: { status: 'PROCESSING', startedAt: new Date() },
    });

    const isRegeneration = (payload.version || 1) > 1;
    const guardrails = await validateJobGuardrails(
      userId,
      projectId,
      'COMPONENT_EXTRACTION',
      isRegeneration
    );

    if (!guardrails.allowed) {
      logger.warn('Plan guardrails validation failed', {
        jobId,
        userId,
        projectId,
        roomId,
        error: guardrails.error,
      });

      await prisma.aIJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          result: {
            error: guardrails.error || 'Plan guardrails validation failed',
          },
        },
      });

      return true;
    }

    const room = await prisma.room.findFirst({
      where: { id: roomId, projectId },
      select: { id: true, name: true, type: true, geometry: true, metadata: true },
    });

    if (!room) {
      logger.error('Room not found for component extraction', { roomId, projectId });
      return failComponentExtractionJob(jobId, 'Room not found for component extraction');
    }

    const moodboard = await prisma.roomMoodboard.findFirst({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
      select: { s3Key: true, metadata: true },
    });

    if (!moodboard?.s3Key) {
      logger.error('Missing moodboard for component extraction', { roomId, projectId });
      return failComponentExtractionJob(
        jobId,
        `Generate a moodboard for ${room.name} before extracting components.`
      );
    }

    const isometric = await prisma.isometricFloorElevation.findFirst({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    if (!isometric?.s3Key) {
      logger.error('Missing isometric elevation for component extraction', { projectId });
      return failComponentExtractionJob(
        jobId,
        'Generate the 3D isometric elevation before extracting components.'
      );
    }

    const views = await prisma.room2DView.findMany({
      where: { roomId },
      orderBy: { createdAt: 'desc' },
    });

    const latestViewsByType = new Map<string, typeof views[number]>();
    for (const view of views) {
      if (!latestViewsByType.has(view.viewType)) {
        latestViewsByType.set(view.viewType, view);
      }
    }
    /** Prefer highest BIRD_VIEW version (matches UI default) over newest-by-createdAt. */
    const birdCandidates = views.filter((v) => v.viewType === 'BIRD_VIEW');
    if (birdCandidates.length > 0) {
      const highestBird = birdCandidates.reduce((a, b) => (a.version >= b.version ? a : b));
      latestViewsByType.set('BIRD_VIEW', highestBird);
    }

    const missingViews = REQUIRED_VIEW_TYPES.filter(
      (type) => !latestViewsByType.get(type) || !latestViewsByType.get(type)?.s3Key
    );

    if (missingViews.length > 0) {
      logger.error('Missing 2D views for component extraction', {
        roomId,
        projectId,
        missingViews,
      });
      return failComponentExtractionJob(
        jobId,
        `Generate 2D bird's-eye view for ${room.name} before extracting components (2D Views stage).`
      );
    }

    const parts: GeminiPart[] = [];
    parts.push(
      ...(await buildImagePart(config.s3BucketMoodboards, moodboard.s3Key, 'Room moodboard'))
    );
    parts.push(...(await buildImagePart(config.s3BucketRenders, isometric.s3Key, '3D elevation (isometric)')));

    for (const viewType of REQUIRED_VIEW_TYPES) {
      const view = latestViewsByType.get(viewType);
      if (view?.s3Key) {
        parts.push(
          ...(await buildImagePart(
            config.s3BucketRenders,
            view.s3Key,
            '2D view: top bird\'s-eye room view'
          ))
        );
      }
    }

    const projectRow = await prisma.project.findFirst({
      where: { id: projectId },
      select: { metadata: true },
    });
    const circulationHint = extractCirculationHintFromProjectMetadata(projectRow?.metadata);
    const roomMetrics = extractRoomMetricsFromRoom(room, room.type);
    const roomScaleBlock = buildRoomScaleContextBlock(room.name, roomMetrics, circulationHint);
    parts.push({
      text: buildComponentExtractionPrompt(room.name, roomScaleBlock, room.type || ''),
    });

    const gemini = getGeminiClient();
    let responseText = '';
    try {
      responseText = await gemini.analyzeContent(parts, {
        timeoutMs: 120000,
      });
    } catch (geminiError) {
      logger.error('Gemini component extraction call failed', {
        error: geminiError instanceof Error ? geminiError.message : String(geminiError),
        jobId,
        projectId,
        roomId,
        partsCount: parts.length,
      });
      throw geminiError;
    }

    let parsed: ComponentExtractionResult;
    try {
      const jsonText = extractJsonBlock(responseText);
      parsed = JSON.parse(jsonText) as ComponentExtractionResult;
    } catch (parseError) {
      logger.error('Failed to parse component extraction response', {
        error: parseError instanceof Error ? parseError.message : String(parseError),
        jobId,
        projectId,
        roomId,
        responsePreview: responseText.slice(0, 800),
      });
      throw parseError;
    }
    const baseRows = normalizeRows(parsed, room.name, roomMetrics);
    const moodCatalog = catalogMatchesFromMoodboardMetadata(moodboard.metadata);
    const { rows, catalogSubset } = enrichExtractionRowsWithCatalog(baseRows, moodCatalog);

    if (rows.length === 0) {
      logger.warn('No valid component rows extracted', { roomId, projectId });
    }

    const existingVersion = await prisma.roomComponentExtraction.findFirst({
      where: { roomId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    const nextVersion = existingVersion ? existingVersion.version + 1 : 1;

    const s3Key = `projects/${projectId}/rooms/${roomId}/components.json`;
    await uploadToS3({
      bucket: config.s3BucketRenders,
      key: s3Key,
      body: JSON.stringify({
        roomName: room.name,
        roomType: room.type || undefined,
        rows,
      }),
      contentType: 'application/json',
      metadata: {
        projectId,
        roomId,
        jobId,
        version: String(nextVersion),
      },
    });

    await prisma.roomComponentExtraction.create({
      data: {
        roomId,
        version: nextVersion,
        data: { roomName: room.name, roomType: room.type || undefined, rows } as any,
        s3Key,
        jobId,
      },
    });

    const birdForTags = latestViewsByType.get('BIRD_VIEW');
    let extractionHotspotCount = 0;
    const rowsLinkedToCatalog = rows.filter((r) => Boolean((r as { catalogMatch?: unknown }).catalogMatch))
      .length;

    const writePriceTagDiagnostics = async (diag: Record<string, unknown>) => {
      if (!birdForTags?.id) return;
      const prev =
        birdForTags.metadata && typeof birdForTags.metadata === 'object'
          ? { ...(birdForTags.metadata as Record<string, unknown>) }
          : {};
      await prisma.room2DView.update({
        where: { id: birdForTags.id },
        data: {
          metadata: {
            ...prev,
            priceTagDiagnostics: {
              at: new Date().toISOString(),
              jobId,
              ...diag,
            },
          } as Prisma.InputJsonValue,
        },
      });
    };

    if (birdForTags?.s3Key && catalogSubset.length > 0) {
      try {
        const { data: imgBuf, contentType } = await downloadFromS3(
          config.s3BucketRenders,
          birdForTags.s3Key
        );
        const mimeType = contentType || 'image/jpeg';
        const imageBase64 = imgBuf.toString('base64');
        const extractionHotspots = await inferShoppableHotspots({
          imageBase64,
          mimeType,
          matches: catalogSubset,
        });
        if (extractionHotspots.length > 0) {
          extractionHotspotCount = extractionHotspots.length;
          const prevMeta =
            birdForTags.metadata && typeof birdForTags.metadata === 'object'
              ? { ...(birdForTags.metadata as Record<string, unknown>) }
              : {};
          await prisma.room2DView.update({
            where: { id: birdForTags.id },
            data: {
              metadata: {
                ...prevMeta,
                shoppableHotspots: extractionHotspots as unknown as Prisma.InputJsonValue,
                hotspotsGeneratedAt: new Date().toISOString(),
                hotspotsSource: 'component_extraction',
                extractionHotspotJobId: jobId,
                priceTagDiagnostics: {
                  at: new Date().toISOString(),
                  jobId,
                  moodboardCatalogCount: moodCatalog.length,
                  linkedSkuCount: catalogSubset.length,
                  extractionRowCount: rows.length,
                  rowsLinkedToCatalog,
                  hotspotCount: extractionHotspots.length,
                  message: 'Price tags placed from catalog-linked extraction rows.',
                },
              } as Prisma.InputJsonValue,
            },
          });
          logger.info('Bird view updated with extraction-driven shoppable hotspots', {
            roomId,
            birdViewId: birdForTags.id,
            hotspotCount: extractionHotspots.length,
            catalogLinked: catalogSubset.length,
          });
        } else {
          logger.warn('Extraction catalog links present but hotspot model returned none', {
            roomId,
            catalogSubsetSize: catalogSubset.length,
          });
          await writePriceTagDiagnostics({
            moodboardCatalogCount: moodCatalog.length,
            linkedSkuCount: catalogSubset.length,
            extractionRowCount: rows.length,
            rowsLinkedToCatalog,
            hotspotCount: 0,
            message:
              'Catalog SKUs were linked to extraction rows, but the vision step did not return hotspot coordinates. Try Generate price tags again or Regenerate view.',
          });
        }
      } catch (hotspotErr) {
        logger.warn(
          {
            err: hotspotErr instanceof Error ? hotspotErr.message : String(hotspotErr),
            roomId,
          },
          'Failed to write extraction-driven hotspots (non-fatal)'
        );
      }
    } else if (catalogSubset.length > 0 && !birdForTags?.s3Key) {
      logger.warn('Catalog-linked extraction rows but missing BIRD_VIEW s3Key', { roomId });
    } else if (birdForTags?.id) {
      const message =
        moodCatalog.length === 0
          ? 'Moodboard has no product catalog matches, so price tags cannot be anchored to SKUs. Fix PRODUCT_CATALOG_DATABASE_URL / network so the worker can reach the catalog DB, then regenerate the moodboard for this room (or the whole project).'
          : `Moodboard listed ${moodCatalog.length} catalog SKU(s), but no extraction row matched them above the confidence threshold.`;
      logger.warn(
        {
          roomId,
          moodboardCatalogCount: moodCatalog.length,
          catalogSubsetSize: catalogSubset.length,
          extractionRows: rows.length,
        },
        'Component extraction: skipping price tags — no catalog-linked rows'
      );
      try {
        await writePriceTagDiagnostics({
          moodboardCatalogCount: moodCatalog.length,
          linkedSkuCount: catalogSubset.length,
          extractionRowCount: rows.length,
          rowsLinkedToCatalog,
          hotspotCount: 0,
          message,
        });
      } catch (e) {
        logger.warn({ err: String(e), roomId }, 'Failed to write priceTagDiagnostics');
      }
    }

    await prisma.aIJob.update({
      where: { id: jobId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        result: {
          roomId,
          roomName: room.name,
          rowCount: rows.length,
          s3Key,
          priceTags: {
            moodboardCatalogCount: moodCatalog.length,
            linkedSkuCount: catalogSubset.length,
            hotspotCount: extractionHotspotCount,
            rowsLinkedToCatalog,
          },
        },
      },
    });

    logger.info('Component extraction completed', {
      projectId,
      roomId,
      rowCount: rows.length,
    });

    return true;
  } catch (error) {
    logger.error('Component extraction failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      jobId,
      projectId,
      roomId,
    });

    if (jobId) {
      await prisma.aIJob.update({
        where: { id: jobId },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          result: {
            error: error instanceof Error ? error.message : String(error),
          },
        },
      });
    }

    return false;
  }
}
