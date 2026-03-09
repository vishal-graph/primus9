/**
 * TatvaOps Vision - Layout Renderer
 * 
 * Generates layout representations from room geometries.
 * SVG is rasterized to PNG for Gemini compatibility.
 * 
 * ============================================================
 * ❗ THIS IS THE SOURCE OF TRUTH FOR ROOM POSITIONS ❗
 * ❗ AI MUST FOLLOW THIS LAYOUT EXACTLY ❗
 * ============================================================
 */

import { FloorGeometry, RoomGeometry } from './types';
import { logger } from '../../lib/logger';
import sharp from 'sharp';

// ===========================================
// Configuration
// ===========================================

const LAYOUT_CONFIG = {
  // Output image size
  outputWidth: 1024,
  outputHeight: 1024,
  
  // Visual styling
  backgroundColor: '#FFFFFF',
  wallColor: '#1A1A1A',
  wallThickness: 4,
  roomLabelColor: '#333333',
  
  // Room type colors
  roomColors: {
    LIVING_ROOM: '#E8F5E9',
    LIVING: '#E8F5E9',
    BEDROOM: '#E3F2FD',
    KITCHEN: '#FFF3E0',
    BATHROOM: '#FCE4EC',
    TOILET: '#FCE4EC',
    DINING: '#FFF8E1',
    UTILITY: '#ECEFF1',
    BALCONY: '#E0F7FA',
    FOYER: '#F3E5F5',
    PASSAGE: '#FAFAFA',
    MASTER: '#E3F2FD',
    DEFAULT: '#F5F5F5',
  } as Record<string, string>,
  
  // Padding around the floor plan
  padding: 50,
};

// ===========================================
// Layout Renderer (SVG → PNG)
// ===========================================

/**
 * Render a precise 2D layout as SVG and rasterize to PNG (base64)
 * 
 * @param geometry - Floor geometry with room positions
 * @returns Base64 encoded PNG image
 */
export async function renderFloorLayout(geometry: FloorGeometry): Promise<{
  imageData: string;
  mimeType: string;
  width: number;
  height: number;
}> {
  logger.info('Rendering precise floor layout (PNG)', {
    roomCount: geometry.rooms.length,
    floorDimensions: geometry.dimensions,
  });

  const { outputWidth, outputHeight, padding } = LAYOUT_CONFIG;
  
  // Calculate scale to fit floor plan
  const scaleX = (outputWidth - 2 * padding) / geometry.dimensions.width;
  const scaleY = (outputHeight - 2 * padding) / geometry.dimensions.height;
  const scale = Math.min(scaleX, scaleY);
  
  // Center the floor plan
  const offsetX = padding + (outputWidth - 2 * padding - geometry.dimensions.width * scale) / 2;
  const offsetY = padding + (outputHeight - 2 * padding - geometry.dimensions.height * scale) / 2;

  // Build SVG content
  const svgParts: string[] = [];
  
  // SVG header
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${outputWidth} ${outputHeight}">`);
  
  // Background
  svgParts.push(`<rect width="100%" height="100%" fill="${LAYOUT_CONFIG.backgroundColor}"/>`);
  
  // Draw rooms (fill)
  for (const room of geometry.rooms) {
    const { x, y, width, height } = room.boundingBox;
    const roomType = room.roomType.toUpperCase().replace(/\s+/g, '_');
    const fillColor = getRoomColor(roomType);
    
    const rx = offsetX + x * scale;
    const ry = offsetY + y * scale;
    const rw = width * scale;
    const rh = height * scale;
    
    svgParts.push(`<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${fillColor}" stroke="${LAYOUT_CONFIG.wallColor}" stroke-width="${LAYOUT_CONFIG.wallThickness}"/>`);
  }
  
  // Draw room labels
  for (const room of geometry.rooms) {
    const { x, y, width, height } = room.boundingBox;
    const centerX = offsetX + (x + width / 2) * scale;
    const centerY = offsetY + (y + height / 2) * scale;
    
    const roomWidth = width * scale;
    const fontSize = Math.min(Math.max(roomWidth / 8, 10), 14);
    
    let label = room.roomName;
    if (label.length > 15) {
      label = label.substring(0, 12) + '...';
    }
    
    svgParts.push(`<text x="${centerX}" y="${centerY}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${LAYOUT_CONFIG.roomLabelColor}" text-anchor="middle" dominant-baseline="middle">${escapeXml(label)}</text>`);
  }
  
  // SVG footer
  svgParts.push('</svg>');
  
  const svgContent = svgParts.join('\n');
  
  const imageData = await convertSvgToPngBase64(svgContent, outputWidth, outputHeight);

  logger.info('Floor layout rendered successfully (PNG)', {
    imageSize: imageData.length,
    scale,
  });

  return {
    imageData,
    mimeType: 'image/png',
    width: outputWidth,
    height: outputHeight,
  };
}

// ===========================================
// Isometric Layout Renderer (SVG → PNG)
// ===========================================

/**
 * Render an isometric-style layout as SVG and rasterize to PNG
 */
