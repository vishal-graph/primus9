/**
 * TatvaOps Vision - PDF Export Handler
 * 
 * SQS handler for PDF_EXPORT jobs.
 * Generates branded PDF documents from moodboards.
 * 
 * PDF Structure:
 * - Cover Page: Project name, client info, TatvaOps branding
 * - Room Pages: One section per room with moodboard + description
 * - Final Page: Disclaimer and timestamp
 * 
 * ============================================================
 * ❗ PDF IS GENERATED SERVER-SIDE, NEVER IN FRONTEND ❗
 * ============================================================
 */

import { Message } from '@aws-sdk/client-sqs';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';
import { config } from '../config';
import { logger } from '../lib/logger';
import { getPrisma } from '../lib/prisma';

// ===========================================
// Logo Loading
// ===========================================

let logoBuffer: Buffer | null = null;

/**
 * Load TatvaOps logo from various possible locations.
 * Caches the logo in memory for reuse.
 */
async function getLogoBuffer(): Promise<Buffer | null> {
  if (logoBuffer) {
    return logoBuffer;
  }

  // Try different logo paths
  const possiblePaths = [
    // Worker assets folder
    path.join(__dirname, '../../assets/logo.png'),
    path.join(__dirname, '../../../assets/logo.png'),
    // Frontend public folder (relative to monorepo)
    path.join(__dirname, '../../../../frontend/public/logo.png'),
    // Alternative locations
    path.join(process.cwd(), 'assets/logo.png'),
    path.join(process.cwd(), '../frontend/public/logo.png'),
  ];

  for (const logoPath of possiblePaths) {
    try {
      if (fs.existsSync(logoPath)) {
        logoBuffer = fs.readFileSync(logoPath);
        logger.info('Loaded TatvaOps logo', { path: logoPath, size: logoBuffer.length });
        return logoBuffer;
      }
    } catch (e) {
      // Continue trying other paths
    }
  }

  logger.warn('TatvaOps logo not found, will use text branding');
  return null;
}

const prisma = getPrisma();

// ===========================================
// S3 Client
// ===========================================

const s3Client = new S3Client({
  region: config.awsRegion,
  credentials: {
    accessKeyId: config.awsAccessKeyId,
    secretAccessKey: config.awsSecretAccessKey,
  },
});

// ===========================================
// Types
// ===========================================

interface PdfExportPayload {
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
}

interface RoomData {
  id: string;
  name: string;
  type: string;
  moodboardUrl: string | null;
  moodboardS3Key: string | null;
  style: string | null;
  colorPalette: string[];
  description: string;
}

// ===========================================
// Style Constants
// ===========================================

const COLORS = {
  // Primary branding
  primary: '#1a1a2e',        // Dark navy - titles
  secondary: '#374151',      // Slate gray - subtitles
  accent: '#4f46e5',         // Indigo - subtle accent
  
  // Text colors
  text: '#374151',           // Dark gray - body text
  textLight: '#6b7280',      // Medium gray - secondary
  textMuted: '#9ca3af',      // Light gray - captions
  
  // Single highlight color (subtle indigo)
  highlight: '#4f46e5',      // Indigo - for all highlights
  
  // Background
  background: '#ffffff',
  backgroundLight: '#f9fafb',
  divider: '#e5e7eb',
};

const FONTS = {
  title: 'Helvetica-Bold',
  heading: 'Helvetica-Bold',
  body: 'Helvetica',
  italic: 'Helvetica-Oblique',
  boldItalic: 'Helvetica-BoldOblique',
};

// ===========================================
// Main Handler
// ===========================================

/**
 * Handle PDF export job from SQS.
 * 
 * @returns true if message should be deleted, false to retry
 */
