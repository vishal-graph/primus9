import { GoogleGenerativeAI } from '@google/generative-ai';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config';
import { Logger } from '../lib/logger';

/**
 * Component Update Handler
 * 
 * Architecture Decision:
 * - Updates individual furniture/component in scene
 * - Generates new specifications via Gemini
 * - Future: Integrate with image editing API for in-painting
 */

interface ComponentUpdateJobData {
  id: string;
  type: string;
  payload: {
    userId: string;
    projectId: string;
    roomId: string;
    componentId: string;
    changes: {
      style: string;
      size: string;
      material: string;
    };
  };
  metadata: {
    correlationId: string;
    timestamp: string;
  };
}

interface ComponentUpdateResult {
  imagePrompt: string;
  inpaintingMask: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  styleNotes: string;
  compatibilityScore: number;
  alternatives: Array<{
    style: string;
    reason: string;
  }>;
}

export async function handleComponentUpdate(
  data: unknown,
  logger: Logger
): Promise<void> {
  const jobData = data as ComponentUpdateJobData;
  const { userId, projectId, roomId, componentId, changes } = jobData.payload;

  logger.info({ projectId, roomId, componentId }, 'Starting component update');

  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const s3Client = new S3Client({
    region: config.awsRegion,
    credentials: {
      accessKeyId: config.awsAccessKeyId,
      secretAccessKey: config.awsSecretAccessKey,
    },
  });

  try {
    // Generate component update specification
    logger.info('Calling Gemini API for component update specification');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = buildComponentUpdatePrompt(changes);
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const updateResult = parseComponentUpdateResponse(response);

    logger.info({ compatibilityScore: updateResult.compatibilityScore }, 'Component update specification generated');

    // Store results in S3
    const resultKey = `${userId}/${projectId}/${roomId}/component-${componentId}-update.json`;
    await s3Client.send(new PutObjectCommand({
      Bucket: config.s3BucketRenders,
      Key: resultKey,
      Body: JSON.stringify(updateResult),
      ContentType: 'application/json',
    }));

    // TODO: Apply component update via image editing API
    // TODO: Update database with result

    logger.info({ projectId, roomId, componentId }, 'Component update completed');
  } catch (error) {
    logger.error({ error, projectId, roomId, componentId }, 'Component update failed');
    throw error;
  }
}

function buildComponentUpdatePrompt(changes: ComponentUpdateJobData['payload']['changes']): string {
  return `Generate a component replacement specification:

New Component Configuration:
- Style: ${changes.style}
- Size: ${changes.size}
- Material: ${changes.material}

Generate:
1. A detailed prompt for the new component
2. Estimated mask area for replacement
3. Style compatibility notes
4. Alternative suggestions if the style doesn't fit

Respond in valid JSON format only:
{
  "imagePrompt": "Detailed prompt for the new component...",
  "inpaintingMask": { "x": 20, "y": 30, "width": 25, "height": 20 },
  "styleNotes": "How well the new component fits...",
  "compatibilityScore": 0.85,
  "alternatives": [
    { "style": "Alternative style", "reason": "Why it might work better" }
  ]
}`;
}

function parseComponentUpdateResponse(response: string): ComponentUpdateResult {
  const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) ||
                    response.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    throw new Error('Failed to parse component update response');
  }

  const jsonStr = jsonMatch[1] || jsonMatch[0];
  return JSON.parse(jsonStr);
}

