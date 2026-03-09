/**
 * Admin Dashboard Types
 * 
 * Shared TypeScript types for admin dashboard components
 */

export type AnomalyType = 
  | 'REGEN_ABUSE' 
  | 'PROJECT_HOARDING' 
  | 'BURST_ACTIVITY' 
  | 'PLAN_ABUSE';

export type AnomalySeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AnomalyFlag {
  type: AnomalyType;
  severity: AnomalySeverity;
  details: string;
  value: number;
  threshold: number;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers7d: number;
  totalProjects: number;
  totalGenerations: number;
  totalRegenerations: number;
  avgProjectsPerUser: number;
  trends: {
    users24h: number;
    projects7d: number;
  };
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  plan: string;
  totalProjects: number;
  totalGenerations: number;
  totalRegenerations: number;
  accountCreatedAt: Date;
  lastActiveAt: Date;
  anomalyFlags: AnomalyFlag[];
}

export interface AdminUserProfile {
  basicInfo: {
    id: string;
    email: string;
    name: string | null;
    signupDate: Date;
    plan: string;
    status: string;
  };
  planUsage: {
    projectsUsed: number;
    projectsAllowed: number;
    regenCount: number;
    regenLimit: number;
  };
  projects: Array<{
    id: string;
    name: string;
    createdAt: Date;
    roomCount: number;
    theme: string;
    totalGenerations: number;
    totalRegenerations: number;
    exportCount: number;
  }>;
  feedbackSummary: {
    count: number;
    avgSatisfaction: number;
    commonSignals: string[];
    lastFeedbackAt: Date | null;
  };
  aiUsage: {
    moodboardGens: number;
    elevationGens: number;
    interiorGens: number;
    floorplanAnalysis: number;
  };
}

export interface AdminFeedback {
  id: string;
  userId: string;
  userEmail: string;
  projectId: string;
  projectName: string;
  overallScore: number;
  aiUnderstandingScore: number;
  improvementVectors: string[];
  businessIntent: object;
  createdAt: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

