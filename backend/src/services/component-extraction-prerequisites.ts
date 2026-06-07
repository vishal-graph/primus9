import { prisma } from '../lib/prisma';

export type ComponentExtractionPrerequisiteResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * COMPONENT_EXTRACTION needs moodboard + project isometric + room BIRD_VIEW in storage.
 */
export async function validateComponentExtractionPrerequisites(
  projectId: string,
  roomId: string
): Promise<ComponentExtractionPrerequisiteResult> {
  const room = await prisma.room.findFirst({
    where: { id: roomId, projectId },
    select: { id: true, name: true },
  });
  if (!room) {
    return { ok: false, message: 'Room not found for this project.' };
  }

  const moodboard = await prisma.roomMoodboard.findFirst({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    select: { s3Key: true },
  });
  if (!moodboard?.s3Key) {
    return {
      ok: false,
      message: `Generate a moodboard for ${room.name} first (Moodboard stage).`,
    };
  }

  const isometric = await prisma.isometricFloorElevation.findFirst({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    select: { s3Key: true },
  });
  if (!isometric?.s3Key) {
    return {
      ok: false,
      message: 'Generate the 3D isometric elevation first (Elevation stage).',
    };
  }

  const birdView = await prisma.room2DView.findFirst({
    where: { roomId, viewType: 'BIRD_VIEW' },
    orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
    select: { s3Key: true },
  });
  if (!birdView?.s3Key) {
    return {
      ok: false,
      message: `Generate the 2D bird's-eye view for ${room.name} first (2D Views stage).`,
    };
  }

  return { ok: true };
}
