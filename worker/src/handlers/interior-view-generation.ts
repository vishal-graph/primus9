import { GoogleGenerativeAI } from '@google/generative-ai';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config';
import { Logger } from '../lib/logger';

/**
 * Interior View Generation Handler
 * 
 * Architecture Decision:
 * - Generates 3D interior view specifications via Gemini
 * - Future: Integrate with 3D rendering API
 * - Stores results in S3
 */

interface InteriorViewJobData {
  id: string;
  type: string;
  payload: {
    userId: string;
    projectId: string;
    roomId: string;
    viewAngle: number;
    style: string;
    // NEW: Alternative input from 3D Walkthrough Think Layer
    spatialPlanId?: string;  // If present, use SpatialPlan instead of style
  };
  metadata: {
    correlationId: string;
    timestamp: string;
  };
}

interface InteriorViewResult {
  imagePrompt: string;
  cameraSettings: {
    angle: number;
    height: string;
    focalLength: string;
  };
  lightingSettings: {
    natural: string;
    artificial: string[];
    ambience: string;
  };
  renderNotes: string;
}

export async function handleInteriorViewGeneration(
  data: unknown,
  logger: Logger
): Promise<void> {
  const jobData = data as InteriorViewJobData;
  const { userId, projectId, roomId, viewAngle, style, spatialPlanId } = jobData.payload;

  logger.info({ 
    projectId, 
    roomId, 
    viewAngle, 
    hasSpatialPlan: !!spatialPlanId 
  }, 'Starting interior view generation');

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const s3Client = new S3Client({
    region: config.awsRegion,
    credentials: {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    },
  });

  try {
    let prompt: string;
    let viewResult: InteriorViewResult;

    if (spatialPlanId) {
      // NEW PATH: Use SpatialPlan from Think Layer
      logger.info('Using SpatialPlan from Think Layer', { spatialPlanId });
      
      // Import PrismaClient and fetch SpatialPlan
      const { PrismaClient } = await import('@prisma/client');
      const prisma = new PrismaClient();
      
      const spatialPlan = await prisma.spatialPlan.findUnique({
        where: { id: spatialPlanId },
        include: { intentGraph: true },
      });

      if (!spatialPlan) {
        throw new Error(`SpatialPlan not found: ${spatialPlanId}`);
      }

      logger.info('SpatialPlan fetched', { 
        readiness: spatialPlan.readiness,
        roomCount: Object.keys(spatialPlan.roomPlans as any).length,
      });

      // Build prompt from SpatialPlan
      prompt = buildInteriorViewPromptFromSpatialPlan(spatialPlan, roomId, viewAngle);
      
      await prisma.$disconnect();
    } else {
      // EXISTING PATH: Use traditional style-based approach
      logger.info('Using traditional style-based approach');
      prompt = buildInteriorViewPrompt(style, viewAngle);
    }

    // Generate interior view specification
    logger.info('Calling Gemini API for interior view specification');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    viewResult = parseInteriorViewResponse(response);

    logger.info('Interior view specification generated');

    // Store results in S3
    const resultKey = `${userId}/${projectId}/${roomId}/interior-view-${viewAngle}.json`;
    await s3Client.send(new PutObjectCommand({
      Bucket: config.s3BucketRenders,
      Key: resultKey,
      Body: JSON.stringify(viewResult),
      ContentType: 'application/json',
    }));

    // TODO: Generate actual 3D render via rendering API
    // TODO: Update database with result

    logger.info({ projectId, roomId }, 'Interior view generation completed');
  } catch (error) {
    logger.error({ error, projectId, roomId }, 'Interior view generation failed');
    throw error;
  }
}

function buildInteriorViewPrompt(style: string, viewAngle: number): string {
  return `Create a 3D interior view specification for:

Style: ${style}
View Angle: ${viewAngle}° from entrance

Generate:
1. A highly detailed image prompt for 3D rendering
2. Camera settings for the view
3. Lighting configuration
4. Additional render notes

Respond in valid JSON format only:
{
  "imagePrompt": "Photorealistic 3D render of a ${style} room...",
  "cameraSettings": {
    "angle": ${viewAngle},
    "height": "Eye level (5.5 feet)",
    "focalLength": "35mm"
  },
  "lightingSettings": {
    "natural": "Description of natural lighting",
    "artificial": ["Light source 1", "Light source 2"],
    "ambience": "Overall ambience description"
  },
  "renderNotes": "Additional notes..."
}`;
}

function parseInteriorViewResponse(response: string): InteriorViewResult {
  const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                    response.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error('Failed to parse interior view response');
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  return JSON.parse(jsonStr);
}

/**
 * Build interior view prompt from SpatialPlan (3D Walkthrough path)
 */
function buildInteriorViewPromptFromSpatialPlan(
  spatialPlan: any,
  roomId: string,
  viewAngle: number
): string {
  const roomPlans = spatialPlan.roomPlans as Record<string, any>;
  const roomPlan = Object.values(roomPlans).find((r: any) => r.roomId === roomId);
  
  if (!roomPlan) {
    throw new Error(`Room ${roomId} not found in spatial plan`);
  }

  const lightingPlan = spatialPlan.lightingPlan;
  const constraints = spatialPlan.constraints;

  return `Create a 3D interior view specification using this spatial plan:

Room: ${roomPlan.roomName}
Visual Weight: ${roomPlan.visualWeight} (importance: ${roomPlan.visualWeight > 0.8 ? 'high' : 'medium'})
Density: ${roomPlan.density}
View Angle: ${viewAngle}° from entrance

Components to include:
- Primary (focal points): ${roomPlan.components.primary.join(', ')}
- Secondary (supporting): ${roomPlan.components.secondary.join(', ')}
- Ambient (atmosphere): ${roomPlan.components.ambient.join(', ')}

Lighting Strategy:
- Natural light bias: ${lightingPlan.naturalLightBias}
- Artificial types: ${lightingPlan.artificial.join(', ')}
- Mood: ${lightingPlan.mood}
- Directionality: ${lightingPlan.directionality}

Constraints:
- Layout locked: ${constraints.layoutLocked}
- Preserve: ${constraints.preserveElements.join(', ') || 'none'}

Generate:
1. A highly detailed image prompt for 3D rendering
2. Camera settings for the view
3. Lighting configuration
4. Additional render notes

Respond in valid JSON format only:
{
  "imagePrompt": "Photorealistic 3D render of a ${roomPlan.roomName}...",
  "cameraSettings": {
    "angle": ${viewAngle},
    "height": "Eye level (5.5 feet)",
    "focalLength": "35mm"
  },
  "lightingSettings": {
    "natural": "Description of natural lighting",
    "artificial": ["Light source 1", "Light source 2"],
    "ambience": "${lightingPlan.mood}"
  },
  "renderNotes": "Additional notes..."
}`;
}

