import { Request, Response } from 'express';
import { Webhook } from 'svix';
import { config } from '../../config';
import { logger } from '../../lib/logger';

/**
 * Clerk Webhook Handler
 * Syncs Clerk users with our database
 * 
 * TODO: Implement user sync logic
 * TODO: Handle user deletion
 */

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses: Array<{ email_address: string }>;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
}

export async function clerkWebhook(req: Request, res: Response) {
  const requestId = req.headers['x-request-id'] as string;

  // Verify webhook signature
  if (!config.clerkWebhookSecret) {
    logger.warn({ requestId }, 'Clerk webhook secret not configured');
    return res.status(400).json({ error: 'Webhook not configured' });
  }

  const svixId = req.headers['svix-id'] as string;
  const svixTimestamp = req.headers['svix-timestamp'] as string;
  const svixSignature = req.headers['svix-signature'] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    return res.status(400).json({ error: 'Missing webhook headers' });
  }

  try {
    const wh = new Webhook(config.clerkWebhookSecret);
    const payload = JSON.stringify(req.body);
    
    const event = wh.verify(payload, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent;

    logger.info({ requestId, type: event.type }, 'Clerk webhook received');

    switch (event.type) {
      case 'user.created':
        await handleUserCreated(event.data);
        break;
      case 'user.updated':
        await handleUserUpdated(event.data);
        break;
      case 'user.deleted':
        await handleUserDeleted(event.data.id);
        break;
      default:
        logger.info({ requestId, type: event.type }, 'Unhandled Clerk event type');
    }

    return res.json({ received: true });
  } catch (error) {
    logger.error({ requestId, error }, 'Clerk webhook verification failed');
    return res.status(400).json({ error: 'Invalid signature' });
  }
}

async function handleUserCreated(data: ClerkWebhookEvent['data']) {
  // TODO: Create user in database
  // await prisma.user.create({
  //   data: {
  //     clerkId: data.id,
  //     email: data.email_addresses[0]?.email_address,
  //     name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
  //     avatarUrl: data.image_url,
  //     plan: 'FREE',
  //   },
  // });
  logger.info({ clerkId: data.id }, 'User created placeholder');
}

async function handleUserUpdated(data: ClerkWebhookEvent['data']) {
  // TODO: Update user in database
  // await prisma.user.update({
  //   where: { clerkId: data.id },
  //   data: {
  //     email: data.email_addresses[0]?.email_address,
  //     name: `${data.first_name || ''} ${data.last_name || ''}`.trim(),
  //     avatarUrl: data.image_url,
  //   },
  // });
  logger.info({ clerkId: data.id }, 'User updated placeholder');
}

async function handleUserDeleted(clerkId: string) {
  // TODO: Soft delete or anonymize user
  // await prisma.user.update({
  //   where: { clerkId },
  //   data: { deletedAt: new Date() },
  // });
  logger.info({ clerkId }, 'User deleted placeholder');
}

