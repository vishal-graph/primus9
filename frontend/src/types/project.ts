/**
 * Project Types
 * Defines the core project state and progression types
 */

export type ProjectStage =
  | 'FLOOR_PLAN'
  | 'INTENT'
  | 'MOODBOARD'
  | 'ELEVATION'
  | 'TWO_D_VIEWS'
  | 'INTERIOR'
  | 'COMPONENT'
  | 'ROOM_WALKTHROUGH'
  | 'EXPORT';

export interface Project {
  id: string;
  userId: string;
  slug?: string;
  name: string;
  currentStage: ProjectStage;
  createdAt: Date;
  updatedAt: Date;
  metadata?: ProjectMetadata;
}

export interface ProjectMetadata {
  floorPlanUrl?: string;
  totalRooms?: number;
  completedRooms?: number;
  lastGenerationAt?: Date;
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  stage: ProjectStage;
  version: number;
  snapshot: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateProjectInput {
  name: string;
  floorPlanFile?: File;
}

export interface UpdateProjectInput {
  name?: string;
  currentStage?: ProjectStage;
}

/**
 * Stage configuration for non-linear flow
 */
export interface StageConfig {
  stage: ProjectStage;
  label: string;
  description: string;
  icon: string;
  requiresPreviousStage: boolean;
  allowsPartialCompletion: boolean;
}

export const STAGE_CONFIGS: StageConfig[] = [
  {
    stage: 'FLOOR_PLAN',
    label: 'Floor Plan',
    description: 'Upload and analyze your floor plan',
    icon: 'layout',
    requiresPreviousStage: false,
    allowsPartialCompletion: false,
  },
  {
    stage: 'INTENT',
    label: 'Design Intent',
    description: 'Define your design preferences and style',
    icon: 'palette',
    requiresPreviousStage: true,
    allowsPartialCompletion: true,
  },
  {
    stage: 'MOODBOARD',
    label: 'Moodboard',
    description: 'Generate AI-powered moodboards for each room',
    icon: 'image',
    requiresPreviousStage: true,
    allowsPartialCompletion: true,
  },
  {
    stage: 'ELEVATION',
    label: 'Elevations',
    description: 'Create wall elevations and layouts',
    icon: 'layers',
    requiresPreviousStage: true,
    allowsPartialCompletion: true,
  },
  {
    stage: 'TWO_D_VIEWS',
    label: '2D Views',
    description: 'Generate 5-point room views',
    icon: 'image',
    requiresPreviousStage: true,
    allowsPartialCompletion: true,
  },
  {
    stage: 'COMPONENT',
    label: 'Components',
    description: 'Fine-tune individual furniture and elements',
    icon: 'settings',
    requiresPreviousStage: true,
    allowsPartialCompletion: true,
  },
  {
    stage: 'ROOM_WALKTHROUGH',
    label: 'Walkthrough',
    description: 'Generate room walkthrough videos',
    icon: 'videocam',
    requiresPreviousStage: true,
    allowsPartialCompletion: true,
  },
  {
    stage: 'INTERIOR',
    label: 'Interior Views',
    description: 'Generate 3D interior visualizations',
    icon: 'box',
    requiresPreviousStage: true,
    allowsPartialCompletion: true,
  },
  {
    stage: 'EXPORT',
    label: 'Export',
    description: 'Download your complete design package',
    icon: 'download',
    requiresPreviousStage: true,
    allowsPartialCompletion: false,
  },
];

