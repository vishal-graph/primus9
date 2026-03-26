export type ComponentCategory =
  | 'Furniture'
  | 'Fixed Components'
  | 'Materials & Finishes'
  | 'Lighting'
  | 'Decor & Accessories';

export type PricingType = 'area' | 'unit' | 'custom';

export interface ComponentExtractionRow {
  roomName: string;
  componentCategory: ComponentCategory;
  componentName: string;
  description: string;
  material: string;
  finishColor: string;
  /** Sq ft (areas) and ft/in (furniture); approximate — see promptBuilder / roomScaleForExtraction. */
  approximateSize: string;
  placement: 'Wall' | 'Floor' | 'Ceiling';
  wallLocation: string;
  suggestedBuyLinks: Array<{
    label: string;
    url: string;
    note?: string;
  }>;
  confidence: number;
  /** BOQ pricing (INR, whole rupees). */
  pricingType: PricingType;
  materialCost: number;
  labourCost: number;
  totalCost: number;
  calculation: string;
  notes: string;
}

export interface ComponentExtractionResult {
  roomName: string;
  /** Echo of room.type from pipeline; model should mirror prompt. */
  roomType?: string;
  rows: ComponentExtractionRow[];
}
