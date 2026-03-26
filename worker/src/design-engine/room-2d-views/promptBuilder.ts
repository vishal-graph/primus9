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

function describeReferenceOrder(hasIsometric: boolean): string {
  const lines: string[] = [
    '=== REFERENCE IMAGES (ORDER MATCHES INLINE IMAGES BEFORE THIS TEXT) ===',
    'The model receives reference images in this exact order:',
    '• IMAGE 1 — ROOM MOODBOARD (same pipeline as moodboard generation): This is the authoritative design board for THIS room.',
    '  You MUST preserve its visual language: every major furniture piece, rug, lighting fixture, wall treatment, art, and decor that appears in the moodboard should appear in your render in the same style and similar arrangement.',
    '  Do NOT replace the sofa/bed/cabinets with different designs. Do NOT change the color story or material palette. Treat the moodboard as a product spec the client already approved.',
  ];
  if (hasIsometric) {
    lines.push(
      '• IMAGE 2 — FULL-FLOOR ISOMETRIC / INTERIOR ELEVATION: Use this to understand where this room sits on the floor, its footprint, neighboring spaces, circulation flow, and overall massing.',
      '  Infer door/window placement on the envelope, room proportions, and how movement flows into connected areas. It does NOT override moodboard finishes—only spatial layout and adjacency.'
    );
  }
  lines.push(
    '',
    '=== MOODBOARD = GENERATION PARITY ===',
    'Your output should look like ONE photoreal photograph of the SAME interior concept as the moodboard—same elements—not a reinterpretation or a different scheme.',
    ''
  );
  return lines.join('\n');
}

/** Build prompt for one unified interior photograph (wide but natural FOV). Moodboard primary; isometric for layout. */
export function buildBirdViewPrompt(params: {
  roomGeometry: RoomElevationGeometry;
  styleInstruction: string;
  connectedRooms: string[];
  hasIsometricReference: boolean;
  enrichedSpatialNotes?: string;
  designIntent?: DesignIntent;
}): string {
  const {
    roomGeometry,
    styleInstruction,
    connectedRooms,
    hasIsometricReference,
    enrichedSpatialNotes,
    designIntent,
  } = params;
  const connectedRoomsText =
    connectedRooms.length > 0 ? `Connected rooms: ${connectedRooms.join(', ')}` : 'No connected rooms detected.';

  const refOrder = describeReferenceOrder(hasIsometricReference);

  return [
    'You are an expert interior designer AI specialized in Indian residential interiors.',
    refOrder,
    '=== TASK: ONE ROOM, ONE PHOTO — NO SPLITS (STRICT) ===',
    `Generate exactly ONE photorealistic interior photograph of ${roomGeometry.roomName} (${roomGeometry.roomType.replace('_', ' ')}). This will be used for video—one coherent space, one moment in time.`,
    '',
    '=== FORBIDDEN COMPOSITIONS (CRITICAL) ===',
    '❌ NO split screen, diptych, triptych, collage, or side-by-side panels.',
    '❌ NO twin images, duplicate scenes, before/after, or two different angles stitched into one frame.',
    '❌ NO fisheye, barrel distortion, or ultra-wide warping that makes the room look like two separate bubbles.',
    '❌ NO architectural "dollhouse" cutaway that removes entire walls (gray void edges)—show the room as a normal enclosed interior.',
    '✅ Output = exactly ONE rectangular image = ONE continuous real-world camera exposure of ONE room.',
    '',
    '=== CAMERA: SHOW THE MAJOR PART OF THE ROOM ===',
    'Place the camera INSIDE the room, slightly elevated (e.g. ~2–2.4m height), usually from a corner or near the entry, looking ACROSS the main volume.',
    'The frame must show the MAJOR usable area of the room at once: primary fixtures/furniture zone (e.g. vanity + WC zone in a bath, bed + wardrobe in a bedroom, seating in a living room)—not a tight crop of a single corner only.',
    'Use a natural real-estate / interior wide angle only (think ~24–35mm full-frame equivalent): enough to see most walls and floor in one shot, but still a single believable photograph—not 180°+ panorama.',
    'Include floor, ceiling, and at least two full walls in view so the space reads as one complete room.',
    'STRICTLY FORBIDDEN: top-down / plan / orthographic views; looking straight down at the floor only.',
    '',
    '=== INPUT PRIORITY (MANDATORY) ===',
    '1) MOODBOARD IMAGE: Style, colors, materials, furniture, decor—must match. No substitute products.',
    '2) ISOMETRIC (if provided): Spatial context—room shape on plan, neighbors, flow, openings.',
    '',
    '=== GEOMETRY (FROM FLOOR PLAN - USE FOR LAYOUT ONLY) ===',
    `Room Dimensions: ${roomGeometry.dimensions.length.toFixed(2)} x ${roomGeometry.dimensions.width.toFixed(2)} ${roomGeometry.dimensions.unit}, ceiling ${roomGeometry.dimensions.ceilingHeight.toFixed(2)} ${roomGeometry.dimensions.unit}`,
    connectedRoomsText,
    enrichedSpatialNotes
      ? `=== SPATIAL CONTEXT (FROM FLOOR PLAN ENRICHMENT) ===\n${enrichedSpatialNotes}\n`
      : '',
    'Respect room shape and openings from the floor plan, isometric reference, and enrichment notes. Do not invent layouts that contradict them.',
    '',
    '=== STYLE (FROM MOODBOARD — TEXT SUMMARY, IMAGE IS STILL SOURCE OF TRUTH) ===',
    styleInstruction,
    designIntent ? getRoomContext(designIntent) : INDIAN_CONTEXT.join('\n'),
    'The moodboard IMAGE overrides any minor text conflict—always prefer what you see in IMAGE 1.',
    '',
    '=== OUTPUT REQUIREMENTS ===',
    'Exactly one photorealistic image, one unified composition, minimum 4K.',
    'No people, no text overlays, no watermarks, no room labels or dimensions drawn on the image.',
    'One design, one camera position, one exposure—do NOT invent major furniture or finishes absent from the moodboard.',
  ].join('\n');
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
