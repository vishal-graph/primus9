/**
 * Room metrics for component extraction: footprint, free-flow budget, and
 * furniture sizing caps derived from plan dimensions + room type.
 */

import type { ComponentCategory, ComponentExtractionRow } from './types';

const PIXEL_TO_METER = 0.05;
/** 1 m² → sq ft (Indian drawings often show sq ft; we lead with this). */
const SQ_M_TO_SQ_FT = 10.76391041671;
const CM_PER_FT = 30.48;
const CM_PER_IN = 2.54;

export function sqMtoSqFt(m2: number): number {
  return m2 * SQ_M_TO_SQ_FT;
}

function fmtSqFtRange(loM2: number, hiM2: number, decimals = 0): string {
  return `~${sqMtoSqFt(loM2).toFixed(decimals)}–${sqMtoSqFt(hiM2).toFixed(decimals)} sq ft`;
}

function ftRangeFromCm(loCm: number, hiCm: number, d = 1): string {
  return `~${(loCm / CM_PER_FT).toFixed(d)}–${(hiCm / CM_PER_FT).toFixed(d)} ft`;
}

function inchRangeFromCm(loCm: number, hiCm: number, d = 0): string {
  return `~${(loCm / CM_PER_IN).toFixed(d)}–${(hiCm / CM_PER_IN).toFixed(d)} in`;
}

function linFtRange(loM: number, hiM: number, d = 1): string {
  return `~${(loM * 3.280839895).toFixed(d)}–${(hiM * 3.280839895).toFixed(d)} lin ft`;
}

/** Wrap plan-derived measure snippets for UI bold (see ComponentStage `renderApproximateSizeText`). */
function boldMeasure(s: string): string {
  return `**${s}**`;
}

/**
 * Bold numeric measures in free text (e.g. model output) without double-wrapping existing **...**.
 */
export function emphasizeApproximateSizeMeasures(text: string): string {
  if (!text?.trim()) return text;
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((chunk) => {
      if (chunk.startsWith('**') && chunk.endsWith('**')) return chunk;
      let s = chunk;
      s = s.replace(
        /((?:~|≈)\s*[\d.]+\s*[–-]\s*[\d.]+\s*(?:sq ft|lin ft|ft|in|m²|mm|cm)\b)/gi,
        '**$1**'
      );
      s = s.replace(/(\b[\d.]+\s*[–-]\s*[\d.]+\s*sq ft\b)/gi, '**$1**');
      s = s.replace(/((?:~|≈)\s*[\d.]+\s*(?:ft|in|m²)\b)/gi, '**$1**');
      return s;
    })
    .join('');
}

/** Fraction of gross floor area to treat as circulation / clear movement (heuristic). */
function clearanceFractionForRoomType(roomType: string): number {
  const t = (roomType || '').toUpperCase();
  if (t.includes('PASSAGE') || t.includes('STAIRCASE') || t.includes('FOYER')) return 0.62;
  if (t.includes('BATHROOM') || t.includes('TOILET')) return 0.52;
  if (t.includes('KITCHEN') || t.includes('UTILITY')) return 0.44;
  if (t.includes('LIVING') || t.includes('LOBBY')) return 0.54;
  if (t.includes('DINING')) return 0.48;
  if (t.includes('BEDROOM') || t.includes('STUDY') || t.includes('DRESS')) return 0.48;
  if (t.includes('BALCONY') || t.includes('TERRACE')) return 0.58;
  return 0.5;
}

export interface RoomExtractionMetrics {
  lengthM: number;
  widthM: number;
  longM: number;
  shortM: number;
  ceilingM: number;
  floorSqM: number;
  approxWallPaintSqM: number;
  roomType: string;
  /** Target share of floor to keep as free-flow / circulation (0–1). */
  clearanceFraction: number;
  /** Estimated walkable / clear floor budget (m²). */
  freeFlowFloorSqM: number;
  /** Upper bound for combined footprint of loose furniture on floor (m²). */
  maxFurnitureFootprintSqM: number;
  /** Heuristic max furniture width along longer wall (cm) leaving ~90–100 cm passage. */
  maxFurnitureRunAlongLongWallCm: number;
}

