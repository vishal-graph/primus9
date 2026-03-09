/**
 * Anomaly Detection Service
 * 
 * Detects suspicious patterns in user behavior:
 * - Regeneration abuse
 * - Project hoarding
 * - Burst activity
 * 
 * Thresholds based on industry standards + 25% buffer
 */

import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';

// ============================================
// THRESHOLDS (Industry Standards + 25% Buffer)
// ============================================

export const ANOMALY_THRESHOLDS = {
  REGEN_ABUSE: {
    LOW: 10,
    MEDIUM: 15,
    HIGH: 20,
  },
  PROJECT_HOARDING: {
    LOW: 12,
    MEDIUM: 20,
    HIGH: 30,
    TIME_WINDOW_HOURS: 24,
  },
  BURST_ACTIVITY: {
    LOW: 40,
    MEDIUM: 75,
    HIGH: 125,
    TIME_WINDOW_HOURS: 1,
  },
  PLAN_ABUSE: {
    LOW: 0.75,
    MEDIUM: 0.85,
    HIGH: 0.95,
  },
};

// ============================================
// TYPES
// ============================================

export type AnomalyType = 
  | 'REGEN_ABUSE' 
  | 'PROJECT_HOARDING' 
  | 'BURST_ACTIVITY' 
  | 'PLAN_ABUSE';

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AnomalyFlag {
  type: AnomalyType;
  severity: AnomalySeverity;
  details: string;
  value: number;
  threshold: number;
}

// ============================================
// DETECTION FUNCTIONS
// ============================================

/**
 * Detect regeneration abuse
 * Checks if user has excessive regenerations per project
 */
export async function detectRegenAbuse(userId: string): Promise<AnomalyFlag | null> {
  try {
    // Get average regenerations per project
    const projects = await prisma.project.findMany({
      where: { 
        userId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            aiJobs: {
              where: {
                type: {
                  in: [
                    'MOODBOARD',
                    'ELEVATION',
                    'TWO_D_VIEWS',
                    'COMPONENT_EXTRACTION',
                    'INTERIOR',
                    'INTERIOR_ISOMETRIC',
                  ],
                },
                status: 'COMPLETED',
              },
            },
          },
        },
      },
    });

    if (projects.length === 0) return null;

    // Get regeneration counts from RegenerationLog
    const regenLogs = await prisma.regenerationLog.findMany({
      where: { userId },
    });

    const totalRegens = regenLogs.reduce((sum, log) => sum + log.count, 0);
    const avgRegensPerProject = totalRegens / projects.length;

    const { LOW, MEDIUM, HIGH } = ANOMALY_THRESHOLDS.REGEN_ABUSE;

    if (avgRegensPerProject >= HIGH) {
      return {
        type: 'REGEN_ABUSE',
        severity: 'HIGH',
        details: `${avgRegensPerProject.toFixed(1)} regens/project (critical threshold exceeded)`,
        value: avgRegensPerProject,
        threshold: HIGH,
      };
    } else if (avgRegensPerProject >= MEDIUM) {
      return {
        type: 'REGEN_ABUSE',
        severity: 'MEDIUM',
        details: `${avgRegensPerProject.toFixed(1)} regens/project (elevated regeneration rate)`,
        value: avgRegensPerProject,
        threshold: MEDIUM,
      };
    } else if (avgRegensPerProject >= LOW) {
      return {
        type: 'REGEN_ABUSE',
        severity: 'LOW',
        details: `${avgRegensPerProject.toFixed(1)} regens/project (above normal usage)`,
        value: avgRegensPerProject,
        threshold: LOW,
      };
    }

    return null;
  } catch (error) {
    logger.error({ error, userId }, 'Error detecting regen abuse');
    return null;
  }
}

/**
 * Detect project hoarding
 * Many projects created in short time
 */
