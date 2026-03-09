import { Router } from 'express';
import { clerkWebhook } from './clerk';
import { razorpayWebhook } from './razorpay';

const router = Router();

/**
 * Webhook Routes
 * These endpoints verify signatures and process external events
 */

// Clerk user events
router.post('/clerk', clerkWebhook);

// Razorpay payment events
router.post('/razorpay', razorpayWebhook);

export { router as webhooksRouter };

