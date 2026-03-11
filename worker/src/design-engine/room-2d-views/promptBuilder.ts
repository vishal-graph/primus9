/**
 * TatvaOps Vision - Room 2D Views Prompt Builder
 *
 * Bird's-eye view: moodboard primary, elevation secondary.
 */

import { buildGeometryConstraintString } from '../elevation/geometryValidator';
import { buildStyleInstructionString } from '../elevation/styleExtractor';
import { Room2DViewType } from './types';
import { RoomElevationGeometry, WallGeometry } from '../elevation/types';
import { DesignIntent } from '../types';
import { getRoomContext } from '../common/roomContext';

/** Build prompt for single corner bird's-eye room view (~280–300°). Moodboard = primary, elevation = secondary. */
export function buildBirdViewPrompt(params: {
  roomGeometry: RoomElevationGeometry;
  styleInstruction: string;
  connectedRooms: string[];
  isometricUrl?: string;
  designIntent?: DesignIntent;
}): string {
  const { roomGeometry, styleInstruction, connectedRooms, isometricUrl, designIntent } = params;
  const connectedRoomsText =
    connectedRooms.length > 0 ? `Connected rooms: ${connectedRooms.join(', ')}` : 'No connected rooms detected.';

  return [
    'You are an expert interior designer AI specialized in Indian residential interiors.',
    '=== TASK: SINGLE CORNER BIRD\'S-EYE ROOM VIEW (STRICT: ONE DESIGN, ONE IMAGE) ===',
    `Generate exactly ONE photorealistic interior view for ${roomGeometry.roomName} (${roomGeometry.roomType.replace('_', ' ')}). One design only—do not create alternative views or different designs. This image will be used to generate a 10-second interior video; consistency is critical.`,
    '',
    '=== CAMERA: CCTV-STYLE CORNER (NOT TOP-DOWN) ===',
    'Camera position: like a CCTV or security camera mounted high in ONE corner of the room (where two walls meet). The camera is in that corner, elevated, looking across the room at an ANGLE—so you see both walls meeting at the corner, the floor, and the ceiling. The angle must be an angled bird\'s-eye (oblique), covering roughly 280–300° from that single corner.',
    'STRICTLY FORBIDDEN: Do NOT use a top-down view. Do NOT use an orthographic or plan view. Do NOT look straight down at the floor. The result must NOT look like a floor plan or a flat overhead view. It must look like a real camera in one corner of the room, angled so two walls and the floor are clearly visible—never straight down.',
    '',
    '=== INPUT PRIORITY (MANDATORY) ===',
    '1) PRIMARY: Use the uploaded moodboard as the primary design reference. Style, colors, materials, furniture style, and design direction MUST follow the moodboard. Do not deviate from the moodboard.',
    '2) SECONDARY: Use the elevation/isometric only for room layout, proportions, geometry, and spatial relationships. Elevation informs shape and placement—it does NOT override moodboard style.',
    '',
    '=== GEOMETRY (FROM FLOOR PLAN - USE FOR LAYOUT ONLY) ===',
    `Room Dimensions: ${roomGeometry.dimensions.length.toFixed(2)} x ${roomGeometry.dimensions.width.toFixed(2)} ${roomGeometry.dimensions.unit}, ceiling ${roomGeometry.dimensions.ceilingHeight.toFixed(2)} ${roomGeometry.dimensions.unit}`,
    connectedRoomsText,
    'Respect room shape and openings from the floor plan. Do not invent new walls or openings.',
    '',
    '=== STYLE (FROM MOODBOARD - PRIMARY) ===',
    styleInstruction,
    designIntent ? getRoomContext(designIntent) : INDIAN_CONTEXT.join('\n'),
    'Extract and apply from moodboard: color palette, materials, textures, furniture style, Indian design elements, lighting mood, wall treatments, flooring type, decorative elements.',
    '',
    '=== DESIGN SOURCE PRIORITY ===',
    '1) Moodboard (highest—style, materials, colors, furniture)',
    '2) Elevation (layout, proportions, geometry only)',
    isometricUrl ? `Isometric reference available for layout: ${isometricUrl}` : '',
    '',
    '=== OUTPUT REQUIREMENTS ===',
    'Exactly one photorealistic image. Corner CCTV-style bird\'s-eye (angled from one corner), minimum 4K. Never top-down or orthographic.',
    'No people, no text overlays, no watermarks.',
    'Single image only. One design. Do NOT invent new styles or add elements not present in the moodboard.',
  ].filter(Boolean).join('\n');
}

