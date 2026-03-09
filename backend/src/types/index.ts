/**
 * Backend Type Definitions
 */

// Re-export Prisma types when client is generated
// export type { User, Project, Room, ... } from '@prisma/client';

// API Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

// Pagination
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Job Types
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

export interface AIJobData {
  userId: string;
  projectId: string;
  roomId?: string;
  [key: string]: unknown;
}

// Project Types
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

// Room Types
export type RoomType =
  | 'LIVING_ROOM'
  | 'BEDROOM'
  | 'KITCHEN'
  | 'BATHROOM'
  | 'DINING'
  | 'OFFICE'
  | 'BALCONY'
  | 'HALLWAY'
  | 'STORAGE'
  | 'OTHER';

export type RoomStatus = 'PENDING' | 'CONFIRMED' | 'LOCKED';

// Component Types
export type ComponentType =
  | 'SOFA'
  | 'TV'
  | 'BED'
  | 'TABLE'
  | 'LIGHT'
  | 'CHAIR'
  | 'CABINET'
  | 'RUG'
  | 'PLANT'
  | 'ART';

export type ComponentSize = 'S' | 'M' | 'L' | 'XL';

// User Types
export type UserPlan = 'FREE' | 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';

