'use server';

import { getServerAuthHeaders } from '@/lib/server-auth';
import { getApiBase } from '@/lib/api-base';

export interface CatalogPricePayload {
  catalogTable: string;
  catalogId: string;
  title: string;
  subtitle?: string;
  price: number | null;
  currency: string;
  hasPrice: boolean;
  ctaHint: 'ADD' | 'EXPLORE';
  materialNote?: string;
}

export async function getCatalogProductPrice(
  catalogTable: string,
  catalogId: string
): Promise<{ success: boolean; data?: CatalogPricePayload; error?: string }> {
  try {
    const headers = await getServerAuthHeaders();
    if (!headers) return { success: false, error: 'Not authenticated' };

    const q = new URLSearchParams({ table: catalogTable, id: String(catalogId) });
    const response = await fetch(`${getApiBase()}/api/catalog/product-price?${q}`, {
      headers,
      cache: 'no-store',
    });

    if (response.status === 404) {
      return { success: false, error: 'Product not found' };
    }
    if (!response.ok) {
      return { success: false, error: 'Failed to load price' };
    }

    const body = await response.json();
    if (!body.success || !body.data) {
      return { success: false, error: 'Invalid response' };
    }
    const data = body.data as Partial<CatalogPricePayload>;
    if (!data.catalogTable || !data.catalogId || !data.title) {
      return { success: false, error: 'Invalid response' };
    }
    return {
      success: true,
      data: {
        catalogTable: String(data.catalogTable),
        catalogId: String(data.catalogId),
        title: String(data.title),
        subtitle: data.subtitle ? String(data.subtitle) : undefined,
        price: typeof data.price === 'number' ? data.price : null,
        currency: data.currency ? String(data.currency) : 'INR',
        hasPrice: Boolean(data.hasPrice ?? (typeof data.price === 'number')),
        ctaHint: data.ctaHint === 'ADD' ? 'ADD' : 'EXPLORE',
        materialNote: data.materialNote ? String(data.materialNote) : undefined,
      },
    };
  } catch (e) {
    console.error('getCatalogProductPrice', e);
    return { success: false, error: 'Failed to load price' };
  }
}
