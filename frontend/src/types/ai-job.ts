/**
 * AI Job Types
 * Defines async AI processing job types and states
 */

export type AIJobType =
  | 'FLOORPLAN_ANALYSIS'
  | 'MOODBOARD'
  | 'ELEVATION'
  | 'TWO_D_VIEWS'
  | 'COMPONENT_EXTRACTION'
  | 'ROOM_WALKTHROUGH'
  | 'INTERIOR'
  | 'COMPONENT_UPDATE';

export type AIJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface AIJob {
  id: string;
  type: AIJobType;
  status: AIJobStatus;
  payload: AIJobPayload;
  result?: AIJobResult;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  error?: string;
}

export type AIJobPayload =
  | FloorPlanAnalysisPayload
  | MoodboardPayload
  | ElevationPayload
  | TwoDViewsPayload
  | ComponentExtractionPayload
  | WalkthroughPayload
  | InteriorPayload
  | ComponentUpdatePayload;

export interface FloorPlanAnalysisPayload {
  projectId: string;
  imageUrl: string;
}

export interface MoodboardPayload {
  projectId: string;
  roomId: string;
  style: string;
  preferences: DesignPreferences;
}

export interface ElevationPayload {
  projectId: string;
  roomId: string;
  moodboardId: string;
  walls: string[];
}

export interface TwoDViewsPayload {
  projectId: string;
  roomId: string;
  version?: number;
}

export interface ComponentExtractionPayload {
  projectId: string;
  roomId: string;
  version?: number;
}

export interface WalkthroughPayload {
  projectId: string;
  roomId: string;
  version?: number;
}

export interface InteriorPayload {
  projectId: string;
  roomId: string;
  elevationId: string;
  viewAngle: number;
}

export interface ComponentUpdatePayload {
  projectId: string;
  roomId: string;
  componentId: string;
  changes: Partial<ComponentConfig>;
}

export interface DesignPreferences {
  style: string;
  colorScheme: string[];
  budget: 'LOW' | 'MEDIUM' | 'HIGH' | 'LUXURY';
  priorities: string[];
}

export interface ComponentConfig {
  componentType: string;
  style: string;
  size: string;
  material: string;
}

export type AIJobResult =
  | FloorPlanAnalysisResult
  | MoodboardResult
  | ElevationResult
  | TwoDViewsResult
  | ComponentExtractionResult
  | WalkthroughResult
  | InteriorResult
  | ComponentUpdateResult;

export interface ComponentExtractionResult {
  roomId: string;
  roomName: string;
  rowCount: number;
  s3Key: string;
}

export interface FloorPlanAnalysisResult {
  rooms: Array<{
    name: string;
    type: string;
    geometry: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  totalArea: number;
  confidence: number;
}

export interface MoodboardResult {
  imageUrl: string;
  colorPalette: string[];
  suggestedStyles: string[];
}

export interface ElevationResult {
  walls: Array<{
    wallId: string;
    imageUrl: string;
    direction: string;
  }>;
}

export interface TwoDViewsResult {
  views: Array<{
    viewType: string;
    imageUrl: string;
  }>;
}

export interface WalkthroughResult {
  roomId: string;
  s3Key: string;
  resolution: string;
  durationSeconds: number;
  generationTimeMs?: number;
}

export interface InteriorResult {
  imageUrl: string;
  alternateViews?: string[];
}

export interface ComponentUpdateResult {
  updatedImageUrl: string;
  componentPosition: { x: number; y: number; z: number };
}

/**
 * Job polling configuration
 */
export const JOB_POLL_INTERVAL = 2000; // 2 seconds
export const JOB_MAX_POLL_ATTEMPTS = 150; // 5 minutes max