export function extractRoomMetricsFromRoom(
  room: {
    geometry?: unknown;
    metadata?: unknown;
  },
  roomType: string
): RoomExtractionMetrics | null {
  const meta = (room.metadata || {}) as {
    areaEstimate?: number;
    ceilingHeight?: number;
    enrichment?: {
      area_sqft?: number | null;
      dimensions?: { length_ft?: number | null; width_ft?: number | null };
    };
  };
  const geom = (room.geometry || {}) as {
    boundingBox?: { width?: number; height?: number };
    dimensions?: { length?: number; width?: number };
  };

  let lengthM = 0;
  let widthM = 0;

  const enr = meta.enrichment;
  if (enr?.dimensions?.length_ft && enr?.dimensions?.width_ft) {
    lengthM = Math.max(0.5, enr.dimensions.length_ft * 0.3048);
    widthM = Math.max(0.5, enr.dimensions.width_ft * 0.3048);
  } else if (
    geom.boundingBox &&
    typeof geom.boundingBox.width === 'number' &&
    typeof geom.boundingBox.height === 'number'
  ) {
    lengthM = Math.max(0.5, geom.boundingBox.width * PIXEL_TO_METER);
    widthM = Math.max(0.5, geom.boundingBox.height * PIXEL_TO_METER);
  } else if (
    geom.dimensions &&
    typeof geom.dimensions.length === 'number' &&
    typeof geom.dimensions.width === 'number'
  ) {
    lengthM = Math.max(0.5, geom.dimensions.length);
    widthM = Math.max(0.5, geom.dimensions.width);
  } else if (typeof enr?.area_sqft === 'number' && enr.area_sqft > 0) {
    const sqM = enr.area_sqft * 0.092903;
    const side = Math.sqrt(sqM);
    lengthM = side;
    widthM = side;
  } else if (typeof meta.areaEstimate === 'number' && meta.areaEstimate > 0) {
    const side = Math.sqrt(meta.areaEstimate);
    lengthM = side;
    widthM = side;
  }

  if (lengthM <= 0 || widthM <= 0) {
    return null;
  }

  const ceilingM =
    typeof meta.ceilingHeight === 'number' && meta.ceilingHeight > 0 ? meta.ceilingHeight : 2.7;
  const floorSqM = lengthM * widthM;
  const perimeter = 2 * (lengthM + widthM);
  const approxWallPaintSqM = perimeter * ceilingM * 0.82;
  const longM = Math.max(lengthM, widthM);
  const shortM = Math.min(lengthM, widthM);
  const clearanceFraction = clearanceFractionForRoomType(roomType);
  const freeFlowFloorSqM = floorSqM * clearanceFraction;
  const maxFurnitureFootprintSqM = floorSqM * (1 - clearanceFraction);
  const passageReserveM = 1.0;
  const maxFurnitureRunAlongLongWallCm = Math.min(
    300,
    Math.max(100, Math.round((longM - passageReserveM) * 100))
  );

  return {
    lengthM,
    widthM,
    longM,
    shortM,
    ceilingM,
    floorSqM,
    approxWallPaintSqM,
    roomType: roomType || 'UNCLASSIFIED',
    clearanceFraction,
    freeFlowFloorSqM,
    maxFurnitureFootprintSqM,
    maxFurnitureRunAlongLongWallCm,
  };
}

export function extractCirculationHintFromProjectMetadata(
  projectMetadata: unknown
): string | null {
  const meta = projectMetadata as Record<string, unknown> | undefined;
  const fpa = meta?.floorPlanAnalysis as Record<string, unknown> | undefined;
  const spa = fpa?.spatialEnrichment as
    | {
        circulation?: {
          passages?: Array<{ width_ft?: string; connects?: unknown }>;
        };
      }
    | undefined;
  const passages = spa?.circulation?.passages;
  if (!Array.isArray(passages) || passages.length === 0) {
    return null;
  }
  const parts = passages.slice(0, 6).map((p) => {
    const connects = Array.isArray(p.connects)
      ? p.connects.map(String).filter(Boolean).join(' ↔ ')
      : '';
    const w = p.width_ft ? `${p.width_ft} ft wide approx.` : 'width n/a';
    return connects ? `${connects} (${w})` : w;
  });
  return `Plan circulation passages: ${parts.join('; ')} — reserve clearance at doors; all dims still APPROXIMATE.`;
}