export async function renderIsometricLayout(geometry: FloorGeometry): Promise<{
  imageData: string;
  mimeType: string;
  width: number;
  height: number;
}> {
  logger.info('Rendering isometric-style layout (PNG)', {
    roomCount: geometry.rooms.length,
  });

  const outputWidth = 1200;
  const outputHeight = 1000;
  const padding = 100;
  
  // Isometric projection angles
  const isoAngle = Math.PI / 6; // 30 degrees
  const wallHeight = 60;
  
  // Calculate scale
  const scaleX = (outputWidth - 2 * padding) / (geometry.dimensions.width * 1.5);
  const scaleY = (outputHeight - 2 * padding) / (geometry.dimensions.height * 1.5);
  const scale = Math.min(scaleX, scaleY) * 0.7;

  // Sort rooms by position for proper layering (back to front)
  const sortedRooms = [...geometry.rooms].sort((a, b) => {
    const posA = a.boundingBox.x + a.boundingBox.y;
    const posB = b.boundingBox.x + b.boundingBox.y;
    return posA - posB;
  });

  // Transform to isometric coordinates
  const toIso = (x: number, y: number) => {
    const isoX = (x - y) * Math.cos(isoAngle);
    const isoY = (x + y) * Math.sin(isoAngle);
    return {
      x: outputWidth / 2 + isoX * scale,
      y: 250 + isoY * scale,
    };
  };

  // Build SVG content
  const svgParts: string[] = [];
  
  // SVG header
  svgParts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="0 0 ${outputWidth} ${outputHeight}">`);
  
  // Background
  svgParts.push(`<rect width="100%" height="100%" fill="#FAFAFA"/>`);
  
  // Draw each room in isometric projection
  for (const room of sortedRooms) {
    const { x, y, width, height } = room.boundingBox;
    
    // Get room color
    const roomType = room.roomType.toUpperCase().replace(/\s+/g, '_');
    const baseColor = getRoomColor(roomType);
    
    // Calculate isometric corners
    const corners = [
      toIso(x, y),                    // top-left
      toIso(x + width, y),            // top-right
      toIso(x + width, y + height),   // bottom-right
      toIso(x, y + height),           // bottom-left
    ];

    // Draw floor
    svgParts.push(`<polygon points="${corners.map(c => `${c.x},${c.y}`).join(' ')}" fill="${baseColor}" stroke="#333" stroke-width="2"/>`);

    // Draw left wall
    const leftWallPoints = [
      `${corners[0].x},${corners[0].y}`,
      `${corners[0].x},${corners[0].y - wallHeight}`,
      `${corners[3].x},${corners[3].y - wallHeight}`,
      `${corners[3].x},${corners[3].y}`,
    ];
    svgParts.push(`<polygon points="${leftWallPoints.join(' ')}" fill="${darkenColor(baseColor, 0.2)}" stroke="#333" stroke-width="1"/>`);

    // Draw bottom wall
    const bottomWallPoints = [
      `${corners[3].x},${corners[3].y}`,
      `${corners[3].x},${corners[3].y - wallHeight}`,
      `${corners[2].x},${corners[2].y - wallHeight}`,
      `${corners[2].x},${corners[2].y}`,
    ];
    svgParts.push(`<polygon points="${bottomWallPoints.join(' ')}" fill="${darkenColor(baseColor, 0.3)}" stroke="#333" stroke-width="1"/>`);

    // Room label
    const centerX = (corners[0].x + corners[2].x) / 2;
    const centerY = (corners[0].y + corners[2].y) / 2;
    
    let label = room.roomName;
    if (label.length > 12) {
      label = label.substring(0, 10) + '...';
    }
    
    svgParts.push(`<text x="${centerX}" y="${centerY}" font-family="Arial, sans-serif" font-size="11" font-weight="bold" fill="#333" text-anchor="middle" dominant-baseline="middle">${escapeXml(label)}</text>`);
  }
  
  // SVG footer
  svgParts.push('</svg>');
  
  const svgContent = svgParts.join('\n');
  
  const imageData = await convertSvgToPngBase64(svgContent, outputWidth, outputHeight);

  logger.info('Isometric layout rendered (PNG)', { imageSize: imageData.length });

  return {
    imageData,
    mimeType: 'image/png',
    width: outputWidth,
    height: outputHeight,
  };
}

async function convertSvgToPngBase64(
  svgContent: string,
  width: number,
  height: number
): Promise<string> {
  const svgBuffer = Buffer.from(svgContent);
  const pngBuffer = await sharp(svgBuffer)
    .resize(width, height, { fit: 'contain', background: '#FFFFFF' })
    .png()
    .toBuffer();
  return pngBuffer.toString('base64');
}

// ===========================================
// Helper Functions
// ===========================================

/**
 * Get room color based on type
 */
function getRoomColor(roomType: string): string {
  const type = roomType.toUpperCase().replace(/\s+/g, '_');
  
  // Check for partial matches
  for (const [key, color] of Object.entries(LAYOUT_CONFIG.roomColors)) {
    if (type.includes(key) || key.includes(type)) {
      return color;
    }
  }
  
  return LAYOUT_CONFIG.roomColors.DEFAULT;
}

/**
 * Darken a hex color
 */
function darkenColor(hex: string, factor: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.max(0, Math.floor((num >> 16) * (1 - factor)));
  const g = Math.max(0, Math.floor(((num >> 8) & 0x00FF) * (1 - factor)));
  const b = Math.max(0, Math.floor((num & 0x0000FF) * (1 - factor)));
  return `#${((r << 16) + (g << 8) + b).toString(16).padStart(6, '0')}`;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
