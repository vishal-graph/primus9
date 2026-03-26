import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { verifyToken } from '../middleware/verify-token';

const router = Router();

// ============================================================
// Validation Schemas
// ============================================================

const step1Schema = z.object({
  phoneNumber: z.string().min(10).max(15),
  whatsappSame: z.boolean(),
  whatsappNumber: z.string().min(10).max(15).optional(),
});

const step2Schema = z.object({
  locationLat: z.number(),
  locationLng: z.number(),
  formattedAddress: z.string().min(1),
  pincode: z.string().min(4).max(10),
});

const step3Schema = z.object({
  persona: z.enum(['HOMEOWNER', 'INTERIOR_DESIGNER', 'REAL_ESTATE_DEVELOPER', 'CONTRACTOR']),
});

const step4Schema = z.object({
  companyName: z.string().min(1).optional(),
  portfolioLink: z.string().url().optional().or(z.literal('')),
  monthlyProjectVolume: z.enum(['1-3', '4-10', '10+']).optional(),
  gstNumber: z.string().optional(),
  businessPhone: z.string().min(10).max(15).optional(),
  businessLocationLat: z.number().optional(),
  businessLocationLng: z.number().optional(),
  businessAddress: z.string().optional(),
});

const completeOnboardingSchema = z.object({
  // Step 1
  phoneNumber: z.string().min(10).max(15),
  whatsappNumber: z.string().min(10).max(15).optional(),

  // Step 2
  locationLat: z.number(),
  locationLng: z.number(),
  formattedAddress: z.string().min(1),
  pincode: z.string().min(4).max(10),

  // Step 3
  persona: z.enum(['HOMEOWNER', 'INTERIOR_DESIGNER', 'REAL_ESTATE_DEVELOPER', 'CONTRACTOR']),

  // Step 4 (optional — only for non-homeowners)
  businessProfile: z.object({
    companyName: z.string().optional(),
    portfolioLink: z.string().optional(),
    monthlyProjectVolume: z.enum(['1-3', '4-10', '10+']).optional(),
    gstNumber: z.string().optional(),
    businessPhone: z.string().optional(),
    businessLocationLat: z.number().optional(),
    businessLocationLng: z.number().optional(),
    businessAddress: z.string().optional(),
  }).optional(),
});

// ============================================================
// ROUTE: GET /onboarding/status
// Returns onboarding completion status for current user
// ============================================================

router.get('/status', verifyToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.tokenPayload!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        onboardingCompleted: true,
        persona: true,
        // Step 1 data
        phoneNumber: true,
        whatsappNumber: true,
        // Step 2 data
        locationLat: true,
        locationLng: true,
        formattedAddress: true,
        pincode: true,
        // Legacy fields (old Clerk profile data — used for pre-population)
        phone: true,
        location: true,
        company: true,
        website: true,
        // Business profile
        businessProfile: {
          select: {
            companyName: true,
            portfolioLink: true,
            monthlyProjectVolume: true,
            gstNumber: true,
            businessPhone: true,
            businessLocationLat: true,
            businessLocationLng: true,
            businessAddress: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND' } });
    }

    // Determine the first INCOMPLETE step to resume from
    // A step is complete only if its key field is populated
    let currentStep = 1;
    const phoneReady = !!(user.phoneNumber || user.phone); // legacy phone fallback
    const locationReady = !!(user.locationLat);
    const personaReady = !!(user.persona);
    const businessReady = !!(
      user.persona === 'HOMEOWNER' || // Homeowners skip step 4
      user.businessProfile?.companyName
    );

    if (phoneReady) currentStep = 2;
    if (phoneReady && locationReady) currentStep = 3;
    if (phoneReady && locationReady && personaReady) currentStep = 4;
    if (phoneReady && locationReady && personaReady && businessReady) currentStep = 5;
    if (user.onboardingCompleted) currentStep = 5;

    return res.json({
      success: true,
      data: {
        completed: user.onboardingCompleted,
        currentStep,
        persona: user.persona,
        // Pre-population data for the form
        existing: {
          phoneNumber: user.phoneNumber || user.phone || '',
          whatsappNumber: user.whatsappNumber || user.phone || '',
          locationLat: user.locationLat || null,
          locationLng: user.locationLng || null,
          formattedAddress: user.formattedAddress || user.location || '',
          pincode: user.pincode || '',
          businessProfile: user.businessProfile ? {
            companyName: user.businessProfile.companyName || user.company || '',
            portfolioLink: user.businessProfile.portfolioLink || user.website || '',
            monthlyProjectVolume: user.businessProfile.monthlyProjectVolume || '',
            gstNumber: user.businessProfile.gstNumber || '',
            businessPhone: user.businessProfile.businessPhone || '',
          } : {
            // Fallback from legacy Clerk profile fields
            companyName: user.company || '',
            portfolioLink: user.website || '',
            monthlyProjectVolume: '',
            gstNumber: '',
            businessPhone: '',
          },
        },
      },
    });
  } catch (err) {
    logger.error({ err }, 'GET /onboarding/status error');
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

// ============================================================
// ROUTE: POST /onboarding/complete
// Submit all onboarding data and mark user as onboarded
// ============================================================

router.post('/complete', verifyToken, async (req: Request, res: Response) => {
  try {
    const { userId } = req.tokenPayload!;
    const input = completeOnboardingSchema.parse(req.body);

    // Update user record with all onboarding fields
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        phoneNumber: input.phoneNumber,
        whatsappNumber: input.whatsappNumber ?? input.phoneNumber,
        locationLat: input.locationLat,
        locationLng: input.locationLng,
        formattedAddress: input.formattedAddress,
        pincode: input.pincode,
        persona: input.persona,
        onboardingCompleted: true,
        onboarded: true, // Legacy field — keep in sync
      },
      select: {
        id: true,
        email: true,
        onboardingCompleted: true,
        persona: true,
      },
    });

    // Create/update business profile if non-homeowner
    if (input.persona !== 'HOMEOWNER' && input.businessProfile) {
      await prisma.businessProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...input.businessProfile,
        },
        update: {
          ...input.businessProfile,
        },
      });
    }

    logger.info(
      { userId, persona: input.persona, hasBusinessProfile: !!input.businessProfile },
      'Onboarding completed'
    );

    return res.json({
      success: true,
      data: {
        user,
        message: 'Onboarding completed successfully',
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', details: err.errors },
      });
    }
    logger.error({ err }, 'POST /onboarding/complete error');
    return res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
  }
});

export { router as onboardingRouter };
