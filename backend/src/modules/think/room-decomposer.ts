/**
 * TatvaOps Vision - Room Decomposer
 * 
 * Maps IntentGraph to individual room spatial plans
 * Hybrid approach: use floor plan if available, infer from intent otherwise
 */

import { InferredIntent } from '../sense/sense.types';
import { RoomSpatialPlan } from './think.types';
import { Room } from '@prisma/client';
import { logger } from '../../lib/logger';

export class RoomDecomposer {
  /**
   * Decompose intent into room-specific spatial plans
   * @param intent - AI-inferred intent from Sense Layer
   * @param existingRooms - Rooms from floor plan analysis (if available)
   * @returns Record of room spatial plans keyed by roomId or roomName
   */
  async decomposeIntent(
    intent: InferredIntent,
    existingRooms: Room[] | null
  ): Promise<Record<string, RoomSpatialPlan>> {
    logger.debug('Decomposing intent into room plans', {
      spaceType: intent.spaceType,
      hasExistingRooms: !!existingRooms && existingRooms.length > 0,
      roomCount: existingRooms?.length || 0,
    });

    if (existingRooms && existingRooms.length > 0) {
      // Path 1: Use existing floor plan rooms
      return this.mapToExistingRooms(intent, existingRooms);
    } else {
      // Path 2: Infer room structure from intent
      return this.inferRoomsFromIntent(intent);
    }
  }

  /**
   * Map intent to existing floor plan rooms
   * @private
   */
  private mapToExistingRooms(
    intent: InferredIntent,
    rooms: Room[]
  ): Record<string, RoomSpatialPlan> {
    const roomPlans: Record<string, RoomSpatialPlan> = {};

    for (const room of rooms) {
      const visualWeight = this.calculateVisualWeight(room, intent);
      const density = this.determineDensity(intent, room.type);
      const components = this.inferComponents(room.type, intent);

      roomPlans[room.id] = {
        roomId: room.id,
        roomName: room.name,
        roomType: room.type,
        applyStyle: true,
        visualWeight,
        density,
        components,
        layoutLocked: intent.changeBoundaries.mustPreserve.length > 0,
        geometrySource: 'floor_plan',
        geometry: {
          area: this.extractArea(room),
          adjacentRooms: this.extractAdjacentRooms(room),
        },
      };
    }

    logger.info('Mapped intent to existing rooms', {
      roomCount: Object.keys(roomPlans).length,
    });

    return roomPlans;
  }

  /**
   * Infer room structure from intent when no floor plan is available
   * @private
   */
  private inferRoomsFromIntent(intent: InferredIntent): Record<string, RoomSpatialPlan> {
    const roomPlans: Record<string, RoomSpatialPlan> = {};
    
    // Infer primary room from space type
    const primaryRoomType = this.inferPrimaryRoomType(intent.spaceType);
    const primaryRoomName = this.formatRoomName(primaryRoomType);
    const primaryRoomId = this.generateRoomId(primaryRoomName);

    const density = this.determineDensity(intent, primaryRoomType);
    const components = this.inferComponents(primaryRoomType, intent);
    const visualWeight = 1.0; // Primary room gets full weight

    roomPlans[primaryRoomId] = {
      roomId: primaryRoomId,
      roomName: primaryRoomName,
      roomType: primaryRoomType,
      applyStyle: true,
      visualWeight,
      density,
      components,
      layoutLocked: false, // No layout constraints when inferring
      geometrySource: 'inferred',
    };

    // Optionally infer secondary spaces based on lifestyle signals
    if (intent.lifestyleSignals?.workFromHome) {
      const homeOfficeId = this.generateRoomId('Home Office');
      roomPlans[homeOfficeId] = {
        roomId: homeOfficeId,
        roomName: 'Home Office',
        roomType: 'STUDY',
        applyStyle: true,
        visualWeight: 0.7,
        density: 'medium',
        components: this.inferComponents('STUDY', intent),
        layoutLocked: false,
        geometrySource: 'inferred',
      };
    }

    logger.info('Inferred rooms from intent', {
      spaceType: intent.spaceType,
      roomCount: Object.keys(roomPlans).length,
    });

    return roomPlans;
  }

  /**
   * Calculate visual weight for a room (0-1 scale)
   * Determines priority for visual attention in walkthrough
   * @private
   */
  private calculateVisualWeight(room: Room, intent: InferredIntent): number {
    // Primary living spaces get higher weight
    const primarySpaces = ['LIVING_ROOM', 'MASTER_BEDROOM', 'KITCHEN'];
    const roomType = room.type;

    if (primarySpaces.includes(roomType)) {
      return 1.0;
    }

    // Secondary spaces based on lifestyle signals
    if (roomType === 'STUDY' && intent.lifestyleSignals?.workFromHome) {
      return 0.9;
    }

    // Kids room is typically a BEDROOM - check lifestyle signals
    if (roomType === 'BEDROOM' && intent.lifestyleSignals?.hasKids) {
      return 0.85;
    }

    // Default weight for other spaces
    return 0.6;
  }

