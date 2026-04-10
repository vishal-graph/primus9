/**
 * Supabase public catalog: searchable text columns per table (from information_schema introspection).
 */

export const CATALOG_TABLE_NAMES = [
  'ceiling_options',
  'chair_products',
  'flooring_options',
  'glass_partition_options',
  'lighting_products',
  'mattress_products',
  'mytyles_vitrified_tiles',
  'product_variations',
  'room_variations',
  'sofa_products',
  'table_products',
] as const;

export type CatalogTableName = (typeof CATALOG_TABLE_NAMES)[number];

/** Columns used for ILIKE token matching (text-like). */
export const SEARCHABLE_COLUMNS: Record<CatalogTableName, readonly string[]> = {
  ceiling_options: ['style_name', 'material', 'texture', 'finish', 'category'],
  chair_products: [
    'category',
    'name',
    'brand',
    'colour',
    'description',
    'generic_name',
    'primary_material_type',
    'primary_material_subtype',
    'primary_room',
    'product_model_name',
  ],
  flooring_options: ['style_name', 'material', 'texture', 'finish', 'category'],
  glass_partition_options: ['style_name', 'description', 'material', 'texture', 'finish', 'category'],
  lighting_products: [
    'category',
    'name',
    'brand',
    'colour',
    'description',
    'primary_material_type',
  ],
  mattress_products: ['category', 'name', 'description'],
  mytyles_vitrified_tiles: ['category', 'product_name', 'description', 'colors', 'styles'],
  product_variations: [
    'component_type',
    'component_category',
    'component_name',
    'variation_name',
    'style_family',
    'material',
    'color',
    'texture',
  ],
  room_variations: ['component_type', 'color', 'material', 'texture', 'finish', 'size'],
  sofa_products: [
    'category',
    'name',
    'brand',
    'colour',
    'description',
    'generic_name',
    'primary_material_type',
    'primary_material_subtype',
    'primary_room',
    'product_model_name',
  ],
  table_products: [
    'category',
    'name',
    'brand',
    'colour',
    'description',
    'generic_name',
    'primary_material_type',
    'primary_material_subtype',
    'primary_room',
    'product_model_name',
  ],
};

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'this',
  'that',
  'are',
  'was',
  'has',
  'have',
  'room',
  'user',
  'want',
  'like',
  'some',
  'any',
  'use',
  'using',
  'into',
  'also',
  'but',
  'not',
  'our',
  'your',
  'their',
  'will',
  'can',
  'may',
  'one',
  'two',
  'all',
  'per',
]);

function normalizeRoomType(roomType: string): string {
  return roomType.toUpperCase().replace(/\s+/g, '_').trim();
}

/**
 * Base table set by room; keyword hints add topical tables.
 */
export function selectCatalogTables(roomType: string, searchBlob: string): CatalogTableName[] {
  const rt = normalizeRoomType(roomType);
  const blob = searchBlob.toLowerCase();

  const addIfKeyword = (re: RegExp, table: CatalogTableName, set: Set<CatalogTableName>) => {
    if (re.test(blob)) set.add(table);
  };

  const set = new Set<CatalogTableName>();

  if (rt.includes('BED')) {
    [
      'mattress_products',
      'chair_products',
      'table_products',
      'lighting_products',
      'flooring_options',
      'ceiling_options',
      'mytyles_vitrified_tiles',
      'product_variations',
      'room_variations',
    ].forEach((t) => set.add(t as CatalogTableName));
  } else if (
    rt.includes('LIVING') ||
    rt.includes('HALL') ||
    rt.includes('DRAWING') ||
    rt.includes('LOUNGE')
  ) {
    [
      'sofa_products',
      'chair_products',
      'table_products',
      'lighting_products',
      'flooring_options',
      'ceiling_options',
      'glass_partition_options',
      'mytyles_vitrified_tiles',
      'product_variations',
      'room_variations',
    ].forEach((t) => set.add(t as CatalogTableName));
  } else if (rt.includes('KITCHEN') || rt.includes('DINING')) {
    [
      'table_products',
      'chair_products',
      'lighting_products',
      'flooring_options',
      'ceiling_options',
      'glass_partition_options',
      'mytyles_vitrified_tiles',
      'product_variations',
      'room_variations',
    ].forEach((t) => set.add(t as CatalogTableName));
  } else if (rt.includes('BATH')) {
    [
      'lighting_products',
      'flooring_options',
      'ceiling_options',
      'glass_partition_options',
      'mytyles_vitrified_tiles',
      'product_variations',
      'room_variations',
    ].forEach((t) => set.add(t as CatalogTableName));
  } else {
    CATALOG_TABLE_NAMES.forEach((t) => set.add(t));
  }

  addIfKeyword(/\b(partition|glass|sliding\s+door|sliding-door)\b/i, 'glass_partition_options', set);
  addIfKeyword(/\b(false\s*ceiling|ceiling|pop\s+ceiling|cove)\b/i, 'ceiling_options', set);
  addIfKeyword(/\b(tile|tiles|vitrified|mytyles|flooring\s+tile)\b/i, 'mytyles_vitrified_tiles', set);
  addIfKeyword(/\b(floor|flooring|laminate|hardwood|marble\s+floor)\b/i, 'flooring_options', set);
  addIfKeyword(/\b(sofa|sectional|lounge)\b/i, 'sofa_products', set);
  addIfKeyword(/\b(chair|seating|dining\s+chair)\b/i, 'chair_products', set);
  addIfKeyword(/\b(table|dining\s+table|coffee\s+table)\b/i, 'table_products', set);
  addIfKeyword(/\b(light|lamp|chandelier|pendant|fixture)\b/i, 'lighting_products', set);
  addIfKeyword(/\b(mattress|bed\s+mattress)\b/i, 'mattress_products', set);

  return Array.from(set);
}

export function tokenizeIntentSearchText(text: string): string[] {
  const raw = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/gi, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
    if (out.length >= 12) break;
  }
  return out.slice(0, 8);
}

export function buildIntentSearchBlob(intent: {
  roomType: string;
  aestheticStyle: string;
  themeMood: string;
  colorPalette: string;
  materialPreferences: string;
  texturePreferences: string;
  furniturePreferences: string;
  decorPreferences: string;
  lightingPreferences: string;
  notes: string;
}): string {
  return [
    intent.roomType,
    intent.aestheticStyle,
    intent.themeMood,
    intent.colorPalette,
    intent.materialPreferences,
    intent.texturePreferences,
    intent.furniturePreferences,
    intent.decorPreferences,
    intent.lightingPreferences,
    intent.notes,
  ]
    .filter(Boolean)
    .join(' ');
}

export function escapeLikePattern(token: string): string {
  return token.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
