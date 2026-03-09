/**
 * TatvaOps Vision - Spatial Plan Builder
 * 
 * Orchestrates the conversion from IntentGraph to SpatialPlan
 * Coordinates room decomposition, component planning, lighting, and walkthrough
 */

import { InferredIntent } from '../sense/sense.types';
import { SpatialPlanData, LightingPlan, SpatialConstraints } from './think.types';
import { RoomDecomposer } from './room-decomposer';
import { ComponentPlanner } from './component-planner';
import { WalkthroughPlanner } from './walkthrough-planner';
import { Room } from '@prisma/client';
import { logger } from '../../lib/logger';

export class SpatialPlanBuilder {
  private roomDecomposer: RoomDecomposer;
  private componentPlanner: ComponentPlanner;
  private walkthroughPlanner: WalkthroughPlanner;

  constructor() {
    this.roomDecomposer = new RoomDecomposer();
    this.componentPlanner = new ComponentPlanner();
    this.walkthroughPlanner = new WalkthroughPlanner();
  }

  /**
   * Build complete spatial plan from intent
   * @param intentGraph - AI-inferred intent from Sense Layer
   * @param rooms - Existing rooms from floor plan (if available)
   * @param options - Build options
   * @returns Complete spatial plan ready for execution
   */
  async buildFromIntent(
    intentGraph: InferredIntent,
    rooms: Room[] | null,
    options: { useFloorPlan: boolean }
  ): Promise<SpatialPlanData> {
    logger.info('Building spatial plan from intent', {
      spaceType: intentGraph.spaceType,
      hasRooms: !!rooms && rooms.length > 0,
      useFloorPlan: options.useFloorPlan,
    });

    const startTime = Date.now();

    // Step 1: Decompose intent into room-specific plans
    logger.debug('Step 1: Decomposing intent by rooms');
    const roomPlans = await this.roomDecomposer.decomposeIntent(
      intentGraph,
      options.useFloorPlan ? rooms : null
    );

    // Step 2: Plan component placement
    logger.debug('Step 2: Planning component placement');
    const componentPlan = await this.componentPlanner.planComponents(
      intentGraph,
      roomPlans
    );

    // Step 3: Design lighting strategy
    logger.debug('Step 3: Designing lighting plan');
    const lightingPlan = this.planLighting(intentGraph);

    // Step 4: Plan walkthrough camera path
    logger.debug('Step 4: Planning walkthrough path');
    const walkthrough = await this.walkthroughPlanner.planWalkthrough(
      roomPlans,
      intentGraph
    );

    // Step 5: Extract constraints
    logger.debug('Step 5: Extracting constraints');
    const constraints = this.extractConstraints(intentGraph);

    // Step 6: Calculate overall readiness/confidence
    logger.debug('Step 6: Calculating readiness score');
    const confidence = this.calculateConfidence(
      roomPlans,
      componentPlan,
      intentGraph,
      options.useFloorPlan
    );

    const processingTime = Date.now() - startTime;

    const spatialPlan: SpatialPlanData = {
      rooms: roomPlans,
      componentPlan,
      lightingPlan,
      walkthrough,
      constraints,
      confidence,
      reasoning: `Spatial plan generated from ${intentGraph.inferredFrom.join(', ')} with ${Object.keys(roomPlans).length} rooms`,
    };

    logger.info('Spatial plan built successfully', {
      roomCount: Object.keys(roomPlans).length,
      componentCount: componentPlan.length,
      confidence,
      processingTimeMs: processingTime,
    });

    return spatialPlan;
  }

