export const STAFF_RANKS = ["Owner", "Server Management", "Managment", "Staff Manger", "Head Admin", "Senior Admin", "Admin"] as const;
export type StaffRank = (typeof STAFF_RANKS)[number];
export const LOWER_STAFF: readonly StaffRank[] = ["Admin", "Senior Admin"];
export const HIGHER_STAFF: readonly StaffRank[] = ["Head Admin", "Staff Manger", "Managment", "Server Management", "Owner"];

export const PERMISSIONS = ["Warn", "Jail", "Revive", "Setjob", "Teleport", "Bring", "Goto", "Spectate", "SetGang"] as const;
export type PermissionType = (typeof PERMISSIONS)[number];
export const REPORT_STATUSES = ["Pending", "Under Review", "Approved", "Needs Information", "Rejected", "Escalated"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const STATUS_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  Pending: ["Under Review"],
  "Under Review": ["Pending", "Approved", "Needs Information", "Rejected", "Escalated"],
  "Needs Information": ["Under Review"],
  Escalated: ["Under Review", "Approved", "Rejected"],
  Approved: [],
  Rejected: [],
};

export function getStaffRankFromDiscordRoles(roleIds: readonly string[], mapping: Partial<Record<StaffRank, string>>): StaffRank | null {
  return STAFF_RANKS.find((rank) => mapping[rank] && roleIds.includes(mapping[rank]!)) ?? null;
}
export const isLowerStaff = (rank: StaffRank) => LOWER_STAFF.includes(rank);
export const isHigherStaff = (rank: StaffRank) => HIGHER_STAFF.includes(rank);
export const hasManagementAccess = isHigherStaff;
export const canReviewPermissionReports = isHigherStaff;
export const canViewAllPermissionReports = isHigherStaff;
export const canTransition = (from: ReportStatus, to: ReportStatus) => STATUS_TRANSITIONS[from].includes(to);
export const hasEvidence = (files: readonly unknown[], url?: string) => files.length > 0 || Boolean(url?.trim());
export const canViewPermissionReport = (viewerId: string, ownerId: string, rank: StaffRank) => viewerId === ownerId || isHigherStaff(rank);
export const canEditPermissionReport = (createdAt: Date, now = new Date(), graceMinutes = 5) => now.getTime() - createdAt.getTime() <= graceMinutes * 60_000;
