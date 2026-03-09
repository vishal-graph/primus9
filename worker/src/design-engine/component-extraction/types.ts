export type ComponentCategory =
  | 'Furniture'
  | 'Fixed Components'
  | 'Materials & Finishes'
  | 'Lighting'
  | 'Decor & Accessories';

export interface ComponentExtractionRow {
  roomName: string;
  componentCategory: ComponentCategory;
  componentName: string;
  description: string;
  material: string;
  finishColor: string;
  approximateSize: string;
  placement: 'Wall' | 'Floor' | 'Ceiling';
  wallLocation: string;
  suggestedBuyLinks: Array<{
    label: string;
    url: string;
    note?: string;
  }>;
  confidence: number;
}

export interface ComponentExtractionResult {
  roomName: string;
  rows: ComponentExtractionRow[];
}
