/**
 * TatvaOps Vision - Walkthrough Planner
 * 
 * Plans camera paths for 3D walkthrough
 * Determines entry points, focus areas, and camera movement
 */

import { InferredIntent } from '../sense/sense.types';
import { RoomSpatialPlan, WalkthroughPlan } from './think.types';
import { logger } from '../../lib/logger';

export class WalkthroughPlanner {
  /**
   * Plan walkthrough camera path
   * @param roomPlans - Room-specific spatial plans
   * @param intent - AI-inferred intent from Sense Layer
   * @returns Walkthrough plan with camera path and focus points
   */
  async planWalkthrough(
    roomPlans: Record<string, RoomSpatialPlan>,
    intent: InferredIntent
  ): Promise<WalkthroughPlan> {
    logger.debug('Planning walkthrough camera path', {
      roomCount: Object.keys(roomPlans).length,
    });

    // Step 1: Determine entry room (highest visual weight)
    const entryRoom = this.determineEntryRoom(roomPlans);

    // Step 2: Determine camera height (based on walkthrough style)
    const cameraHeight = this.determineCameraHeight(intent);

    // Step 3: Determine path style
    const pathStyle = this.determinePathStyle(intent);

    // Step 4: Create focus points for each room
    const focusPoints = this.createFocusPoints(roomPlans, entryRoom);

    // Step 5: Determine transition style
    const transitions = this.determineTransitions(pathStyle);

    // Step 6: Calculate total duration
    const totalDuration = focusPoints.reduce((sum, point) => sum + point.duration, 0);

    const walkthroughPlan: WalkthroughPlan = {
      entryRoom,
      cameraHeight,
      pathStyle,
      focusPoints,
      transitions,
      totalDuration,
    };

    logger.info('Walkthrough planning complete', {
      entryRoom,
      cameraHeight,
      pathStyle,
      focusPointCount: focusPoints.length,
      totalDuration: `${totalDuration}s`,
    });

    return walkthroughPlan;
  }

  /**
   * Determine which room to start the walkthrough
   * @private
   */
  private determineEntryRoom(roomPlans: Record<string, RoomSpatialPlan>): string {
    // Find room with highest visual weight
    let entryRoom = '';
    let maxWeight = 0;

    for (const [roomId, roomPlan] of Object.entries(roomPlans)) {
      if (roomPlan.visualWeight > maxWeight) {
        maxWeight = roomPlan.visualWeight;
        entryRoom = roomPlan.roomName;
      }
    }

    // Default to first room if no clear winner
    if (!entryRoom) {
      const firstRoom = Object.values(roomPlans)[0];
      entryRoom = firstRoom?.roomName || 'Living Room';
    }

    return entryRoom;
  }

  /**
   * Determine camera height based on intent style
   * @private
   */
  private determineCameraHeight(intent: InferredIntent): 'human_eye' | 'elevated' | 'ground' {
    const era = intent.styleSignals.era?.toLowerCase();

    // Elevated view for overview/architectural styles
    if (era === 'contemporary' || era === 'minimalist' || era === 'modern') {
      return 'elevated';
    }

    // Human eye level is most relatable for most styles
    return 'human_eye';
  }

  /**
   * Determine camera path style
   * @private
   */
  private determinePathStyle(intent: InferredIntent): 'smooth' | 'cinematic' | 'first_person' {
    const warmth = intent.styleSignals.warmth;
    const visualDensity = intent.styleSignals.visualDensity;

    // Cinematic for high-warmth, dense spaces (dramatic)
    if (warmth === 'high' && visualDensity === 'dense') {
      return 'cinematic';
    }

    // First-person for intimate, cozy spaces
    if (warmth === 'high' && visualDensity === 'sparse') {
      return 'first_person';
    }

    // Smooth for clean, modern spaces
    return 'smooth';
  }

  /**
   * Create focus points for each room
   * @private
   */
  private createFocusPoints(
    roomPlans: Record<string, RoomSpatialPlan>,
    entryRoom: string
  ): Array<{
    roomId: string;
    roomName: string;
    duration: number;
    angle: number;
    highlight: string;
  }> {
    const focusPoints: Array<{
      roomId: string;
      roomName: string;
      duration: number;
      angle: number;
      highlight: string;
    }> = [];

    // Sort rooms by visual weight (descending)
    const sortedRooms = Object.entries(roomPlans).sort(
      ([, a], [, b]) => b.visualWeight - a.visualWeight
    );

    let currentAngle = 0; // Start at 0 degrees

    for (const [roomId, roomPlan] of sortedRooms) {
      // Duration based on visual weight (3-10 seconds)
      const baseDuration = 5;
      const duration = Math.round(baseDuration * roomPlan.visualWeight + 2);

      // Determine what to highlight in this room
      const highlight = this.determineHighlight(roomPlan);

      focusPoints.push({
        roomId,
        roomName: roomPlan.roomName,
        duration,
        angle: currentAngle,
        highlight,
      });

      // Increment angle for next room (simulate rotation/movement)
      currentAngle = (currentAngle + 45) % 360;
    }

    // Ensure entry room is first
    const entryIndex = focusPoints.findIndex(p => p.roomName === entryRoom);
    if (entryIndex > 0) {
      const entryPoint = focusPoints.splice(entryIndex, 1)[0];
      focusPoints.unshift(entryPoint);
    }

    return focusPoints;
  }

  /**
   * Determine what to highlight in a room
   * @private
   */
  private determineHighlight(roomPlan: RoomSpatialPlan): string {
    // Highlight primary components
    if (roomPlan.components.primary.length > 0) {
      const primaryComponent = roomPlan.components.primary[0];
      return `Focus on ${primaryComponent} and overall ${roomPlan.roomName.toLowerCase()} layout`;
    }

    // Fallback to room type
    return `Overall ${roomPlan.roomName.toLowerCase()} design and ambiance`;
  }

  /**
   * Determine transition style between focus points
   * @private
   */
  private determineTransitions(pathStyle: 'smooth' | 'cinematic' | 'first_person'): 'cut' | 'fade' | 'pan' {
    if (pathStyle === 'cinematic') {
      return 'fade';
    }

    if (pathStyle === 'first_person') {
      return 'pan';
    }

    // Smooth uses direct cuts
    return 'cut';
  }
}
