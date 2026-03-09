/**
 * Billing API
 *
 * Handles invoices, payment history, and billing-related queries.
 * Invoice download generates a PDF with TatvaOps branding.
 */

import path from 'path';
import fs from 'fs';
import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { errors } from '../lib/error-handler';
import { getPlanDefinition } from '../lib/plan-config';

const router = Router();

// Logo path: frontend public or env override (fallback: no image)
function getInvoiceLogoPath(): string | null {
  const envPath = process.env.INVOICE_LOGO_PATH;
  if (envPath && fs.existsSync(envPath)) return envPath;
  const frontendLogo = path.join(process.cwd(), '..', 'frontend', 'public', 'logo.png');
  if (fs.existsSync(frontendLogo)) return frontendLogo;
  return null;
}

// ============================================
// GET /api/billing/invoices
// Get user's payment history / invoices
// ============================================

router.get('/invoices', async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw errors.unauthorized('User not authenticated');
    }

    // Fetch all subscriptions for the user (these represent purchases/invoices)
    const subscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        status: 'ACTIVE', // Only show successful payments
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        planCode: true,
        razorpayPaymentId: true,
        razorpayOrderId: true,
        startDate: true,
        createdAt: true,
      },
    });

    // Transform subscriptions to invoice format
    const invoices = subscriptions.map((sub) => {
      const plan = getPlanDefinition(sub.planCode as any);
      return {
        id: sub.id,
        planName: plan?.name || sub.planCode,
        amount: plan?.priceInr || 0,
        currency: 'INR',
        status: 'PAID',
        paymentDate: sub.startDate || sub.createdAt,
        razorpayPaymentId: sub.razorpayPaymentId || '',
        razorpayOrderId: sub.razorpayOrderId || '',
      };
    });

    res.json({
      success: true,
      data: invoices,
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/billing/invoices/:invoiceId/download
// Generate and download invoice as PDF (with TatvaOps logo)
// ============================================

router.get('/invoices/:invoiceId/download', async (req, res, next) => {
  try {
    const userId = req.userId;
    const { invoiceId } = req.params;

    if (!userId) {
      throw errors.unauthorized('User not authenticated');
    }

    // Verify invoice belongs to user
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: invoiceId,
        userId,
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    });

    if (!subscription) {
      throw errors.notFound('Invoice not found');
    }

    const plan = getPlanDefinition(subscription.planCode as any);
    const amountInr = plan?.priceInr ? plan.priceInr / 100 : 0;
    const amountStr = amountInr ? `₹${amountInr.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : 'N/A';
    const invoiceDate = new Date(subscription.createdAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const userName = subscription.user.name || 'Customer';
    const userEmail = subscription.user.email || '';
    const planName = plan?.name || subscription.planCode;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceId}.pdf"`);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(res);

    // Logo (TatvaOps) and company name
    const logoPath = getInvoiceLogoPath();
    const logoWidth = 100;
    const headerLeft = 50;
    const textStartX = logoPath ? headerLeft + logoWidth + 20 : headerLeft;
    const headerY = 50;
    if (logoPath) {
      try {
        doc.image(logoPath, headerLeft, headerY - 5, { width: logoWidth });
      } catch (e) {
        logger.warn({ err: e }, 'Invoice: could not embed logo');
      }
    }
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#000000').text('TatvaOps Vision', textStartX, headerY);
    doc.fontSize(10).font('Helvetica').fillColor('#666666').text('Invoice', textStartX, headerY + 20);

    // Invoice title and details (right-aligned block)
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#000000').text('INVOICE', 400, 50, { align: 'right' });
    doc.fontSize(10).font('Helvetica').fillColor('#333333');
    doc.text(`Invoice # ${subscription.id.slice(0, 8)}`, 400, 72, { align: 'right' });
    doc.text(`Date: ${invoiceDate}`, 400, 85, { align: 'right' });
    doc.text('Status: PAID', 400, 98, { align: 'right' });

    doc.moveDown(2);

    // Billed to
    const billedToY = doc.y + 10;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#000000').text('Billed To', 50, billedToY);
    doc.fontSize(10).font('Helvetica').fillColor('#333333');
    doc.text(userName, 50, billedToY + 16);
    doc.text(userEmail, 50, billedToY + 30);

    // Table header
    const tableTop = billedToY + 55;
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#000000');
    doc.text('Description', 50, tableTop);
    doc.text('Amount', 400, tableTop, { align: 'right' });
    doc.moveTo(50, tableTop + 18).lineTo(550, tableTop + 18).stroke('#cccccc');
    doc.moveDown(0.5);

    // Line item
    doc.font('Helvetica').fillColor('#333333');
    doc.text(`${planName} Plan`, 50, tableTop + 28);
    doc.text(amountStr, 400, tableTop + 28, { align: 'right' });

    // Total
    const totalY = tableTop + 55;
    doc.moveTo(50, totalY - 8).lineTo(550, totalY - 8).stroke('#cccccc');
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
    doc.text('Total', 50, totalY);
    doc.text(amountStr, 400, totalY, { align: 'right' });

    // Payment details
    doc.font('Helvetica').fontSize(10).fillColor('#666666');
    doc.text('Payment Details', 50, totalY + 40);
    doc.text(`Payment ID: ${subscription.razorpayPaymentId || 'N/A'}`, 50, totalY + 56);
    doc.text(`Order ID: ${subscription.razorpayOrderId || 'N/A'}`, 50, totalY + 70);

    // Footer
    doc.fontSize(9).fillColor('#888888');
    doc.text('Thank you for your business.', 50, doc.page.height - 80, { align: 'center', width: 500 });
    doc.text('Support: billing@tatvaops.com  |  https://vision.tatvaops.com', 50, doc.page.height - 65, {
      align: 'center',
      width: 500,
    });
    doc.text('Secured by Razorpay', 50, doc.page.height - 50, { align: 'center', width: 500 });

    doc.end();
  } catch (error) {
    next(error);
  }
});

// ============================================
// GET /api/billing/summary
// Get billing summary for user
// ============================================

router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw errors.unauthorized('User not authenticated');
    }

    // Get user's subscription
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        plan: true,
      },
    });

    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get total spending
    const allSubscriptions = await prisma.subscription.findMany({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });

    const totalSpent = allSubscriptions.reduce((sum, sub) => {
      const plan = getPlanDefinition(sub.planCode as any);
      return sum + (plan?.priceInr || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        currentPlan: user?.plan || 'FREE',
        activeSubscription: activeSubscription ? {
          planCode: activeSubscription.planCode,
          startDate: activeSubscription.startDate,
          paymentId: activeSubscription.razorpayPaymentId,
        } : null,
        totalSpent,
        totalPurchases: allSubscriptions.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