  /**
   * Plan lighting strategy based on intent
   * @private
   */
  private planLighting(intent: InferredIntent): LightingPlan {
    const lighting = intent.componentPreferences.lighting.toLowerCase();
    const warmth = intent.styleSignals.warmth;
    const mood = this.inferLightingMood(warmth);

    // Determine natural light bias
    let naturalLightBias = 0.5; // Default balanced
    if (lighting.includes('natural')) {
      naturalLightBias = 0.8;
    } else if (lighting.includes('artificial') || lighting.includes('ambient')) {
      naturalLightBias = 0.3;
    }

    // Determine artificial lighting types
    const artificial: string[] = [];
    if (lighting.includes('ambient')) artificial.push('ambient');
    if (lighting.includes('task')) artificial.push('task');
    if (lighting.includes('accent')) artificial.push('accent');
    if (lighting.includes('indirect')) artificial.push('indirect');
    if (lighting.includes('layered')) {
      artificial.push('ambient', 'task', 'accent');
    }

    // Default if no specific lighting detected
    if (artificial.length === 0) {
      artificial.push('ambient');
    }

    // Determine directionality
    let directionality: 'diffuse' | 'directional' | 'mixed' = 'mixed';
    if (lighting.includes('indirect') || lighting.includes('ambient')) {
      directionality = 'diffuse';
    } else if (lighting.includes('spotlight') || lighting.includes('directional')) {
      directionality = 'directional';
    }

    // Generate lighting sources
    const lightingSources = this.generateLightingSources(artificial, warmth);

    return {
      naturalLightBias,
      artificial,
      directionality,
      mood,
      lightingSources,
    };
  }

  /**
   * Infer lighting mood from warmth
   * @private
   */
  private inferLightingMood(warmth: 'low' | 'medium' | 'high'): string {
    if (warmth === 'high') return 'warm-cozy';
    if (warmth === 'low') return 'bright-energetic';
    return 'soft-relaxing';
  }

  /**
   * Generate lighting source specifications
   * @private
   */
  private generateLightingSources(
    artificial: string[],
    warmth: 'low' | 'medium' | 'high'
  ): Array<{
    type: 'overhead' | 'wall' | 'floor' | 'table' | 'natural';
    intensity: 'low' | 'medium' | 'high';
    color: 'warm' | 'neutral' | 'cool';
  }> {
    const sources: Array<{
      type: 'overhead' | 'wall' | 'floor' | 'table' | 'natural';
      intensity: 'low' | 'medium' | 'high';
      color: 'warm' | 'neutral' | 'cool';
    }> = [];

    // Natural light (always present)
    sources.push({
      type: 'natural',
      intensity: 'medium',
      color: 'neutral',
    });

    // Ambient lighting (overhead)
    if (artificial.includes('ambient')) {
      sources.push({
        type: 'overhead',
        intensity: 'medium',
        color: warmth === 'high' ? 'warm' : warmth === 'low' ? 'cool' : 'neutral',
      });
    }

    // Task lighting (table/floor)
    if (artificial.includes('task')) {
      sources.push({
        type: 'table',
        intensity: 'high',
        color: 'neutral',
      });
    }

    // Accent lighting (wall/floor)
    if (artificial.includes('accent')) {
      sources.push({
        type: 'wall',
        intensity: 'low',
        color: 'warm',
      });
    }

    return sources;
  }

  /**
   * Extract constraints from intent
   * @private
   */
  private extractConstraints(intent: InferredIntent): SpatialConstraints {
    const layoutLocked = intent.changeBoundaries.mustPreserve.length > 0 ||
                        intent.changeBoundaries.canChange.length === 0;

    return {
      layoutLocked,
      preserveElements: intent.changeBoundaries.mustPreserve,
      mustChangeElements: intent.changeBoundaries.canChange,
    };
  }

  /**
   * Calculate overall confidence/readiness score (0-1)
   * @private
   */
  private calculateConfidence(
    roomPlans: Record<string, any>,
    componentPlan: any[],
    intent: InferredIntent,
    hasFloorPlan: boolean
  ): number {
    let confidence = 0;

    // Base confidence from intent
    confidence += intent.confidence * 0.4; // 40% weight

    // Room coverage
    const roomCount = Object.keys(roomPlans).length;
    if (roomCount > 0) {
      confidence += 0.2; // 20% for having rooms
    }

    // Component planning completeness
    if (componentPlan.length > 0) {
      confidence += 0.2; // 20% for having components
    }

    // Floor plan bonus (more reliable geometry)
    if (hasFloorPlan) {
      confidence += 0.1; // 10% bonus
    }

    // Consistency check (all rooms have components)
    const roomsWithComponents = Object.values(roomPlans).filter(
      (room: any) => room.components.primary.length > 0
    ).length;
    const consistencyRatio = roomCount > 0 ? roomsWithComponents / roomCount : 0;
    confidence += consistencyRatio * 0.1; // 10% for consistency

    // Clamp to [0, 1]
    return Math.max(0, Math.min(1, confidence));
  }
}