export function buildRoomScaleContextBlock(
  roomName: string,
  metrics: RoomExtractionMetrics | null,
  circulationHint?: string | null
): string {
  const circ = circulationHint?.trim();
  if (!metrics) {
    const circBlock = circ ? `${circ}\n\n` : '';
    return `=== ROOM SCALE (${roomName}) ===
${circBlock}No reliable footprint in project data. Infer **sq ft** (areas) and **ft/in** (lengths) from images. Every approximateSize must include digits—never only S/M/L.`;
  }

  const {
    lengthM,
    widthM,
    longM,
    shortM,
    ceilingM,
    floorSqM,
    approxWallPaintSqM,
    roomType,
    clearanceFraction,
    freeFlowFloorSqM,
    maxFurnitureFootprintSqM,
    maxFurnitureRunAlongLongWallCm,
  } = metrics;

  const ceilPaint = floorSqM;
  const pct = Math.round(clearanceFraction * 100);
  const bedAlongShortOk = shortM >= 2.35;
  const bedAlongLongOk = longM >= 2.35;
  const lenFt = lengthM * 3.280839895;
  const widFt = widthM * 3.280839895;
  const longFt = longM * 3.280839895;
  const shortFt = shortM * 3.280839895;
  const ceilFt = ceilingM * 3.280839895;
  const floorSqFt = sqMtoSqFt(floorSqM);
  const freeLo = freeFlowFloorSqM;
  const freeHi = freeFlowFloorSqM * 1.05;
  const maxRunLoCm = Math.max(120, maxFurnitureRunAlongLongWallCm - 40);
  const maxRunHiCm = maxFurnitureRunAlongLongWallCm;

  const furnitureBlock = `=== FURNITURE vs FREE-FLOW (${roomName}) — FROM ROOM BOX + TYPE (${roomType}) — SQ FT / FT PRIMARY ===
Internal footprint (gross): ~${lenFt.toFixed(1)} ft × ~${widFt.toFixed(1)} ft ≈ ~${floorSqFt.toFixed(0)} sq ft floor (≈${floorSqM.toFixed(1)} m² ref.).
Longer wall span ~${longFt.toFixed(1)} ft | shorter ~${shortFt.toFixed(1)} ft | ceiling height ~${ceilFt.toFixed(1)} ft.
Free-flow / circulation budget (heuristic): ${fmtSqFtRange(freeLo, freeHi)} (~${pct}% of gross floor for movement & door swing—not code compliance).
Max combined loose furniture footprint on floor: stay under ~${sqMtoSqFt(maxFurnitureFootprintSqM).toFixed(0)} sq ft total (≈${maxFurnitureFootprintSqM.toFixed(1)} m²) for major pieces.
Along the longer wall, typical max continuous run for sofa / media / low storage (leave ~3.3 ft passage): width ${ftRangeFromCm(maxRunLoCm, maxRunHiCm)} approx.
Bed mattress+frame needs clear wall run ≥ ~7.2 ft (≈2.2 m). This box: ${bedAlongShortOk ? `OK on shorter (~${shortFt.toFixed(1)} ft) wall` : `tight on shorter (~${shortFt.toFixed(1)} ft) wall`}; ${bedAlongLongOk ? `OK on longer (~${longFt.toFixed(1)} ft) wall` : `tight on longer wall`}.
Built-ins (wardrobe/kitchen): depth usually ~1.8–2.1 ft—keep ≥~3 ft clear walking width where possible.
For **approximateSize** use **sq ft first** for any area (floor, wall paint, ceiling, backsplash); use **feet or inches** for furniture W×D×H. Optional m/m² in parentheses. Example: "Floor tiles ${fmtSqFtRange(floorSqM, floorSqM * 1.02)} approx." or "Sofa W ${ftRangeFromCm(180, 220)} × D ${ftRangeFromCm(85, 95)} × H ${ftRangeFromCm(80, 95)} approx."`;

  const finishesBlock = `=== FINISH QUANTITIES (FROM FOOTPRINT) — SQ FT FIRST ===
• Ceiling finish: ${fmtSqFtRange(ceilPaint, ceilPaint * 1.05)} approx. (+ wastage) (≈${ceilPaint.toFixed(1)}–${(ceilPaint * 1.05).toFixed(1)} m²).
• Wall paint (openings ~18% deducted): ${fmtSqFtRange(approxWallPaintSqM, approxWallPaintSqM * 1.1)} approx. (≈${approxWallPaintSqM.toFixed(0)}–${(approxWallPaintSqM * 1.1).toFixed(0)} m²).
• Floor finish: ${fmtSqFtRange(floorSqM, floorSqM * 1.08)} approx. (≈${floorSqM.toFixed(1)}–${(floorSqM * 1.08).toFixed(1)} m²).
All quantities APPROXIMATE—not measured on site.`;

  const circBlock = circ ? `${circ}\n\n` : '';

  return `${circBlock}=== ROOM SCALE (${roomName}) — APPROXIMATE (FROM FLOOR PLAN / METADATA) ===
${furnitureBlock}

${finishesBlock}`;
}