export async function handlePdfExport(message: Message): Promise<boolean> {
  const requestId = message.MessageId || 'unknown';
  
  logger.info('Processing PDF export job', {
    requestId,
    messageId: message.MessageId,
  });

  let jobId: string | undefined;
  let exportId: string | undefined;

  try {
    // ===========================================
    // Parse Message
    // ===========================================
    
    if (!message.Body) {
      logger.error('Empty message body');
      return true; // Delete malformed message
    }

    let rawPayload: any;
    try {
      rawPayload = JSON.parse(message.Body);
    } catch (parseError) {
      logger.error('Failed to parse message body', {
        requestId,
        error: String(parseError),
      });
      return true; // Delete malformed message
    }

    const payload: PdfExportPayload = rawPayload.payload || rawPayload;
    
    jobId = payload.jobId;
    exportId = payload.exportId;
    const { userId, projectId, type, options } = payload;

    if (!jobId || !exportId || !projectId || !userId) {
      logger.error('Missing required fields in payload', { 
        requestId,
        jobId,
        exportId,
        projectId,
        userId,
      });
      return true; // Delete malformed message
    }

    logger.info('Processing PDF export', {
      requestId,
      jobId,
      exportId,
      projectId,
      type,
    });

    // ===========================================
    // Update Status: PROCESSING
    // ===========================================
    
    await updateExportStatus(exportId, 'PROCESSING');
    await updateJobStatus(jobId, 'PROCESSING');

    // ===========================================
    // Load Project Data
    // ===========================================
    
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        user: {
          select: { name: true, email: true },
        },
        rooms: {
          include: {
            moodboards: {
              orderBy: { version: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    logger.info('Loaded project data', {
      projectId,
      projectName: project.name,
      roomCount: project.rooms.length,
    });

    // ===========================================
    // Prepare Room Data
    // ===========================================
    
    const roomsData: RoomData[] = [];

    for (const room of project.rooms) {
      const latestMoodboard = room.moodboards[0];
      
      if (!latestMoodboard) {
        continue; // Skip rooms without moodboards
      }

      // Generate description from moodboard metadata
      const description = generateRoomDescription(
        room.name,
        room.type,
        latestMoodboard.style,
        latestMoodboard.colorPalette
      );

      roomsData.push({
        id: room.id,
        name: room.name,
        type: room.type,
        moodboardUrl: latestMoodboard.imageUrl,
        moodboardS3Key: latestMoodboard.s3Key,
        style: latestMoodboard.style,
        colorPalette: latestMoodboard.colorPalette,
        description,
      });
    }

    if (roomsData.length === 0) {
      throw new Error('No rooms with moodboards found');
    }

    logger.info('Prepared room data', {
      roomCount: roomsData.length,
      rooms: roomsData.map(r => r.name),
    });

    // ===========================================
    // Generate PDF
    // ===========================================
    
    logger.info('Generating PDF document', { projectId });

    const pdfBuffer = await generateMoodboardPdf({
      projectName: project.name,
      clientName: project.user.name || project.user.email,
      rooms: roomsData,
      options: options || {},
    });

    logger.info('PDF generated', {
      size: pdfBuffer.length,
      projectId,
    });

    // ===========================================
    // Upload to S3
    // ===========================================
    
    const timestamp = Date.now();
    const sanitizedProjectName = project.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
    
    const filename = `${sanitizedProjectName}-moodboard-design.pdf`;
    const s3Key = `exports/${projectId}/${timestamp}-${filename}`;
    const bucket = config.s3BucketExports;

    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      Metadata: {
        projectId,
        userId,
        type: 'MOODBOARD_PDF',
        roomCount: String(roomsData.length),
      },
    }));

    logger.info('PDF uploaded to S3', {
      bucket,
      s3Key,
      size: pdfBuffer.length,
    });

    // ===========================================
    // Update Export Status: COMPLETED
    // ===========================================
    
    await prisma.exportAsset.update({
      where: { id: exportId },
      data: {
        status: 'COMPLETED',
        s3Key,
        s3Bucket: bucket,
        filename,
        contentType: 'application/pdf',
        fileSize: pdfBuffer.length,
        completedAt: new Date(),
        metadata: {
          roomCount: roomsData.length,
          rooms: roomsData.map(r => ({ name: r.name, style: r.style })),
          generatedAt: new Date().toISOString(),
        },
      },
    });

    await updateJobStatus(jobId, 'COMPLETED', {
      result: {
        exportId,
        s3Key,
        filename,
        fileSize: pdfBuffer.length,
        roomCount: roomsData.length,
      },
    });

    logger.info('PDF export completed', {
      requestId,
      jobId,
      exportId,
      s3Key,
      roomCount: roomsData.length,
    });

    return true; // Delete message

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    logger.error('PDF export failed', {
      requestId,
      jobId,
      exportId,
      error: errorMessage,
    });

    // Update status to FAILED
    if (exportId) {
      await prisma.exportAsset.update({
        where: { id: exportId },
        data: {
          status: 'FAILED',
          error: errorMessage,
        },
      }).catch(() => {});
    }

    if (jobId) {
      await updateJobStatus(jobId, 'FAILED', {
        error: { message: errorMessage },
      }).catch(() => {});
    }

    return true; // Delete message (don't retry failed exports)
  }
}

// ===========================================
// PDF Generation
// ===========================================

interface PdfGenerationInput {
  projectName: string;
  clientName: string | null;
  rooms: RoomData[];
  options: {
    includeDescriptions?: boolean;
    brandingTheme?: string;
  };
}

/**
 * Generate a branded moodboard PDF document.
 */
async function generateMoodboardPdf(input: PdfGenerationInput): Promise<Buffer> {
  const { projectName, clientName, rooms, options } = input;
  
  return new Promise(async (resolve, reject) => {
    try {
      const chunks: Buffer[] = [];
      
      // Create PDF document (A4 size)
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `${projectName} - Design Moodboard`,
          Author: 'TatvaOps Vision',
          Subject: 'Interior Design Moodboard',
          Creator: 'TatvaOps Vision Platform',
        },
      });

      // Collect PDF data
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ===========================================
      // Cover Page (Clean Professional Design)
      // ===========================================
      
      // Load logo once for entire document
      const logo = await getLogoBuffer();
      
      // Dark elegant background
      doc
        .rect(0, 0, doc.page.width, doc.page.height)
        .fill(COLORS.primary);

      // TatvaOps Logo (centered)
      if (logo) {
        try {
          doc.image(logo, (doc.page.width - 130) / 2, 160, {
            fit: [130, 50],
            align: 'center',
          });
        } catch (logoError) {
          logger.warn('Failed to add logo to cover page', { error: String(logoError) });
        }
      }

      // Subtle divider line
      doc
        .strokeColor('#ffffff')
        .opacity(0.2)
        .lineWidth(0.5)
        .moveTo(doc.page.width / 2 - 80, 230)
        .lineTo(doc.page.width / 2 + 80, 230)
        .stroke()
        .opacity(1);

      // Project Title - clean typography
      doc
        .fillColor('#ffffff')
        .font(FONTS.title)
        .fontSize(28)
        .text(projectName, 50, 270, {
          align: 'center',
          width: doc.page.width - 100,
          lineBreak: false,
        });

      // Subtitle
      doc
        .fillColor('#ffffff')
        .opacity(0.8)
        .font(FONTS.italic)
        .fontSize(14)
        .text('Interior Design Moodboard', 50, 310, {
          align: 'center',
          width: doc.page.width - 100,
          lineBreak: false,
        })
        .opacity(1);

      // Client name
      if (clientName) {
        doc
          .fillColor('#ffffff')
          .opacity(0.6)
          .font(FONTS.body)
          .fontSize(11)
          .text('Prepared for', 50, 380, {
            align: 'center',
            width: doc.page.width - 100,
            lineBreak: false,
          });
        doc
          .fillColor('#ffffff')
          .opacity(0.9)
          .font(FONTS.heading)
          .fontSize(13)
          .text(clientName, 50, 398, {
            align: 'center',
            width: doc.page.width - 100,
            lineBreak: false,
          })
          .opacity(1);
      }

      // Date
      doc
        .fillColor('#ffffff')
        .opacity(0.5)
        .font(FONTS.body)
        .fontSize(10)
        .text(new Date().toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }), 50, 440, {
          align: 'center',
          width: doc.page.width - 100,
          lineBreak: false,
        })
        .opacity(1);

      // Room count
      doc
        .fillColor('#ffffff')
        .opacity(0.6)
        .font(FONTS.body)
        .fontSize(10)
        .text(`${rooms.length} Room${rooms.length > 1 ? 's' : ''} Included`, 50, 470, {
          align: 'center',
          width: doc.page.width - 100,
          lineBreak: false,
        })
        .opacity(1);

      // Footer branding
      doc
        .fillColor('#ffffff')
        .opacity(0.4)
        .fontSize(8)
        .font(FONTS.body)
        .text('Generated by TatvaOps Vision', 50, doc.page.height - 50, {
          align: 'center',
          width: doc.page.width - 100,
          lineBreak: false,
        })
        .opacity(1);

      // ===========================================
      // Room Pages
      // ===========================================
      
      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i];
        
        doc.addPage();

        // White background
        doc
          .rect(0, 0, doc.page.width, doc.page.height)
          .fill(COLORS.background);

        // ===========================================
        // Page Header with Logo
        // ===========================================
        
        const headerY = 25;
        
        // TatvaOps logo or text branding (top right)
        if (logo) {
          try {
            doc.image(logo, doc.page.width - 130, headerY, {
              fit: [80, 30],
              align: 'right',
            });
          } catch (logoError) {
            // Fallback to text if logo fails
            doc
              .fillColor(COLORS.accent)
              .font(FONTS.heading)
              .fontSize(10)
              .text('TatvaOps', doc.page.width - 100, headerY + 10);
          }
        } else {
          doc
            .fillColor(COLORS.accent)
            .font(FONTS.heading)
            .fontSize(10)
            .text('TatvaOps', doc.page.width - 100, headerY + 10);
        }

        // Room name (title) - clean professional typography
        doc
          .fillColor(COLORS.primary)
          .font(FONTS.heading)
          .fontSize(28)
          .text(room.name.toUpperCase(), 50, 55, {
            width: doc.page.width - 180,
            lineBreak: false,
            characterSpacing: 1,
          });

        // Theme/Style subtitle - subtle accent
        const styleY = 88;
        if (room.style) {
          doc
            .fillColor(COLORS.highlight)
            .font(FONTS.italic)
            .fontSize(14)
            .text(room.style, 50, styleY, {
              width: doc.page.width - 100,
              lineBreak: false,
            });
        }

        // Clean divider line
        const dividerY = room.style ? styleY + 22 : 88;
        doc
          .strokeColor(COLORS.divider)
          .lineWidth(1)
          .moveTo(50, dividerY)
          .lineTo(doc.page.width - 50, dividerY)
          .stroke();

        // ===========================================
        // Moodboard Image
        // ===========================================
        
        const imageY = dividerY + 15;
        const imageHeight = 320;
        const imageWidth = doc.page.width - 100;

        // Try to load and embed the moodboard image
        if (room.moodboardS3Key) {
          try {
            const imageBuffer = await downloadImageFromS3(room.moodboardS3Key);
            if (imageBuffer) {
              doc.image(imageBuffer, 50, imageY, {
                fit: [imageWidth, imageHeight],
                align: 'center',
                valign: 'center',
              });
              logger.info('Embedded moodboard image in PDF', { roomId: room.id });
            } else {
              drawImagePlaceholder(doc, 50, imageY, imageWidth, imageHeight, room.name);
            }
          } catch (imgError) {
            logger.warn('Failed to load moodboard image', {
              roomId: room.id,
              s3Key: room.moodboardS3Key,
              error: String(imgError),
            });
            drawImagePlaceholder(doc, 50, imageY, imageWidth, imageHeight, room.name);
          }
        } else {
          drawImagePlaceholder(doc, 50, imageY, imageWidth, imageHeight, room.name);
        }

        // ===========================================
        // Design Description (Professional Style)
        // ===========================================
        
        const descStartY = imageY + imageHeight + 18;
        const footerY = doc.page.height - 28;
        
        // Section Title - clean and simple
        doc
          .fillColor(COLORS.primary)
          .font(FONTS.heading)
          .fontSize(13)
          .text('Design Rationale', 50, descStartY, { lineBreak: false });

        // Render description with subtle highlighting
        const descTextY = descStartY + 20;
        renderStyledDescription(doc, room, descTextY);

        // ===========================================
        // Page Footer (minimal styling)
        // ===========================================
        
        doc
          .fillColor(COLORS.textMuted)
          .font(FONTS.body)
          .fontSize(9)
          .text('TatvaOps Vision', 50, footerY, { lineBreak: false });
        
        doc
          .fillColor(COLORS.textMuted)
          .font(FONTS.body)
          .fontSize(9)
          .text(`Page ${i + 2}`, doc.page.width - 70, footerY, { lineBreak: false });
      }

      // ===========================================
      // Final Page - Disclaimer
      // ===========================================
      
      doc.addPage();

      doc
        .rect(0, 0, doc.page.width, doc.page.height)
        .fill(COLORS.background);

      // TatvaOps logo on final page
      if (logo) {
        try {
          doc.image(logo, (doc.page.width - 120) / 2, 60, {
            fit: [120, 50],
            align: 'center',
          });
        } catch (e) {
          // Ignore logo errors
        }
      }

      doc
        .fillColor(COLORS.primary)
        .font(FONTS.heading)
        .fontSize(20)
        .text('About This Document', 50, 130, {
          width: doc.page.width - 100,
          align: 'center',
          lineBreak: false,
        });

      doc
        .fillColor(COLORS.text)
        .font(FONTS.body)
        .fontSize(11)
        .text(
          'This design moodboard has been generated using TatvaOps Vision, an AI-powered interior design platform. ' +
          'The moodboards represent design directions and aesthetic concepts for your space.',
          50, 170,
          { width: doc.page.width - 100, lineGap: 4 }
        );

      doc
        .text(
          'Please note that actual materials, finishes, and products may vary from the visualizations shown. ' +
          'We recommend consulting with interior design professionals for final material selections and implementation.',
          50, 230,
          { width: doc.page.width - 100, lineGap: 4 }
        );

      // Summary
      doc
        .fillColor(COLORS.primary)
        .font(FONTS.heading)
        .fontSize(14)
        .text('Project Summary', 50, 320, {
          lineBreak: false,
        });

      doc
        .fillColor(COLORS.text)
        .font(FONTS.body)
        .fontSize(11)
        .text(`Project: ${projectName}`, 50, 350, { lineBreak: false })
        .text(`Rooms: ${rooms.length}`, 50, 370, { lineBreak: false })
        .text(`Generated: ${new Date().toLocaleString('en-IN')}`, 50, 390, { lineBreak: false });

      // Footer
      doc
        .fillColor(COLORS.textLight)
        .fontSize(9)
        .text(
          '© TatvaOps Vision. All rights reserved.',
          50,
          doc.page.height - 80,
          { align: 'center', width: doc.page.width - 100, lineBreak: false }
        );

      doc
        .text(
          'www.tatvaops.com',
          50,
          doc.page.height - 65,
          { align: 'center', width: doc.page.width - 100, link: 'https://www.tatvaops.com', lineBreak: false }
        );

      // Finalize PDF
      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Draw a placeholder for images that couldn't be loaded.
 */
