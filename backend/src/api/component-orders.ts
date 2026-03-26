import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { errors } from '../lib/error-handler';
import { Decimal } from '@prisma/client/runtime/library';

const router = Router({ mergeParams: true });

const componentOrderItemSchema = z.object({
  componentCategory: z.string().optional(),
  componentName: z.string(),
  description: z.string().optional(),
  material: z.string().optional(),
  finishColor: z.string().optional(),
  approximateSize: z.string().optional(),
  placement: z.string().optional(),
  materialCost: z.union([z.number(), z.string()]).optional(),
  labourCost: z.union([z.number(), z.string()]).optional(),
  totalCost: z.union([z.number(), z.string()]).optional(),
  calculation: z.string().optional(),
  notes: z.string().optional(),
});

const createComponentOrderSchema = z.object({
  roomId: z.string().uuid(),
  items: z.array(componentOrderItemSchema).min(1),
  metadata: z
    .object({
      deliveryAddress: z.string().optional(),
      contactNotes: z.string().optional(),
    })
    .optional(),
});

function parseCost(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const n = typeof value === 'number' ? value : Number(String(value).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * GET /api/projects/:id/component-orders
 * List component orders for the project. Optional ?roomId= to filter by room.
 * Returns latest order per room when no roomId specified (for UI "ordered" badges).
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const projectId = req.params.id as string;
    const roomId = req.query.roomId as string | undefined;

    if (!projectId) {
      throw errors.badRequest('Project ID required');
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!project) {
      throw errors.notFound('Project');
    }

    const where: { projectId: string; userId: string; roomId?: string } = {
      projectId,
      userId,
    };
    if (roomId) where.roomId = roomId;

    const orders = await prisma.componentOrder.findMany({
      where,
      include: {
        room: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: roomId ? 1 : 50,
    });

    const data = orders.map((o) => ({
      orderId: o.id,
      roomId: o.roomId,
      roomName: o.room.name,
      status: o.status,
      grandTotal: o.grandTotal ? Number(o.grandTotal) : 0,
      createdAt: o.createdAt,
    }));

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:id/component-orders/:orderId
 * Fetch a single component order (for receipt display).
 */
router.get('/:orderId', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const projectId = req.params.id as string;
    const orderId = req.params.orderId as string;

    if (!projectId || !orderId) {
      throw errors.badRequest('Project ID and Order ID required');
    }

    const order = await prisma.componentOrder.findFirst({
      where: {
        id: orderId,
        projectId,
        userId,
      },
      include: {
        project: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
      },
    });

    if (!order) {
      throw errors.notFound('Order');
    }

    const items = (order.items || []) as Array<Record<string, unknown>>;
    res.json({
      success: true,
      data: {
        orderId: order.id,
        status: order.status,
        projectName: order.project.name,
        roomName: order.room.name,
        items,
        totalMaterial: order.totalMaterial ? Number(order.totalMaterial) : 0,
        totalLabour: order.totalLabour ? Number(order.totalLabour) : 0,
        grandTotal: order.grandTotal ? Number(order.grandTotal) : 0,
        metadata: order.metadata,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:projectId/component-orders
 * Create a component order (request) for a room's extracted components.
 */
router.post('/', async (req, res, next) => {
  try {
    const userId = req.userId!;
    const projectId = req.params.id as string;
    if (!projectId) {
      throw errors.badRequest('Project ID required');
    }

    const parsed = createComponentOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      throw errors.badRequest(parsed.error.message);
    }
    const { roomId, items, metadata } = parsed.data;

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!project) {
      throw errors.notFound('Project');
    }

    const room = await prisma.room.findFirst({
      where: { id: roomId, projectId },
      select: { id: true, name: true },
    });
    if (!room) {
      throw errors.notFound('Room');
    }

    let totalMaterial = 0;
    let totalLabour = 0;
    for (const item of items) {
      totalMaterial += parseCost(item.materialCost);
      totalLabour += parseCost(item.labourCost);
    }
    const grandTotal = totalMaterial + totalLabour;

    const order = await prisma.componentOrder.create({
      data: {
        projectId,
        roomId,
        userId,
        items: items as object[],
        totalMaterial: new Decimal(totalMaterial),
        totalLabour: new Decimal(totalLabour),
        grandTotal: new Decimal(grandTotal),
        metadata: metadata ? (metadata as object) : undefined,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        orderId: order.id,
        status: order.status,
        totalMaterial,
        totalLabour,
        grandTotal,
        createdAt: order.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
