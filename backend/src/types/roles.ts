export const USER_ROLES = ['STUDENT', 'METHODIST', 'ADMIN', 'OBSERVER'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PROFILE_REVIEW_STATUSES = [
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
] as const;
export type ProfileReviewStatus = (typeof PROFILE_REVIEW_STATUSES)[number];

export function isUserRole(s: string): s is UserRole {
  return (USER_ROLES as readonly string[]).includes(s);
}

export function isProfileReviewStatus(s: string): s is ProfileReviewStatus {
  return (PROFILE_REVIEW_STATUSES as readonly string[]).includes(s);
}