/** True if string has at least one ASCII digit (for quantities; superscript ² alone is not enough). */
export function hasNumericDimension(text: string): boolean {
  return /[0-9]/.test(text || '');
}

/** Model often returns only S/M/L/XL — strip so we replace with sq ft / ft ranges. */
export function stripBareSizeLetterLabel(text: string): string {
  const t = (text || '').trim();
  if (
    /^(?:[SMLX]{1,2}|xs|sm|md|lg|xl|xxl|small|medium|large|extra[\s-]*large)\s*$/i.test(t)
  ) {
    return '';
  }
  return t;
}

function scaledSofaLine(m: RoomExtractionMetrics): string {
  const wMax = Math.min(240, m.maxFurnitureRunAlongLongWallCm);
  const wMin = Math.max(120, wMax - 80);
  return `W ${boldMeasure(ftRangeFromCm(wMin, wMax))} × D ${boldMeasure(ftRangeFromCm(85, 95))} × H ${boldMeasure(ftRangeFromCm(80, 95))} approx. (room ${boldMeasure(fmtSqFtRange(m.floorSqM * 0.98, m.floorSqM * 1.02, 0))} gross floor ref.)`;
}

function scaledBedLine(m: RoomExtractionMetrics): string {
  const wall = Math.max(m.shortM, m.longM);
  const maxW = wall >= 3.2 ? 200 : wall >= 2.8 ? 180 : 165;
  const minW = Math.max(90, maxW - 40);
  return `W ${boldMeasure(ftRangeFromCm(minW, maxW))} × L ${boldMeasure(ftRangeFromCm(190, 200))} × H ${boldMeasure(ftRangeFromCm(90, 120))} approx. (wall run ${boldMeasure(`~${(wall * 3.280839895).toFixed(1)} ft`)}; free-flow ${boldMeasure(fmtSqFtRange(m.freeFlowFloorSqM * 0.95, m.freeFlowFloorSqM * 1.05, 0))})`;
}

function scaledWardrobeLine(m: RoomExtractionMetrics): string {
  const wMax = Math.max(60, Math.min(280, Math.round((m.longM - 0.7) * 100)));
  const wMin = Math.max(60, Math.min(120, wMax - 25));
  const hHi = Math.min(240, Math.round(m.ceilingM * 100 - 15));
  return `W ${boldMeasure(ftRangeFromCm(wMin, wMax))} × D ${boldMeasure(ftRangeFromCm(55, 65))} × H ${boldMeasure(ftRangeFromCm(210, hHi))} approx. (room ${boldMeasure(fmtSqFtRange(m.floorSqM * 0.98, m.floorSqM * 1.02, 0))})`;
}