function drawImagePlaceholder(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  height: number,
  roomName: string
): void {
  doc
    .rect(x, y, width, height)
    .fillAndStroke('#f5f5f5', '#e0e0e0');

  doc
    .fillColor('#999999')
    .font(FONTS.body)
    .fontSize(14)
    .text(`${roomName} Moodboard`, x, y + height / 2 - 10, {
      width,
      align: 'center',
    });
}

/**
 * Download image from S3 and return as buffer.
 */
async function downloadImageFromS3(s3Key: string): Promise<Buffer | null> {
  try {
    // Use the moodboards bucket - the key already includes the full path
    // Key format: moodboards/{projectId}/{roomId}/v{version}_{timestamp}.{extension}
    const bucket = config.s3BucketMoodboards;
    
    logger.info('Downloading moodboard image from S3', {
      bucket,
      s3Key,
    });

    const response = await s3Client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: s3Key,  // Use the key as-is, don't strip prefix
    }));

    if (!response.Body) {
      logger.warn('S3 response has no body', { s3Key });
      return null;
    }

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of response.Body as AsyncIterable<Buffer>) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    logger.info('Downloaded moodboard image', {
      s3Key,
      size: buffer.length,
    });

    return buffer;

  } catch (error) {
    logger.error('Failed to download image from S3', {
      s3Key,
      bucket: config.s3BucketMoodboards,
      error: String(error),
    });
    return null;
  }
}

