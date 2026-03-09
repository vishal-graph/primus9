/**
 * Room Types
 * Defines room-level types and configurations
 */

export type RoomStatus = 'PENDING' | 'CONFIRMED' | 'LOCKED';

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

export interface RoomGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  polygon?: Array<{ x: number; y: number }>;
}

export interface Room {
  id: string;
  projectId: string;
  name: string;
  type: RoomType;
  geometry: RoomGeometry;
  status: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomWithAssets extends Room {
  moodboard?: RoomMoodboard;
  elevation?: RoomElevation;
  interiorView?: RoomInteriorView;
  components?: RoomComponent[];
}

export interface RoomMoodboard {
  id: string;
  roomId: string;
  imageUrl: string;
  style: string;
  colorPalette: string[];
  version: number;
  createdAt: Date;
}

export interface RoomElevation {
  id: string;
  roomId: string;
  walls: WallElevation[];
  version: number;
  createdAt: Date;
}

export interface WallElevation {
  wallId: string;
  direction: 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
  imageUrl: string;
}

export interface RoomInteriorView {
  id: string;
  roomId: string;
  imageUrl: string;
  viewAngle: number;
  version: number;
  createdAt: Date;
}

export interface RoomComponent {
  id: string;
  roomId: string;
  componentType: ComponentType;
  style: string;
  size: ComponentSize;
  material: string;
  position: { x: number; y: number; z?: number };
  createdAt: Date;
}

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

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  LIVING_ROOM: 'Living Room',
  BEDROOM: 'Bedroom',
  KITCHEN: 'Kitchen',
  BATHROOM: 'Bathroom',
  DINING: 'Dining Room',
  OFFICE: 'Home Office',
  BALCONY: 'Balcony',
  HALLWAY: 'Hallway',
  STORAGE: 'Storage',
  OTHER: 'Other',
};