function scaledTvUnitLine(m: RoomExtractionMetrics): string {
  const wMax = Math.min(220, m.maxFurnitureRunAlongLongWallCm);
  const wMin = Math.max(100, wMax - 80);
  return `W ${boldMeasure(ftRangeFromCm(wMin, wMax))} × D ${boldMeasure(ftRangeFromCm(40, 55))} × H ${boldMeasure(ftRangeFromCm(45, 55))} approx. (wall ${boldMeasure(`~${(m.longM * 3.280839895).toFixed(1)} ft`)} ref.)`;
}

function scaledDiningTableLine(m: RoomExtractionMetrics): string {
  const seats = m.floorSqM >= 18 ? 6 : m.floorSqM >= 12 ? 5 : 4;
  const wLo = seats >= 6 ? 150 : 120;
  const wHi = seats >= 6 ? 180 : 150;
  return `W ${boldMeasure(ftRangeFromCm(wLo, wHi))} × D ${boldMeasure(ftRangeFromCm(75, 90))} × H ${boldMeasure(ftRangeFromCm(75, 75))} approx. (${boldMeasure(`~${seats}-seat`)} vs ${boldMeasure(fmtSqFtRange(m.floorSqM * 0.98, m.floorSqM * 1.02, 0))} dining floor ref.)`;
}

