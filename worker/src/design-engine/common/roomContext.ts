/**
 * TatvaOps Vision - Room Context Logic
 * 
 * Centralized logic for generating Indian-aware design rules based on:
 * 1. Room Type
 * 2. Budget Level (Economy, Standard, Premium)
 * 3. Design Theme/Intent
 */

import { DesignIntent } from '../types';

/**
 * Get room-specific rules blended with budget and design theme.
 * This ensures the AI generates culturally and practically appropriate spaces.
 */
export function getRoomContext(intent: DesignIntent): string {
  const roomType = (intent.roomType || '').toLowerCase();
  const budget = (intent.budget || 'Standard').toLowerCase();
  const style = (intent.aestheticStyle || '').toLowerCase();
  const mood = (intent.themeMood || '').toLowerCase();

  const rules: string[] = [];

  // ===========================================
  // 1. Bathroom Logic (Nuanced bathtub rule)
  // ===========================================
  if (roomType.includes('bathroom') || roomType.includes('toilet')) {
    if (budget === 'premium') {
      rules.push('BATHROOM FIXTURES: Luxury bathtub permitted as a statement piece, styled to match the theme. Ensure separate wet/dry areas with high-end glass partitions.');
    } else {
      rules.push('BATHROOM FIXTURES: STRICTLY NO BATHTUBS. The space must only feature a modern shower area. DO NOT include or suggest a bathtub in any inspiration or layout. Focus on practical wet/dry separation via floor slope or simple glass partitions.');
    }
    rules.push('SAFETY: Mandate anti-skid tiles for all floor surfaces.');
  }

  // ===========================================
  // 2. Bedroom Logic (Mandatory wardrobes)
  // ===========================================
  if (roomType.includes('bedroom')) {
    rules.push('STORAGE: Mandatory ceiling-height wardrobes or built-in storage units. The finish should match the theme (e.g., sleek laminates for Modern, solid wood textures for Traditional).');
  }

  // ===========================================
  // 3. Kitchen Logic (Heavy-duty vs. Sleek)
  // ===========================================
  if (roomType.includes('kitchen') || roomType.includes('utility')) {
    if (budget === 'economy' || budget === 'standard') {
      rules.push('KITCHEN LAYOUT: Heavy-duty design with deep sinks and extensive closed loft storage for appliances/supplies. Use durable granite or quartz countertops.');
    } else {
      rules.push('KITCHEN LAYOUT: Sleek designer finishes with open shelving options and high-end integrated appliances. Focus on aesthetics and spatial flow.');
    }
  }

  // ===========================================
  // 4. Living Room / Hall Logic (Communal seating)
  // ===========================================
  if (roomType.includes('living') || roomType.includes('hall') || roomType.includes('dining')) {
    if (budget === 'economy' || budget === 'standard') {
      rules.push('FURNITURE: Emphasize communal seating with large L-sofas or diwans. Include a prominent TV unit and an integrated Pooja/Mandir space.');
    } else {
      rules.push('FURNITURE: Minimalist luxury seating with statement pieces. Subtle, integrated Mandir design if style permits.');
    }
  }

  // ===========================================
  // 5. Balcony Logic (Utility vs. Leisure)
  // ===========================================
  if (roomType.includes('balcony') || roomType.includes('terrace')) {
    if (budget === 'premium') {
      rules.push('OUTDOOR: Focus on leisure with designer jhoolas (swings), vertical gardens, and premium weather-proof deck flooring.');
    } else {
      rules.push('OUTDOOR: Practical utility space with drying racks and simple terracotta planters.');
    }
  }

  // ===========================================
  // 6. Generic Constraint Blending
  // ===========================================
  if (budget === 'economy') {
    rules.push('PRIORITY: Prioritize must-haves and functionality over purely aesthetic choices; essential elements and durability first.');
    rules.push('MATERIALS: Prioritize cost-effective, high-durability surfaces like vitrified tiles and laminates. Avoid expensive natural stone or intricate manual carvings.');
  } else if (budget === 'premium') {
    rules.push('MATERIALS: Use high-end finishes like Italian marble, solid teak wood, and bespoke hardware.');
  }

  if (intent.maintenanceTolerance === 'low') {
    rules.push('FINISHES: Use easy-clean, fingerprint-resistant matte surfaces. Avoid high-gloss finishes, complex moldings, or delicate fabrics.');
  }

  return rules.length > 0 
    ? `\nROOM-SPECIFIC PRACTICAL RULES (Budget: ${budget}):\n- ${rules.join('\n- ')}`
    : '';
}
