import { prisma } from './prisma';

/**
 * Generate a URL-friendly slug from a project name.
 * - Converts to lowercase
 * - Replaces spaces and special chars with hyphens
 * - Collapses consecutive hyphens
 * - Trims leading/trailing hyphens
 *
 * If the slug already exists, appends -2, -3, etc.
 */
export function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')   // Remove special characters
    .replace(/\s+/g, '-')            // Spaces → hyphens
    .replace(/-+/g, '-')             // Collapse consecutive hyphens
    .replace(/^-|-$/g, '')           // Trim leading/trailing hyphens
    || 'project';                    // Fallback if name is all special chars
}

/**
 * Generate a unique slug for a project.
 * Checks the database for duplicates and appends a numeric suffix if needed.
 */
export async function generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
  const baseSlug = nameToSlug(name);

  // Check if baseSlug is available
  const existing = await prisma.project.findUnique({
    where: { slug: baseSlug },
    select: { id: true },
  });

  if (!existing || existing.id === excludeId) {
    return baseSlug;
  }

  // Find the next available suffix
  let suffix = 2;
  while (true) {
    const candidateSlug = `${baseSlug}-${suffix}`;
    const taken = await prisma.project.findUnique({
      where: { slug: candidateSlug },
      select: { id: true },
    });
    if (!taken || taken.id === excludeId) {
      return candidateSlug;
    }
    suffix++;
  }
}

/**
 * Resolve a project identifier that could be either a slug or a UUID.
 * Tries slug first (faster for user-facing URLs), falls back to UUID.
 */
export async function resolveProjectId(idOrSlug: string, userId: string) {
  // Try slug first (most common for user-facing URLs)
  const bySlug = await prisma.project.findFirst({
    where: { slug: idOrSlug, userId, deletedAt: null },
    select: { id: true, slug: true },
  });
  if (bySlug) return bySlug;

  // Fallback: try as UUID (backwards compat)
  const byId = await prisma.project.findFirst({
    where: { id: idOrSlug, userId, deletedAt: null },
    select: { id: true, slug: true },
  });
  return byId;
}