const FURNITURE_KEYWORD_FALLBACKS: Array<{ re: RegExp; fn: (m: RoomExtractionMetrics) => string }> = [
  { re: /3[\s-]?seater|three[\s-]?seater/i, fn: scaledSofaLine },
  { re: /2[\s-]?seater|two[\s-]?seater|loveseat/i, fn: (m) => {
      const wMax = Math.min(175, m.maxFurnitureRunAlongLongWallCm - 20);
      const wMin = Math.max(120, wMax - 50);
      return `W ${boldMeasure(ftRangeFromCm(wMin, wMax))} × D ${boldMeasure(ftRangeFromCm(85, 92))} × H ${boldMeasure(ftRangeFromCm(80, 90))} approx. (2-seater; ${boldMeasure(fmtSqFtRange(m.floorSqM * 0.98, m.floorSqM * 1.02, 0))} room ref.)`;
    },
  },
  { re: /sofa|couch|sectional/i, fn: scaledSofaLine },
  { re: /king[\s-]?bed|king bed/i, fn: (m) =>
      `W ${boldMeasure(ftRangeFromCm(180, 200))} × L ${boldMeasure(ftRangeFromCm(190, 210))} × H ${boldMeasure(ftRangeFromCm(100, 130))} approx. (needs wall run ≥ ${boldMeasure('~7.2 ft')}; room long ${boldMeasure(`~${(m.longM * 3.280839895).toFixed(1)} ft`)} / short ${boldMeasure(`~${(m.shortM * 3.280839895).toFixed(1)} ft`)})`,
  },
  { re: /queen[\s-]?bed|queen bed/i, fn: scaledBedLine },
  { re: /single[\s-]?bed|twin/i, fn: (m) =>
      `W ${boldMeasure(ftRangeFromCm(90, 100))} × L ${boldMeasure(ftRangeFromCm(190, 200))} × H ${boldMeasure(ftRangeFromCm(90, 110))} approx. (free-flow ${boldMeasure(fmtSqFtRange(m.freeFlowFloorSqM * 0.95, m.freeFlowFloorSqM * 1.05, 0))})`,
  },
  { re: /\bbed\b/i, fn: scaledBedLine },
  { re: /wardrobe|almirah|closet/i, fn: scaledWardrobeLine },
  { re: /tv\s*unit|media\s*console|entertainment/i, fn: scaledTvUnitLine },
  { re: /dining\s*table/i, fn: scaledDiningTableLine },
  { re: /coffee\s*table/i, fn: (m) => {
      const span = Math.min(130, Math.round(m.shortM * 100 * 0.45));
      const wMin = Math.max(80, span - 35);
      return `W ${boldMeasure(ftRangeFromCm(wMin, span))} × D ${boldMeasure(ftRangeFromCm(50, 65))} × H ${boldMeasure(ftRangeFromCm(35, 45))} approx. (shorter room dim ${boldMeasure(`~${(m.shortM * 3.280839895).toFixed(1)} ft`)})`;
    },
  },
  { re: /study\s*desk|work\s*desk|office\s*desk/i, fn: (m) => {
      const wMax = Math.min(150, m.maxFurnitureRunAlongLongWallCm - 30);
      const wMin = Math.max(90, wMax - 50);
      return `W ${boldMeasure(ftRangeFromCm(wMin, wMax))} × D ${boldMeasure(ftRangeFromCm(55, 65))} × H ${boldMeasure(ftRangeFromCm(75, 75))} approx.`;
    },
  },
  { re: /vanity/i, fn: (m) => {
      const wMax = Math.min(120, Math.round(m.shortM * 100 - 90));
      const wLo = 60;
      const wHi = Math.max(70, wMax);
      return `W ${boldMeasure(ftRangeFromCm(wLo, wHi))} × D ${boldMeasure(ftRangeFromCm(45, 55))} × H ${boldMeasure(ftRangeFromCm(80, 90))} approx. (${boldMeasure(fmtSqFtRange(m.floorSqM * 0.95, m.floorSqM * 1.05, 0))} bath ref.)`;
    },
  },
  { re: /night\s*stand|bedside/i, fn: () =>
      `W ${boldMeasure(ftRangeFromCm(45, 55))} × D ${boldMeasure(ftRangeFromCm(40, 45))} × H ${boldMeasure(ftRangeFromCm(55, 65))} approx.`,
  },
  { re: /bookshelf|book\s*shelf|rack/i, fn: (m) => {
      const wMax = Math.min(120, m.maxFurnitureRunAlongLongWallCm - 40);
      return `W ${boldMeasure(ftRangeFromCm(80, wMax))} × D ${boldMeasure(ftRangeFromCm(30, 40))} × H ${boldMeasure(ftRangeFromCm(180, 200))} approx.`;
    },
  },
  { re: /shoe\s*cabinet|rack/i, fn: (m) => {
      const wMax = Math.min(140, m.maxFurnitureRunAlongLongWallCm - 50);
      return `W ${boldMeasure(ftRangeFromCm(80, wMax))} × D ${boldMeasure(ftRangeFromCm(35, 35))} × H ${boldMeasure(ftRangeFromCm(100, 120))} approx.`;
    },
  },
];

