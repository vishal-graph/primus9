'use server';

import { serverFetch } from '@/lib/api-client';
import type { ComponentExtractionRow } from './component-extraction';

export interface ComponentOrderItem {
  componentCategory?: string;
  componentName: string;
  description?: string;
  material?: string;
  finishColor?: string;
  approximateSize?: string;
  placement?: string;
  materialCost?: number | string;
  labourCost?: number | string;
  totalCost?: number | string;
  calculation?: string;
  notes?: string;
}

export interface PlaceComponentOrderMetadata {
  deliveryAddress?: string;
  contactNotes?: string;
}

export interface PlaceComponentOrderResult {
  orderId: string;
  status: string;
  totalMaterial: number;
  totalLabour: number;
  grandTotal: number;
  createdAt: string;
}

function rowToItem(row: ComponentExtractionRow): ComponentOrderItem {
  return {
    componentCategory: row.componentCategory,
    componentName: row.componentName,
    description: row.description,
    material: row.material,
    finishColor: row.finishColor,
    approximateSize: row.approximateSize,
    placement: row.placement,
    materialCost: row.materialCost,
    labourCost: row.labourCost,
    totalCost: row.totalCost,
    calculation: row.calculation,
    notes: row.notes,
  };
}

export async function placeComponentOrder(
  projectId: string,
  roomId: string,
  items: ComponentExtractionRow[],
  metadata?: PlaceComponentOrderMetadata
): Promise<{ success: true; data: PlaceComponentOrderResult } | { success: false; error: string }> {
  const orderItems = items.map(rowToItem);

  const response = await serverFetch<PlaceComponentOrderResult>(
    `/api/projects/${projectId}/component-orders`,
    {
      method: 'POST',
      body: { roomId, items: orderItems, metadata },
    }
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || 'Failed to place component order',
    };
  }

  if (!response.data) {
    return { success: false, error: 'No order data returned' };
  }

  return { success: true, data: response.data };
}

export interface ComponentOrderReceipt {
  orderId: string;
  status: string;
  projectName: string;
  roomName: string;
  items: ComponentOrderItem[];
  totalMaterial: number;
  totalLabour: number;
  grandTotal: number;
  metadata?: { deliveryAddress?: string; contactNotes?: string };
  createdAt: string;
}

export interface RoomOrderSummary {
  orderId: string;
  roomId: string;
  roomName: string;
  status: string;
  grandTotal: number;
  createdAt: string;
}

export async function getProjectComponentOrders(
  projectId: string,
  roomId?: string
): Promise<{ success: true; data: RoomOrderSummary[] } | { success: false; error: string }> {
  const url = roomId
    ? `/api/projects/${projectId}/component-orders?roomId=${roomId}`
    : `/api/projects/${projectId}/component-orders`;
  const response = await serverFetch<RoomOrderSummary[]>(url);

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || 'Failed to fetch orders',
    };
  }

  return {
    success: true,
    data: Array.isArray(response.data) ? response.data : [],
  };
}

export async function getComponentOrder(
  projectId: string,
  orderId: string
): Promise<{ success: true; data: ComponentOrderReceipt } | { success: false; error: string }> {
  const response = await serverFetch<ComponentOrderReceipt>(
    `/api/projects/${projectId}/component-orders/${orderId}`
  );

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || 'Failed to fetch order',
    };
  }

  if (!response.data) {
    return { success: false, error: 'No order data returned' };
  }

  return { success: true, data: response.data };
}
