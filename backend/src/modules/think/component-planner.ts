/**
 * TatvaOps Vision - Component Planner
 * 
 * Decides component placement rules (logical, not coordinate-level)
 * Determines WHAT goes WHERE and HOW IMPORTANT it is
 */

import { InferredIntent } from '../sense/sense.types';
import { ComponentPlacementPlan, RoomSpatialPlan } from './think.types';
import { logger } from '../../lib/logger';

export class ComponentPlanner {
  /**
   * Plan component placement across all rooms
   * @param intent - AI-inferred intent from Sense Layer
   * @param roomPlans - Room-specific spatial plans
   * @returns Array of component placement plans
   */
  async planComponents(
    intent: InferredIntent,
    roomPlans: Record<string, RoomSpatialPlan>
  ): Promise<ComponentPlacementPlan[]> {
    logger.debug('Planning component placement', {
      roomCount: Object.keys(roomPlans).length,
    });

    const componentPlans: ComponentPlacementPlan[] = [];

    // For each room, create placement plans for its components
    for (const [roomId, roomPlan] of Object.entries(roomPlans)) {
      // Primary components (highest priority)
      for (const component of roomPlan.components.primary) {
        componentPlans.push(
          this.createPlacementPlan(component, 'primary', intent, roomPlan)
        );
      }

      // Secondary components
      for (const component of roomPlan.components.secondary) {
        componentPlans.push(
          this.createPlacementPlan(component, 'secondary', intent, roomPlan)
        );
      }

      // Ambient components (lowest priority)
      for (const component of roomPlan.components.ambient) {
        componentPlans.push(
          this.createPlacementPlan(component, 'ambient', intent, roomPlan)
        );
      }
    }

    logger.info('Component placement planning complete', {
      totalComponents: componentPlans.length,
      primaryCount: componentPlans.filter(c => c.visualHierarchy >= 8).length,
      secondaryCount: componentPlans.filter(c => c.visualHierarchy >= 5 && c.visualHierarchy < 8).length,
      ambientCount: componentPlans.filter(c => c.visualHierarchy < 5).length,
    });

    return componentPlans;
  }

  /**
   * Create a placement plan for a single component
   * @private
   */
  private createPlacementPlan(
    componentType: string,
    hierarchy: 'primary' | 'secondary' | 'ambient',
    intent: InferredIntent,
    roomPlan: RoomSpatialPlan
  ): ComponentPlacementPlan {
    const componentCategory = this.categorizeComponent(componentType);
    const placementRule = this.determinePlacementRule(componentType, hierarchy, roomPlan);
    const constraints = this.generateConstraints(componentType, intent, roomPlan);
    const visualHierarchy = this.calculateVisualHierarchy(hierarchy, componentCategory);
    const quantity = this.inferQuantity(componentType, roomPlan);

    return {
      componentType,
      componentCategory,
      placementRule,
      constraints,
      visualHierarchy,
      quantity,
    };
  }

  /**
   * Categorize component into furniture, lighting, decor, or fixture
   * @private
   */
  private categorizeComponent(componentType: string): 'furniture' | 'lighting' | 'decor' | 'fixture' {
    const componentLower = componentType.toLowerCase();

    // Lighting
    if (componentLower.includes('light') || componentLower.includes('lamp') || componentLower.includes('chandelier')) {
      return 'lighting';
    }

    // Fixtures (built-in elements)
    if (componentLower.includes('cabinet') || componentLower.includes('countertop') || 
        componentLower.includes('sink') || componentLower.includes('vanity') || 
        componentLower.includes('backsplash')) {
      return 'fixture';
    }

    // Decor
    if (componentLower.includes('art') || componentLower.includes('plant') || 
        componentLower.includes('rug') || componentLower.includes('curtain') || 
        componentLower.includes('pillow') || componentLower.includes('decor') ||
        componentLower.includes('centerpiece')) {
      return 'decor';
    }

    // Default to furniture
    return 'furniture';
  }