const INDIAN_CONTEXT = [
  '=== CRITICAL INDIAN ARCHITECTURAL CONTEXT ===',
  '1. MATERIALS: Use Indian finishes (vitrified tiles, Kota stone, marble flooring, terrazzo, teak/sheesham wood). STRICTLY NO wall-to-wall carpets or rustic Western farmhouse wood.',
  '2. TROPICAL DESIGN: Show adaptations for Indian climates (cross-ventilation spacing, ceiling fans, sheer curtains + drapes, window security grills). STRICTLY NO fireplaces or heavy velvet drapes.',
  '3. DEMOGRAPHICS: Halls/Living must have prominent communal seating/diwans, TV units, and Pooja spaces. Kitchens must have heavy-duty wet areas, deep sinks, and closed lofts. Bathrooms must have wet/dry slopes, health faucets, and anti-skid tiles. Bedrooms must have platform beds and ceiling-height wardrobes.',
  '4. AESTHETICS: Incorporate Indian crafts, jali partitions, brass accents, and vibrant textiles (block prints). Avoid Euro-American sterile modernism.',
];

export function buildRoom2DViewPrompt(params: {
  viewType: Room2DViewType;
  wall: WallGeometry;
  roomGeometry: RoomElevationGeometry;
  styleInstruction: string;
  connectedRooms: string[];
  isometricUrl?: string;
  wallType: 'solid' | 'partial' | 'open';
  designIntent?: DesignIntent;
}): string {
  const {
    viewType,
    wall,
    roomGeometry,
    styleInstruction,
    connectedRooms,
    isometricUrl,
    wallType,
    designIntent,
  } = params;

  const geometryString = buildGeometryConstraintString(wall, roomGeometry.roomName);
  const connectedRoomsText = connectedRooms.length > 0
    ? `Connected rooms: ${connectedRooms.join(', ')}`
    : 'No connected rooms detected.';

  const openingGuidance = wallType === 'open'
    ? 'This wall is OPEN to an adjacent space. Show a wide opening or archway and partial visibility into the next room.'
    : wallType === 'partial'
      ? 'This wall has a PARTIAL opening (door or arch). Show the opening with correct proportions.'
      : 'This wall is SOLID. Do not add openings beyond those specified.';

  return [
    'You are an expert interior designer AI specialized in Indian residential interiors.',
    '=== TASK: PHOTOREALISTIC ROOM WALL VIEW ===',
    `Generate a photorealistic, eye-level interior view for the ${viewType.replace('_', ' ').toLowerCase()} of ${roomGeometry.roomName} (${roomGeometry.roomType.replace('_', ' ')}).`,
    'Camera: eye-level, wide-angle with NO distortion. Realistic perspective, no fisheye.',
    'Use soft natural shadows and realistic materials.',
    'Use the uploaded moodboard as the primary design reference. Do not deviate from it.',
    '',
    '=== GEOMETRY (FROM FLOOR PLAN - NON-NEGOTIABLE) ===',
    geometryString,
    `Room Dimensions: ${roomGeometry.dimensions.length.toFixed(2)} x ${roomGeometry.dimensions.width.toFixed(2)} ${roomGeometry.dimensions.unit}, ceiling ${roomGeometry.dimensions.ceilingHeight.toFixed(2)} ${roomGeometry.dimensions.unit}`,
    openingGuidance,
    '',
    '=== CONNECTIVITY ===',
    connectedRoomsText,
    'Respect openings and adjacency from the floor plan. Do not close open walls.',
    'Maintain spatial continuity across all 5 views of the SAME room. Do not relocate major elements between views.',
    'Cabinetry/wardrobe layout must be consistent with the room geometry; do not introduce new storage walls that are not implied by the geometry.',
    'If a wall is solid and has no built-ins, do not add full-height wardrobes.',
    '',
    '=== STYLE (FROM MOODBOARD) ===',
    styleInstruction,
    designIntent ? getRoomContext(designIntent) : INDIAN_CONTEXT.join('\n'),
    'Extract and apply: color palette, materials, textures, furniture style, Indian design elements, lighting mood, wall treatments, flooring type, decorative elements, ceiling inspiration.',
    '',
    '=== DESIGN SOURCE PRIORITY ===',
    '1) Floor plan geometry (highest)',
    '2) Elevation scale and alignment',
    '3) Moodboard style and materials',
    isometricUrl ? `Isometric reference available: ${isometricUrl}` : '',
    '',
    '=== OUTPUT REQUIREMENTS ===',
    'Photorealistic interior render, minimum 4K resolution.',
    'No people, no text overlays, no watermarks.',
    'Ensure the view matches the SAME room as other views (consistent cabinetry, appliances, and openings).',
    'Do NOT invent new styles or add ultra-modern or western elements unless present in the moodboard.',
  ].filter(Boolean).join('\n');
}

