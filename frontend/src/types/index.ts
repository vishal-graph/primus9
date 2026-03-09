/**
 * Central type exports
 */

export * from './project';
export * from './room';
export * from './ai-job';

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ApiMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
}

// User types
export interface User {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  plan: UserPlan;
  createdAt: Date;
  updatedAt: Date;
}

export type UserPlan = 'FREE' | 'STARTER' | 'STANDARD' | 'PRO' | 'PREMIUM';

// Payment types
export interface Subscription {
  id: string;
  userId: string;
  plan: UserPlan;
  status: SubscriptionStatus;
  razorpaySubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}

export type SubscriptionStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'EXPIRED';

export interface Transaction {
  id: string;
  userId: string;
  type: 'SUBSCRIPTION';
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  razorpayPaymentId?: string;
  createdAt: Date;
}