  /**
   * Determine furniture/decor density based on intent and room type
   * @private
   */
  private determineDensity(
    intent: InferredIntent,
    roomType: string
  ): 'sparse' | 'medium' | 'dense' {
    const visualDensity = intent.styleSignals.visualDensity;

    // Certain rooms naturally have different density
    if (roomType === 'BATHROOM' || roomType === 'CORRIDOR') {
      return 'sparse';
    }

    if (roomType === 'LIVING_ROOM' || roomType === 'KITCHEN') {
      // Living spaces can handle more density
      return visualDensity === 'sparse' ? 'medium' : visualDensity;
    }

    return visualDensity;
  }

  /**
   * Infer component hierarchy for a room based on type and intent
   * @private
   */
  private inferComponents(
    roomType: string,
    intent: InferredIntent
  ): { primary: string[]; secondary: string[]; ambient: string[] } {
    const furniture = intent.componentPreferences.furniture;
    const materials = intent.componentPreferences.materials;

    // Room-type specific component mapping
    const roomComponentMap: Record<string, { primary: string[]; secondary: string[]; ambient: string[] }> = {
      LIVING_ROOM: {
        primary: ['sofa', 'coffee_table'],
        secondary: ['accent_chair', 'side_table', 'tv_unit'],
        ambient: ['wall_art', 'plants', 'throw_pillows', 'rug'],
      },
      MASTER_BEDROOM: {
        primary: ['bed', 'wardrobe'],
        secondary: ['nightstand', 'dresser'],
        ambient: ['wall_art', 'plants', 'bedding', 'curtains'],
      },
      KITCHEN: {
        primary: ['cabinets', 'countertop', 'appliances'],
        secondary: ['dining_table', 'chairs', 'island'],
        ambient: ['backsplash', 'lighting', 'decor'],
      },
      STUDY: {
        primary: ['desk', 'office_chair', 'bookshelf'],
        secondary: ['storage', 'desk_lamp'],
        ambient: ['wall_art', 'plants', 'organizers'],
      },
      DINING_ROOM: {
        primary: ['dining_table', 'chairs'],
        secondary: ['buffet', 'display_cabinet'],
        ambient: ['centerpiece', 'wall_art', 'lighting'],
      },
      KIDS_ROOM: {
        primary: ['bed', 'study_desk', 'storage'],
        secondary: ['chair', 'bookshelf', 'toy_storage'],
        ambient: ['wall_decor', 'rug', 'curtains'],
      },
      BATHROOM: {
        primary: ['vanity', 'mirror', 'shower'],
        secondary: ['storage', 'towel_rack'],
        ambient: ['decor', 'plants', 'accessories'],
      },
    };

    return roomComponentMap[roomType] || {
      primary: ['furniture'],
      secondary: ['storage'],
      ambient: ['decor'],
    };
  }

  /**
   * Infer primary room type from space type string
   * @private
   */
  private inferPrimaryRoomType(spaceType: string): string {
    const spaceTypeLower = spaceType.toLowerCase();
    
    if (spaceTypeLower.includes('living')) return 'LIVING_ROOM';
    if (spaceTypeLower.includes('bedroom') || spaceTypeLower.includes('master')) return 'MASTER_BEDROOM';
    if (spaceTypeLower.includes('kitchen')) return 'KITCHEN';
    if (spaceTypeLower.includes('dining')) return 'DINING_ROOM';
    if (spaceTypeLower.includes('study') || spaceTypeLower.includes('office')) return 'STUDY';
    if (spaceTypeLower.includes('bathroom')) return 'BATHROOM';
    if (spaceTypeLower.includes('kids') || spaceTypeLower.includes('child')) return 'KIDS_ROOM';
    
    // Default to living room
    return 'LIVING_ROOM';
  }

  /**
   * Format room name from room type
   * @private
   */
  private formatRoomName(roomType: string): string {
    return roomType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Generate unique room ID
   * @private
   */
  private generateRoomId(roomName: string): string {
    return roomName.toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Extract area from room metadata
   * @private
   */
  private extractArea(room: Room): number | undefined {
    try {
      const metadata = room.metadata as any;
      return metadata?.areaEstimate;
    } catch {
      return undefined;
    }
  }

  /**
   * Extract adjacent rooms from room metadata
   * @private
   */
  private extractAdjacentRooms(room: Room): string[] | undefined {
    try {
      const metadata = room.metadata as any;
      return metadata?.adjacentRooms;
    } catch {
      return undefined;
    }
  }
}