  /**
   * Determine placement rule for component
   * @private
   */
  private determinePlacementRule(
    componentType: string,
    hierarchy: 'primary' | 'secondary' | 'ambient',
    roomPlan: RoomSpatialPlan
  ): 'anchor' | 'distributed' | 'focal' | 'perimeter' {
    const componentLower = componentType.toLowerCase();

    // Primary furniture typically anchors the space
    if (hierarchy === 'primary') {
      if (componentLower.includes('sofa') || componentLower.includes('bed') || componentLower.includes('desk')) {
        return 'anchor';
      }
      if (componentLower.includes('table') && componentLower.includes('dining')) {
        return 'focal';
      }
    }

    // Lighting is often distributed
    if (componentLower.includes('light') && !componentLower.includes('chandelier')) {
      return 'distributed';
    }

    // Storage and cabinets go on perimeter
    if (componentLower.includes('cabinet') || componentLower.includes('wardrobe') || 
        componentLower.includes('shelf') || componentLower.includes('storage')) {
      return 'perimeter';
    }

    // Accent/focal pieces
    if (componentLower.includes('art') || componentLower.includes('chandelier')) {
      return 'focal';
    }

    // Default based on hierarchy
    if (hierarchy === 'primary') return 'anchor';
    if (hierarchy === 'secondary') return 'distributed';
    return 'distributed';
  }

  /**
   * Generate placement constraints for component
   * @private
   */
  private generateConstraints(
    componentType: string,
    intent: InferredIntent,
    roomPlan: RoomSpatialPlan
  ): string[] {
    const constraints: string[] = [];
    const componentLower = componentType.toLowerCase();

    // Layout constraints
    if (roomPlan.layoutLocked) {
      constraints.push('layout_locked');
    }

    // Component-specific constraints
    if (componentLower.includes('sofa') || componentLower.includes('cabinet')) {
      constraints.push('against_wall');
    }

    if (componentLower.includes('desk') && roomPlan.geometrySource === 'floor_plan') {
      constraints.push('near_window', 'against_wall');
    }

    if (componentLower.includes('bed')) {
      constraints.push('against_wall', 'headboard_centered');
    }

    if (componentLower.includes('dining_table') || componentLower.includes('coffee_table')) {
      constraints.push('centered');
    }

    if (componentLower.includes('plant') || componentLower.includes('lighting')) {
      constraints.push('good_light_access');
    }

    // Preserve constraints from intent
    if (intent.changeBoundaries.mustPreserve.includes(componentType)) {
      constraints.push('preserve_existing');
    }

    // Density-based constraints
    if (roomPlan.density === 'sparse') {
      constraints.push('minimal_footprint');
    }

    return constraints;
  }

  /**
   * Calculate visual hierarchy score (1-10)
   * @private
   */
  private calculateVisualHierarchy(
    hierarchy: 'primary' | 'secondary' | 'ambient',
    category: 'furniture' | 'lighting' | 'decor' | 'fixture'
  ): number {
    let baseScore = 5;

    // Hierarchy adjustment
    if (hierarchy === 'primary') {
      baseScore = 9;
    } else if (hierarchy === 'secondary') {
      baseScore = 6;
    } else {
      baseScore = 3;
    }

    // Category adjustment
    if (category === 'furniture' && hierarchy === 'primary') {
      baseScore = 10; // Primary furniture is most important
    }

    if (category === 'lighting') {
      baseScore = Math.min(baseScore + 1, 10); // Lighting is always important
    }

    if (category === 'decor' && hierarchy === 'ambient') {
      baseScore = Math.max(baseScore - 1, 1); // Ambient decor is least critical
    }

    return baseScore;
  }

  /**
   * Infer quantity of component needed
   * @private
   */
  private inferQuantity(
    componentType: string,
    roomPlan: RoomSpatialPlan
  ): number {
    const componentLower = componentType.toLowerCase();

    // Singles (one per room)
    if (componentLower.includes('sofa') || componentLower.includes('bed') || 
        componentLower.includes('wardrobe') || componentLower.includes('desk')) {
      return 1;
    }

    // Pairs
    if (componentLower.includes('nightstand') || componentLower.includes('side_table')) {
      return 2;
    }

    // Multiples based on density
    if (componentLower.includes('chair')) {
      if (componentLower.includes('dining')) {
        return 4; // Standard dining set
      }
      if (componentLower.includes('accent')) {
        return roomPlan.density === 'dense' ? 2 : 1;
      }
    }

    if (componentLower.includes('plant') || componentLower.includes('art')) {
      if (roomPlan.density === 'sparse') return 1;
      if (roomPlan.density === 'medium') return 2;
      return 3;
    }

    if (componentLower.includes('pillow') || componentLower.includes('cushion')) {
      if (roomPlan.density === 'sparse') return 2;
      if (roomPlan.density === 'medium') return 4;
      return 6;
    }

    // Default quantity
    return 1;
  }
}
