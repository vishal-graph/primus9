/**
 * TatvaOps Vision - Room 2D Views Types
 *
 * Single view per room: BIRD_VIEW (top-down bird's-eye). Legacy types kept for DB compatibility.
 */

import { RoomElevationGeometry, WallGeometry } from '../elevation/types';

export type Room2DViewType =
  | 'BIRD_VIEW'
  | 'FRONT_WALL'
  | 'BACK_WALL'
  | 'LEFT_WALL'
  | 'RIGHT_WALL'
  | 'CEILING_VIEW';

export interface Room2DViewInput {
  jobId: string;
  projectId: string;
  roomId: string;
  userId: string;
  roomGeometry: RoomElevationGeometry;
  moodboardUrl: string;
  connectedRooms: string[];
  isometricUrl?: string;
  version?: number;
}

export interface Room2DViewOutput {
  viewType: Room2DViewType;
  imageData: string;
  mimeType: string;
  geometryHash: string;
  styleHash: string;
  promptHash: string;
  durationMs: number;
  wallType?: 'solid' | 'partial' | 'open';
  wallGeometry?: WallGeometry;
}

export interface Room2DViewsResult {
  views: Room2DViewOutput[];
}