// ===========================================
// Styled Description Renderer
// ===========================================

/**
 * Render a professional justified description with highlighted keywords.
 * Uses a two-pass approach: justified base text + highlighted overlays.
 */
function renderStyledDescription(
  doc: PDFKit.PDFDocument,
  room: { name: string; type: string; style: string | null; colorPalette: string[] },
  startY: number
): void {
  const styleName = room.style || 'Contemporary';
  const mood = getMoodFromStyle(room.style);
  const materials = getMaterials(room.style);
  const elements = getKeyElements(room.type);
  const lighting = getLighting(room.type);
  const purpose = getRoomPurpose(room.type);
  const textures = getTextures(room.style);
  const accessories = getAccessories(room.type);
  const spatialPrinciples = getSpatialPrinciples(room.type);
  const colors = room.colorPalette.length > 0 
    ? room.colorPalette.slice(0, 3).join(', ') 
    : 'neutral tones';

  const pageWidth = doc.page.width - 100;
  const fontSize = 10.5;
  const lineHeight = 16;
  const leftMargin = 50;

  // Keywords to highlight (will be bold + accent color)
  const highlights = [
    styleName,
    mood.toLowerCase(),
    colors,
    materials.toLowerCase(),
    textures.toLowerCase(),
    elements.toLowerCase(),
    spatialPrinciples.toLowerCase(),
    lighting.toLowerCase(),
    accessories.toLowerCase(),
  ];

  // Build text segments with highlight markers
  const segments = [
    { text: 'This ', highlight: false },
    { text: styleName, highlight: true },
    { text: ' design concept creates a ', highlight: false },
    { text: mood.toLowerCase(), highlight: true },
    { text: ' atmosphere, thoughtfully crafted for ' + purpose + '. The color palette features ', highlight: false },
    { text: colors, highlight: true },
    { text: ', carefully selected to evoke warmth and visual harmony throughout the space. Premium materials including ', highlight: false },
    { text: materials.toLowerCase(), highlight: true },
    { text: ' are complemented by ', highlight: false },
    { text: textures.toLowerCase(), highlight: true },
    { text: ' to create a rich sensory experience. Key furniture pieces such as ', highlight: false },
    { text: elements.toLowerCase(), highlight: true },
    { text: ' are positioned following ', highlight: false },
    { text: spatialPrinciples.toLowerCase(), highlight: true },
    { text: ' for optimal flow and functionality. The lighting scheme combines ', highlight: false },
    { text: lighting.toLowerCase(), highlight: true },
    { text: ' to ensure the space feels inviting at any hour. Finishing touches include ', highlight: false },
    { text: accessories.toLowerCase(), highlight: true },
    { text: ' that add personality while maintaining the cohesive design narrative.', highlight: false },
  ];

  // Flatten to words with highlight info
  interface WordInfo {
    word: string;
    highlight: boolean;
  }
  
  const words: WordInfo[] = [];
  for (const segment of segments) {
    const segmentWords = segment.text.split(/(\s+)/);
    for (const w of segmentWords) {
      if (w.trim()) {
        words.push({ word: w, highlight: segment.highlight });
      } else if (w) {
        // Preserve spaces
        words.push({ word: w, highlight: false });
      }
    }
  }

  // Calculate lines with justified spacing
  let currentLine: WordInfo[] = [];
  let currentLineWidth = 0;
  const lines: WordInfo[][] = [];
  
  doc.font(FONTS.body).fontSize(fontSize);
  const spaceWidth = doc.widthOfString(' ');

  for (const wordInfo of words) {
    if (wordInfo.word.trim() === '') continue;
    
    const wordWidth = wordInfo.highlight 
      ? doc.font(FONTS.heading).fontSize(fontSize).widthOfString(wordInfo.word)
      : doc.font(FONTS.body).fontSize(fontSize).widthOfString(wordInfo.word);
    
    doc.font(FONTS.body).fontSize(fontSize); // Reset
    
    const projectedWidth = currentLineWidth + (currentLine.length > 0 ? spaceWidth : 0) + wordWidth;
    
    if (projectedWidth > pageWidth && currentLine.length > 0) {
      lines.push([...currentLine]);
      currentLine = [wordInfo];
      currentLineWidth = wordWidth;
    } else {
      currentLine.push(wordInfo);
      currentLineWidth = projectedWidth;
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  // Render each line with justified spacing
  let y = startY;
  
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const isLastLine = lineIdx === lines.length - 1;
    
    // Calculate total word width
    let totalWordWidth = 0;
    for (const wordInfo of line) {
      const width = wordInfo.highlight
        ? doc.font(FONTS.heading).fontSize(fontSize).widthOfString(wordInfo.word)
        : doc.font(FONTS.body).fontSize(fontSize).widthOfString(wordInfo.word);
      totalWordWidth += width;
    }
    
    // Calculate space between words
    const gaps = line.length - 1;
    const extraSpace = pageWidth - totalWordWidth;
    const spacePerGap = isLastLine || gaps === 0 ? spaceWidth : extraSpace / gaps;
    
    // Render words
    let x = leftMargin;
    for (let i = 0; i < line.length; i++) {
      const wordInfo = line[i];
      
      if (wordInfo.highlight) {
        doc.fillColor(COLORS.highlight).font(FONTS.heading).fontSize(fontSize);
      } else {
        doc.fillColor(COLORS.text).font(FONTS.body).fontSize(fontSize);
      }
      
      doc.text(wordInfo.word, x, y, { lineBreak: false });
      
      const wordWidth = doc.widthOfString(wordInfo.word);
      x += wordWidth + (i < line.length - 1 ? spacePerGap : 0);
    }
    
    y += lineHeight;
  }
}

// ===========================================
// Description Generation Helpers
// ===========================================

/**
 * Get mood description based on style
 */
function getMoodFromStyle(style: string | null): string {
  const styleLower = (style || '').toLowerCase();
  
  if (styleLower.includes('minimalist')) return 'Clean & Serene';
  if (styleLower.includes('modern')) return 'Sleek & Sophisticated';
  if (styleLower.includes('contemporary')) return 'Fresh & Balanced';
  if (styleLower.includes('traditional')) return 'Warm & Classic';
  if (styleLower.includes('industrial')) return 'Bold & Urban';
  if (styleLower.includes('scandinavian')) return 'Light & Cozy';
  if (styleLower.includes('bohemian') || styleLower.includes('boho')) return 'Eclectic & Relaxed';
  if (styleLower.includes('luxury') || styleLower.includes('luxe')) return 'Opulent & Elegant';
  if (styleLower.includes('rustic')) return 'Natural & Earthy';
  if (styleLower.includes('coastal')) return 'Breezy & Calm';
  if (styleLower.includes('african')) return 'Vibrant & Cultural';
  if (styleLower.includes('japanese') || styleLower.includes('zen')) return 'Peaceful & Minimal';
  
  return 'Harmonious & Inviting';
}

/**
 * Get key elements based on room type
 */
function getKeyElements(roomType: string): string {
  const elements: Record<string, string> = {
    LIVING_ROOM: 'Sofa, Accent chairs, Coffee table',
    LIVING: 'Sofa, Accent chairs, Coffee table',
    BEDROOM: 'Bed, Nightstands, Wardrobe',
    MASTER_BEDROOM: 'King bed, Walk-in closet, Seating',
    KITCHEN: 'Cabinets, Countertops, Appliances',
    BATHROOM: 'Vanity, Fixtures, Storage',
    TOILET: 'Sanitary ware, Accessories',
    DINING: 'Dining table, Chairs, Sideboard',
    STUDY: 'Desk, Bookshelf, Chair',
    BALCONY: 'Planters, Seating, Railing',
    PUJA: 'Altar, Storage, Seating',
    FOYER: 'Console, Mirror, Seating',
    UTILITY: 'Storage, Work surface, Appliances',
  };
  
  return elements[roomType] || 'Furniture, Decor, Storage';
}

/**
 * Get materials based on style
 */
function getMaterials(style: string | null): string {
  const styleLower = (style || '').toLowerCase();
  
  if (styleLower.includes('minimalist')) return 'Wood, Glass, Metal';
  if (styleLower.includes('modern')) return 'Lacquer, Chrome, Glass';
  if (styleLower.includes('industrial')) return 'Metal, Concrete, Leather';
  if (styleLower.includes('scandinavian')) return 'Light wood, Wool, Linen';
  if (styleLower.includes('bohemian')) return 'Rattan, Textiles, Macrame';
  if (styleLower.includes('luxury')) return 'Marble, Velvet, Brass';
  if (styleLower.includes('rustic')) return 'Reclaimed wood, Stone, Iron';
  if (styleLower.includes('coastal')) return 'Whitewash, Jute, Driftwood';
  if (styleLower.includes('african')) return 'Woven textiles, Wood, Clay';
  if (styleLower.includes('traditional')) return 'Hardwood, Fabric, Brass';
  
  return 'Wood, Fabric, Metal accents';
}

/**
 * Get lighting description based on room type
 */
function getLighting(roomType: string): string {
  const lighting: Record<string, string> = {
    LIVING_ROOM: 'Ambient + Task + Accent',
    LIVING: 'Ambient + Task + Accent',
    BEDROOM: 'Soft ambient + Bedside',
    MASTER_BEDROOM: 'Layered + Dimmable',
    KITCHEN: 'Task + Under-cabinet',
    BATHROOM: 'Vanity + Ambient',
    TOILET: 'Soft ambient',
    DINING: 'Chandelier + Dimmable',
    STUDY: 'Task + Natural light',
    BALCONY: 'Outdoor + String lights',
    PUJA: 'Warm ambient + Diyas',
    FOYER: 'Statement + Welcome',
    UTILITY: 'Bright task lighting',
  };
  
  return lighting[roomType] || 'Natural + Artificial';
}

/**
 * Get room purpose description
 */
function getRoomPurpose(roomType: string): string {
  const purposes: Record<string, string> = {
    LIVING_ROOM: 'relaxation and social gatherings',
    LIVING: 'relaxation and social gatherings',
    BEDROOM: 'rest and rejuvenation',
    MASTER_BEDROOM: 'comfort and privacy',
    KITCHEN: 'cooking and daily meals',
    BATHROOM: 'personal care',
    TOILET: 'daily essentials',
    DINING: 'family meals and entertaining',
    STUDY: 'focus and productivity',
    BALCONY: 'outdoor leisure',
    PUJA: 'spiritual practice',
    FOYER: 'welcoming guests',
    UTILITY: 'household tasks',
  };
  
  return purposes[roomType] || 'everyday living';
}

/**
 * Get textures based on style
 */
function getTextures(style: string | null): string {
  const styleLower = (style || '').toLowerCase();
  
  if (styleLower.includes('minimalist')) return 'smooth finishes, matte surfaces';
  if (styleLower.includes('modern')) return 'polished surfaces, sleek finishes';
  if (styleLower.includes('industrial')) return 'raw textures, exposed elements';
  if (styleLower.includes('scandinavian')) return 'soft knits, natural grains';
  if (styleLower.includes('bohemian')) return 'layered fabrics, woven patterns';
  if (styleLower.includes('luxury')) return 'rich velvets, glossy accents';
  if (styleLower.includes('rustic')) return 'rough-hewn wood, natural stone';
  if (styleLower.includes('coastal')) return 'weathered finishes, natural fibers';
  if (styleLower.includes('african')) return 'handwoven textiles, organic patterns';
  if (styleLower.includes('traditional')) return 'classic weaves, refined fabrics';
  
  return 'balanced textures, tactile surfaces';
}

/**
 * Get accessories and decor based on room type
 */
function getAccessories(roomType: string): string {
  const accessories: Record<string, string> = {
    LIVING_ROOM: 'curated art pieces, decorative cushions, statement vases',
    LIVING: 'curated art pieces, decorative cushions, statement vases',
    BEDROOM: 'soft throws, bedside accessories, wall art',
    MASTER_BEDROOM: 'luxury linens, decorative pillows, personal touches',
    KITCHEN: 'stylish storage, herb planters, decorative jars',
    BATHROOM: 'plush towels, aromatic candles, elegant dispensers',
    TOILET: 'minimal accessories, fresh greenery',
    DINING: 'centerpiece arrangements, elegant tableware, candle holders',
    STUDY: 'desk organizers, inspirational art, indoor plants',
    BALCONY: 'outdoor cushions, lanterns, potted plants',
    PUJA: 'brass accessories, flowers, traditional elements',
    FOYER: 'welcome decor, key holders, fresh flowers',
    UTILITY: 'organized baskets, practical hooks, labeled storage',
  };
  
  return accessories[roomType] || 'thoughtful accessories, personal touches';
}

/**
 * Get spatial design principles based on room type
 */
function getSpatialPrinciples(roomType: string): string {
  const principles: Record<string, string> = {
    LIVING_ROOM: 'conversation-friendly arrangements, clear traffic flow',
    LIVING: 'conversation-friendly arrangements, clear traffic flow',
    BEDROOM: 'restful symmetry, uncluttered pathways',
    MASTER_BEDROOM: 'luxurious proportions, private zones',
    KITCHEN: 'work triangle efficiency, accessible storage',
    BATHROOM: 'wet-dry zone separation, easy access',
    TOILET: 'compact efficiency, ventilation priority',
    DINING: 'comfortable spacing, centered focal point',
    STUDY: 'ergonomic positioning, distraction-free zones',
    BALCONY: 'indoor-outdoor connection, weather considerations',
    PUJA: 'east-facing orientation, peaceful seclusion',
    FOYER: 'welcoming entry, smooth transitions',
    UTILITY: 'workflow optimization, maximum storage',
  };
  
  return principles[roomType] || 'balanced proportions, thoughtful zoning';
}

/**
 * Generate a detailed, descriptive paragraph for a room design.
 * This creates a rich narrative explaining the design choices.
 */
function generateDetailedDescription(
  roomName: string,
  roomType: string,
  style: string | null,
  colorPalette: string[]
): string {
  const styleName = style || 'Contemporary';
  const mood = getMoodFromStyle(style);
  const materials = getMaterials(style);
  const elements = getKeyElements(roomType);
  const lighting = getLighting(roomType);
  const purpose = getRoomPurpose(roomType);
  
  const colors = colorPalette.length > 0 
    ? colorPalette.slice(0, 3).join(', ') 
    : 'neutral tones with subtle accents';

  // Build a rich, flowing description
  const description = `This ${styleName} design concept transforms the ${roomName} into a ${mood.toLowerCase()} sanctuary, ` +
    `perfectly curated for ${purpose}. ` +
    `The color palette draws from ${colors}, creating a cohesive visual narrative that evokes warmth and sophistication throughout the space. ` +
    `Carefully selected materials including ${materials.toLowerCase()} bring texture and depth, while maintaining the ${styleName.toLowerCase()} aesthetic. ` +
    `Key furniture pieces such as ${elements.toLowerCase()} are thoughtfully positioned to optimize both flow and functionality. ` +
    `The lighting scheme combines ${lighting.toLowerCase()}, ensuring the space feels inviting during the day and cozy in the evening. ` +
    `Every element has been chosen to create a harmonious environment that reflects modern living while honoring timeless design principles.`;

  return description;
}

/**
 * Generate a simple design description (legacy support).
 */
function generateRoomDescription(
  roomName: string,
  roomType: string,
  style: string | null,
  colorPalette: string[]
): string {
  return generateDetailedDescription(roomName, roomType, style, colorPalette);
}

// ===========================================
// Database Helpers
// ===========================================

async function updateExportStatus(
  exportId: string,
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
  data?: { error?: string }
): Promise<void> {
  try {
    await prisma.exportAsset.update({
      where: { id: exportId },
      data: {
        status,
        ...(data?.error && { error: data.error }),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Failed to update export status', {
      exportId,
      status,
      error: String(error),
    });
  }
}

async function updateJobStatus(
  jobId: string,
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
  data?: { result?: object; error?: object }
): Promise<void> {
  try {
    await prisma.aIJob.update({
      where: { id: jobId },
      data: {
        status,
        ...(status === 'COMPLETED' && {
          completedAt: new Date(),
          result: data?.result as any,
        }),
        ...(status === 'FAILED' && {
          error: JSON.stringify(data?.error),
        }),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Failed to update job status', {
      jobId,
      status,
      error: String(error),
    });
  }
}

// ===========================================
// Cleanup
// ===========================================

export async function cleanupPdfExportHandler(): Promise<void> {
  await prisma.$disconnect();
}

