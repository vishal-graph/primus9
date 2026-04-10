/**
 * Authenticated catalog lookups (product DB).
 */

import { Router, Request, Response, NextFunction } from 'express';
import {
  lookupCatalogProduct,
  isAllowedCatalogTable,
} from '../services/catalog-product-lookup';

const router = Router();

router.get(
  '/product-price',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const table = typeof req.query.table === 'string' ? req.query.table.trim() : '';
      const idRaw = req.query.id;
      const id =
        typeof idRaw === 'string'
          ? idRaw.trim()
          : idRaw != null
            ? String(idRaw).trim()
            : '';

      if (!table || !id) {
        res.status(400).json({
          success: false,
          error: { code: 'BAD_REQUEST', message: 'Missing table or id' },
        });
        return;
      }

      if (!isAllowedCatalogTable(table)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_TABLE', message: 'Unknown catalog table' },
        });
        return;
      }

      const lookup = await lookupCatalogProduct(table, id);
      if (!lookup) {
        res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Product not found in catalog' },
        });
        return;
      }

      const data = {
        ...lookup,
        currency: lookup.currency || 'INR',
        hasPrice: lookup.price != null,
        ctaHint: lookup.price != null ? 'ADD' : 'EXPLORE',
      };
      res.json({ success: true, data });
    } catch (e) {
      next(e);
    }
  }
);

export { router as catalogRouter };
