import { PERMISSIONS, type PermissionType } from "./domain";

export const RECONCILIATION_STATUSES = [
  "AWAITING_REPORT", "MATCHED", "LIKELY_MATCH", "AMBIGUOUS", "UNREPORTED",
  "DUPLICATE", "EXCEPTION", "MANUALLY_RESOLVED", "INVALID",
] as const;
export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number];

export interface PermissionUsageInput {
  id: string;
  sourceRowNumber: number;
  staffDiscordId: string | null;
  permission: PermissionType | null;
  targetPlayerId: string | null;
  targetDiscordId?: string | null;
  actionAt: Date | null;
  rawLogId?: string | null;
  validationError?: string | null;
}

export interface PermissionReportCandidate {
  id: number;
  publicId: string;
  staffDiscordId: string;
  permission: PermissionType;
  targetPlayerId: string;
  incidentAt: Date;
}

export interface ReconciliationResult extends PermissionUsageInput {
  status: ReconciliationStatus;
  matchedReportId: number | null;
  matchedReportPublicId: string | null;
  timeDifferenceSeconds: number | null;
  candidateReportIds: number[];
  explanation: {
    staffDiscordId: "Exact" | "Missing";
    permission: "Exact" | "Invalid";
    targetPlayerId: "Exact" | "Missing";
    timeDifference: string | null;
    confidence: string;
  };
}

const permissionLookup = new Map(PERMISSIONS.map((permission) => [permission.toLowerCase(), permission]));

export function normalizePermission(value: unknown): PermissionType | null {
  return permissionLookup.get(String(value ?? "").trim().toLowerCase()) ?? null;
}

export function normalizeIdentifier(value: unknown) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

export function sanitizeImportedValue(value: unknown): string {
  const text = Array.from(String(value ?? "")).filter((character) => {
    const code = character.charCodeAt(0);
    return code === 9 || code === 10 || code === 13 || code >= 32;
  }).join("").trim().slice(0, 4000);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

export function duplicateKey(usage: PermissionUsageInput) {
  if (usage.rawLogId) return `raw:${usage.rawLogId}`;
  return [usage.staffDiscordId, usage.permission, usage.targetPlayerId, usage.actionAt?.toISOString() ?? ""].join("|");
}

function invalidResult(usage: PermissionUsageInput): ReconciliationResult {
  return { ...usage, status:"INVALID", matchedReportId:null, matchedReportPublicId:null, timeDifferenceSeconds:null, candidateReportIds:[], explanation:{ staffDiscordId:usage.staffDiscordId?"Exact":"Missing", permission:usage.permission?"Exact":"Invalid", targetPlayerId:usage.targetPlayerId?"Exact":"Missing", timeDifference:null, confidence:"Invalid row" } };
}

export function reconcilePermissionUsage(
  usages: PermissionUsageInput[],
  reports: PermissionReportCandidate[],
  options: { matchWindowMinutes?: number; graceMinutes?: number; now?: Date } = {},
): ReconciliationResult[] {
  const windowSeconds = Math.max(1, options.matchWindowMinutes ?? 10) * 60;
  const exactThreshold = Math.min(120, Math.floor(windowSeconds / 3));
  const graceMs = Math.max(0, options.graceMinutes ?? 15) * 60_000;
  const now = options.now ?? new Date();
  const usedReportIds = new Set<number>();
  const seenUsageKeys = new Set<string>();

  return [...usages].sort((a,b) => (a.actionAt?.getTime() ?? 0) - (b.actionAt?.getTime() ?? 0)).map((usage) => {
    if (usage.validationError || !usage.staffDiscordId || !usage.permission || !usage.targetPlayerId || !usage.actionAt) return invalidResult(usage);
    const key = duplicateKey(usage);
    if (seenUsageKeys.has(key)) return { ...invalidResult(usage), status:"DUPLICATE", explanation:{ staffDiscordId:"Exact", permission:"Exact", targetPlayerId:"Exact", timeDifference:"0s", confidence:"Possible duplicate log entry" } };
    seenUsageKeys.add(key);

    const candidates = reports.map((report) => ({ report, difference:Math.abs(report.incidentAt.getTime()-usage.actionAt!.getTime())/1000 }))
      .filter(({report,difference}) => report.staffDiscordId===usage.staffDiscordId && report.permission===usage.permission && report.targetPlayerId===usage.targetPlayerId && difference<=windowSeconds && !usedReportIds.has(report.id))
      .sort((a,b) => a.difference-b.difference);

    if (candidates.length > 1) return { ...usage, status:"AMBIGUOUS", matchedReportId:null, matchedReportPublicId:null, timeDifferenceSeconds:Math.round(candidates[0].difference), candidateReportIds:candidates.map(({report})=>report.id), explanation:{ staffDiscordId:"Exact", permission:"Exact", targetPlayerId:"Exact", timeDifference:`${Math.round(candidates[0].difference)}s to closest candidate`, confidence:"Multiple Permission Reports fit the matching window" } };
    if (candidates.length === 1) {
      const { report, difference } = candidates[0]; usedReportIds.add(report.id);
      const status: ReconciliationStatus = difference <= exactThreshold ? "MATCHED" : "LIKELY_MATCH";
      return { ...usage, status, matchedReportId:report.id, matchedReportPublicId:report.publicId, timeDifferenceSeconds:Math.round(difference), candidateReportIds:[report.id], explanation:{ staffDiscordId:"Exact", permission:"Exact", targetPlayerId:"Exact", timeDifference:`${Math.round(difference)}s`, confidence:status === "MATCHED" ? "Exact Match" : "Likely Match" } };
    }
    const awaiting = now.getTime()-usage.actionAt.getTime() < graceMs;
    return { ...usage, status:awaiting?"AWAITING_REPORT":"UNREPORTED", matchedReportId:null, matchedReportPublicId:null, timeDifferenceSeconds:null, candidateReportIds:[], explanation:{ staffDiscordId:"Exact", permission:"Exact", targetPlayerId:"Exact", timeDifference:null, confidence:awaiting?"Inside reporting grace period":"No matching Permission Report found" } };
  });
}

export function manuallyLinkUsage(result: ReconciliationResult, report: PermissionReportCandidate): ReconciliationResult {
  if (!result.actionAt) throw new Error("Cannot manually link an invalid usage row.");
  const difference = Math.round(Math.abs(report.incidentAt.getTime()-result.actionAt.getTime())/1000);
  return { ...result, status:"MANUALLY_RESOLVED", matchedReportId:report.id, matchedReportPublicId:report.publicId, timeDifferenceSeconds:difference, candidateReportIds:[report.id], explanation:{ staffDiscordId:report.staffDiscordId===result.staffDiscordId?"Exact":"Missing", permission:report.permission===result.permission?"Exact":"Invalid", targetPlayerId:report.targetPlayerId===result.targetPlayerId?"Exact":"Missing", timeDifference:`${difference}s`, confidence:"Manually linked by Higher Staff" } };
}
