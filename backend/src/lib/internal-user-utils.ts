/**
 * Internal User Utilities
 * 
 * Helper functions for detecting and managing TatvaOps internal employees.
 */

/**
 * Check if an email belongs to a TatvaOps employee
 */
export function isTatvaOpsEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@tatvaops.com');
}

/**
 * Check if a user is an internal employee
 */
export function isInternalUser(user: { email: string; isInternal?: boolean }): boolean {
  // Check both the flag and email domain for safety
  return user.isInternal === true || isTatvaOpsEmail(user.email);
}

/**
 * Get internal role for a TatvaOps email
 * (Can be extended with role mapping logic)
 */
export function getInternalRole(email: string): string | null {
  if (!isTatvaOpsEmail(email)) {
    return null;
  }
  
  // Default role for TatvaOps employees
  return 'tatvaops_employee';
}

/**
 * Check if project has a valid project-level plan
 */
export function hasProjectLevelPlan(project: { planCode?: string | null; planSource?: string | null }): boolean {
  return !!project.planCode && !!project.planSource;
}

/**
 * Get display name for plan source
 */
export function getPlanSourceDisplay(planSource: string | null): string {
  switch (planSource) {
    case 'PAID':
      return 'Paid Subscription';
    case 'INTERNAL_OVERRIDE':
      return 'Internal (TatvaOps Employee)';
    default:
      return 'Unknown';
  }
}