export function buildCeilingViewPrompt(params: {
  roomGeometry: RoomElevationGeometry;
  styleInstruction: string;
  designIntent?: DesignIntent;
}): string {
  const { roomGeometry, styleInstruction, designIntent } = params;

  return [
    'You are an expert interior designer AI specialized in Indian residential interiors.',
    '=== TASK: CEILING VIEW (TOP-DOWN) ===',
    `Generate a top-down architectural ceiling view for ${roomGeometry.roomName} (${roomGeometry.roomType.replace('_', ' ')}).`,
    'Camera: top-down orthographic plan-style view of ceiling only.',
    'Include false ceiling design, cove lighting, beams/panels/jaali where appropriate.',
    'Lighting tone: warm Indian residential (3000K–3500K).',
    'Ceiling design must visually match the wall aesthetics and moodboard.',
    'Use the uploaded moodboard as the primary design reference. Do not deviate from it.',
    '',
    '=== GEOMETRY (FROM FLOOR PLAN - NON-NEGOTIABLE) ===',
    `Room Dimensions: ${roomGeometry.dimensions.length.toFixed(2)} x ${roomGeometry.dimensions.width.toFixed(2)} ${roomGeometry.dimensions.unit}`,
    'Ceiling layout must match wall alignment and room proportions.',
    '',
    '=== STYLE (FROM MOODBOARD) ===',
    styleInstruction,
    designIntent ? getRoomContext(designIntent) : INDIAN_CONTEXT.join('\n'),
    'Extract and apply: color palette, materials, textures, furniture style, Indian design elements, lighting mood, wall treatments, flooring type, decorative elements, ceiling inspiration.',
    '',
    '=== OUTPUT REQUIREMENTS ===',
    'Top-down ceiling plan render, minimum 4K resolution.',
    'No people, no text overlays, no watermarks.',
    'Ceiling design must align with wall design language.',
    'Do NOT invent new styles or add ultra-modern or western elements unless present in the moodboard.',
  ].join('\n');
}

export function buildStyleInstruction(style: {
  wallFinish: string;
  wallTreatment: string;
  colorPalette: string[];
  materials: string[];
  lightingStyle: string;
  decorStyle: string;
  flooringHint: string;
  ceilingTreatment: string;
  aesthetic: string;
}): string {
  return buildStyleInstructionString(
    { ...style, styleHash: 'room-2d-views' },
    'NORTH',
    'Room'
  );
}