function fallbackForMaterials(
  row: ComponentExtractionRow,
  metrics: RoomExtractionMetrics | null
): string | null {
  const name = `${row.componentName} ${row.description}`.toLowerCase();
  const placement = (row.placement || '').toLowerCase();

  if (!metrics) {
    const roomType = (row.roomName || '').toUpperCase();
    const isSmallRoom = /FOYER|ENTRY|PASSAGE|LOBBY|BATHROOM|TOILET|BALCONY/.test(roomType);
    const floorRange = isSmallRoom ? '~25–75 sq ft' : '~85–215 sq ft';
    const wallRange = isSmallRoom ? '~60–150 sq ft' : '~270–650 sq ft';
    const ceilingRange = isSmallRoom ? '~25–75 sq ft' : '~110–270 sq ft';

    if (/ceiling|roof/i.test(name) || placement === 'ceiling') {
      return `Ceiling finish ${boldMeasure(ceilingRange)} approx. (infer from images; verify on site)`;
    }
    if (/wall|paint|plaster|texture/i.test(name) || placement === 'wall') {
      return `Wall finish ${boldMeasure(wallRange)} approx. (infer from images; verify on site)`;
    }
    if (/floor|tile|marble|stone|vitrified/i.test(name) || placement === 'floor') {
      return `Floor finish ${boldMeasure(floorRange)} approx. (infer from images; verify on site)`;
    }
    return null;
  }

  const { floorSqM, approxWallPaintSqM } = metrics;

  if (/ceiling|roof/i.test(name) || placement === 'ceiling') {
    return `Ceiling coverage ${boldMeasure(fmtSqFtRange(floorSqM, floorSqM * 1.06))} approx. (+ ${boldMeasure('8–12%')} wastage) (${boldMeasure(`≈${floorSqM.toFixed(1)}–${(floorSqM * 1.06).toFixed(1)} m²`)} ref.)`;
  }
  if (/backsplash/i.test(name) && placement === 'wall' && metrics) {
    const area = Math.max(1.8, Math.min(10, metrics.longM * 0.65 * (metrics.ceilingM * 0.42)));
    return `Backsplash zone ${boldMeasure(fmtSqFtRange(area, area * 1.15, 1))} approx. (wall ${boldMeasure(`~${(metrics.longM * 3.280839895).toFixed(1)} ft`)} ref.)`;
  }
  // Named single wall (e.g. "Left Wall Finish") — ~¼ of total wall finish area, not whole room.
  if (
    /wall/i.test(name) &&
    /(left|right|front|back|north|south|east|west)\b/i.test(name) &&
    (/finish|brick|tile|paint|cladding|panel/i.test(name) || /brick|tile|stone|paint/i.test(name))
  ) {
    const oneFace = Math.max(3.5, approxWallPaintSqM * 0.24);
    return `${boldMeasure(fmtSqFtRange(oneFace, oneFace * 1.12))} per wall (${boldMeasure(`~${oneFace.toFixed(0)}–${(oneFace * 1.12).toFixed(0)} m²`)}). Estimated by splitting the room’s total wall area across all wall faces in the plan.`;
  }
  if (/wall|paint|plaster|texture|wallpaper/i.test(name) || (placement === 'wall' && /paint|finish/i.test(name))) {
    return `All painted walls (openings ${boldMeasure('~18%')} deducted) ${boldMeasure(fmtSqFtRange(approxWallPaintSqM, approxWallPaintSqM * 1.1))} approx. (${boldMeasure(`≈${approxWallPaintSqM.toFixed(0)}–${(approxWallPaintSqM * 1.1).toFixed(0)} m²`)})`;
  }
  if (/floor|tile|marble|stone|vitrified|wood\s*floor/i.test(name) || placement === 'floor') {
    return `Floor area ${boldMeasure(fmtSqFtRange(floorSqM, floorSqM * 1.08))} approx. (+ wastage) (${boldMeasure(`≈${floorSqM.toFixed(1)}–${(floorSqM * 1.08).toFixed(1)} m²`)})`;
  }
  if (/skirting|dado|border/i.test(name)) {
    const run = 2 * (metrics.lengthM + metrics.widthM);
    return `Linear run ${boldMeasure(linFtRange(run * 0.98, run * 1.15))} approx. (perimeter-based; verify)`;
  }
  return null;
}

function looksLikeSurfaceFinishRow(row: ComponentExtractionRow): boolean {
  const blob = `${row.componentName} ${row.description} ${row.material}`.toLowerCase();
  return (
    /\b(finish|tile|tiles|brick|paint|plaster|stone|marble|vitrified|laminate|veneer|cladding|panel)\b/.test(
      blob
    ) && /^(Wall|Floor|Ceiling)$/i.test(String(row.placement || ''))
  );
}