export async function detectProjectHoarding(userId: string): Promise<AnomalyFlag | null> {
  try {
    const { LOW, MEDIUM, HIGH, TIME_WINDOW_HOURS } = ANOMALY_THRESHOLDS.PROJECT_HOARDING;
    
    const timeWindow = new Date();
    timeWindow.setHours(timeWindow.getHours() - TIME_WINDOW_HOURS);

    const projectsInWindow = await prisma.project.count({
      where: {
        userId,
        createdAt: {
          gte: timeWindow,
        },
        deletedAt: null,
      },
    });

    if (projectsInWindow >= HIGH) {
      return {
        type: 'PROJECT_HOARDING',
        severity: 'HIGH',
        details: `${projectsInWindow} projects created in ${TIME_WINDOW_HOURS}h (excessive creation rate)`,
        value: projectsInWindow,
        threshold: HIGH,
      };
    } else if (projectsInWindow >= MEDIUM) {
      return {
        type: 'PROJECT_HOARDING',
        severity: 'MEDIUM',
        details: `${projectsInWindow} projects created in ${TIME_WINDOW_HOURS}h (rapid creation)`,
        value: projectsInWindow,
        threshold: MEDIUM,
      };
    } else if (projectsInWindow >= LOW) {
      return {
        type: 'PROJECT_HOARDING',
        severity: 'LOW',
        details: `${projectsInWindow} projects created in ${TIME_WINDOW_HOURS}h (above average)`,
        value: projectsInWindow,
        threshold: LOW,
      };
    }

    return null;
  } catch (error) {
    logger.error({ error, userId }, 'Error detecting project hoarding');
    return null;
  }
}

/**
 * Detect burst activity
 * Excessive generations in short time
 */
export async function detectBurstActivity(userId: string): Promise<AnomalyFlag | null> {
  try {
    const { LOW, MEDIUM, HIGH, TIME_WINDOW_HOURS } = ANOMALY_THRESHOLDS.BURST_ACTIVITY;
    
    const timeWindow = new Date();
    timeWindow.setHours(timeWindow.getHours() - TIME_WINDOW_HOURS);

    const gensInWindow = await prisma.aIJob.count({
      where: {
        userId,
        type: {
          in: [
            'MOODBOARD',
            'ELEVATION',
            'TWO_D_VIEWS',
            'COMPONENT_EXTRACTION',
            'INTERIOR',
            'INTERIOR_ISOMETRIC',
          ],
        },
        createdAt: {
          gte: timeWindow,
        },
      },
    });

    if (gensInWindow >= HIGH) {
      return {
        type: 'BURST_ACTIVITY',
        severity: 'HIGH',
        details: `${gensInWindow} generations in ${TIME_WINDOW_HOURS}h (extreme burst)`,
        value: gensInWindow,
        threshold: HIGH,
      };
    } else if (gensInWindow >= MEDIUM) {
      return {
        type: 'BURST_ACTIVITY',
        severity: 'MEDIUM',
        details: `${gensInWindow} generations in ${TIME_WINDOW_HOURS}h (high burst)`,
        value: gensInWindow,
        threshold: MEDIUM,
      };
    } else if (gensInWindow >= LOW) {
      return {
        type: 'BURST_ACTIVITY',
        severity: 'LOW',
        details: `${gensInWindow} generations in ${TIME_WINDOW_HOURS}h (elevated activity)`,
        value: gensInWindow,
        threshold: LOW,
      };
    }

    return null;
  } catch (error) {
    logger.error({ error, userId }, 'Error detecting burst activity');
    return null;
  }
}

/**
 * Detect all anomalies for a user
 * Returns array of detected anomaly flags
 */
export async function detectUserAnomalies(userId: string): Promise<AnomalyFlag[]> {
  try {
    const [regenAbuse, projectHoarding, burstActivity] = await Promise.all([
      detectRegenAbuse(userId),
      detectProjectHoarding(userId),
      detectBurstActivity(userId),
    ]);

    const anomalies: AnomalyFlag[] = [];
    
    if (regenAbuse) anomalies.push(regenAbuse);
    if (projectHoarding) anomalies.push(projectHoarding);
    if (burstActivity) anomalies.push(burstActivity);

    return anomalies;
  } catch (error) {
    logger.error({ error, userId }, 'Error detecting user anomalies');
    return [];
  }
}