function fallbackForCategory(row: ComponentExtractionRow, metrics: RoomExtractionMetrics | null): string {
  const cat = row.componentCategory as ComponentCategory;
  const name = row.componentName || '';

  // Wrong category from model (e.g. "Fixed", "Materials") — still size finishes by wall/floor/ceiling.
  if (cat !== 'Materials & Finishes' && looksLikeSurfaceFinishRow(row)) {
    const mat = fallbackForMaterials(
      { ...row, componentCategory: 'Materials & Finishes' },
      metrics
    );
    if (mat) return mat;
  }

  if (cat === 'Materials & Finishes') {
    const mat = fallbackForMaterials(row, metrics);
    if (mat) return mat;
    return `Qty scales to room ${metrics ? boldMeasure(fmtSqFtRange(metrics.floorSqM * 0.9, metrics.floorSqM * 1.1)) : boldMeasure('~130–215')} sq ft floor approx. (verify)`;
  }

  if (cat === 'Lighting') {
    const spanCm = metrics ? Math.min(120, Math.round(metrics.shortM * 30)) : 60;
    return `Fixture ø ${boldMeasure(inchRangeFromCm(20, 50))} or linear span ${boldMeasure(inchRangeFromCm(40, spanCm))} approx. (room ${metrics ? boldMeasure(fmtSqFtRange(metrics.floorSqM * 0.95, metrics.floorSqM * 1.05, 0)) : boldMeasure('~?')} sq ft ref.)`;
  }

  if (cat === 'Decor & Accessories') {
    const d = metrics ? Math.min(90, Math.round(metrics.shortM * 25)) : 60;
    return `Largest dimension ${boldMeasure(inchRangeFromCm(15, Math.max(35, d)))} approx. (room depth ${boldMeasure(`~${metrics ? (metrics.shortM * 3.280839895).toFixed(1) : '?'} ft`)} ref.)`;
  }

  if (cat === 'Furniture' || cat === 'Fixed Components') {
    if (metrics) {
      for (const { re, fn } of FURNITURE_KEYWORD_FALLBACKS) {
        if (re.test(name)) {
          return fn(metrics);
        }
      }
      return `W×D×H in ft/in: scale to ${boldMeasure(fmtSqFtRange(metrics.floorSqM * 0.98, metrics.floorSqM * 1.02, 0))} gross floor, free-flow ${boldMeasure(fmtSqFtRange(metrics.freeFlowFloorSqM * 0.95, metrics.freeFlowFloorSqM * 1.05, 0))}, max run ${boldMeasure(ftRangeFromCm(Math.max(100, metrics.maxFurnitureRunAlongLongWallCm - 40), metrics.maxFurnitureRunAlongLongWallCm))} along long wall — approx.; verify on site`;
    }
    return `W×D×H ${boldMeasure('~1.8–7.5 ft')} typical modular ranges—approx. (verify on site)`;
  }

  return `Add sq ft (areas) or ft/in (lengths) from plan—e.g. ${boldMeasure('~100–860 sq ft')} walls or ${boldMeasure('~3–10 ft')} pieces—approx. (verify on site)`;
}

function emergencyNumericLine(metrics: RoomExtractionMetrics | null): string {
  if (metrics) {
    return `Plan ${boldMeasure(`~${(metrics.lengthM * 3.280839895).toFixed(1)} ft`)} × ${boldMeasure(`~${(metrics.widthM * 3.280839895).toFixed(1)} ft`)} (${boldMeasure(fmtSqFtRange(metrics.floorSqM * 0.98, metrics.floorSqM * 1.02, 0))}); see ROOM SCALE—approx.`;
  }
  return `Infer ${boldMeasure('~85–430 sq ft')} (floor) or ${boldMeasure('~215–970 sq ft')} (walls) from images—approx.; verify on site`;
}

/**
 * If the model returned only S/M/L or no digits, replace/append with plan-based numeric ranges.
 */
export function ensureNumericApproximateSize(
  row: ComponentExtractionRow,
  metrics: RoomExtractionMetrics | null
): ComponentExtractionRow {
  let raw = stripBareSizeLetterLabel((row.approximateSize || '').trim());
  if (hasNumericDimension(raw)) {
    return { ...row, approximateSize: emphasizeApproximateSizeMeasures(raw) };
  }

  let fallback = fallbackForCategory(row, metrics);
  let merged = raw ? `${raw} | ${fallback}` : fallback;
  if (!hasNumericDimension(merged)) {
    merged = merged ? `${merged} | ${emergencyNumericLine(metrics)}` : emergencyNumericLine(metrics);
  }
  return { ...row, approximateSize: emphasizeApproximateSizeMeasures(merged.trim()) };
}
