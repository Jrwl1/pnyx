// WHAT IT DO? Reads promise claim queues, duplicate assist hints, equivalence signals, and canonical history entries.
import { db } from "./client.js";

export type PromiseClaimStatus = "pending" | "merged" | "canonized" | "rejected";

export type PromiseClaimRow = {
  id: number;
  submittedBy: string;
  politicianId: number;
  claimText: string;
  sourceUrl: string;
  dateSaid: string;
  sourceNote: string | null;
  status: PromiseClaimStatus;
  assigneeId: string | null;
  assignedAt: string | null;
  decisionBy: string | null;
  decisionReason: string | null;
  decisionCode: string | null;
  linkedCanonicalPromiseId: number | null;
  reviewVersion: number;
  createdAt: string;
  decidedAt: string | null;
};

export type PromiseClaimAuditRow = {
  id: number;
  claimId: number;
  actorId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  reasonCode: string | null;
  linkedCanonicalPromiseId: number | null;
  createdAt: string;
};

export type ClaimEquivalenceSignalRow = {
  id: number;
  claimId: number;
  actorId: string;
  targetKind: "canonical_promise" | "claim";
  targetId: number;
  relation: "same_as" | "non_match";
  reasonCode: string;
  createdAt: string;
  updatedAt: string;
};

export type PromiseClaimDuplicateAssist = {
  canonicalMatches: Array<{
    id: number;
    politicianId: number;
    promiseText: string;
    publicStatus: "draft" | "public";
    acceptedSourceCount: number;
    matchOn: string[];
  }>;
  pendingClaimMatches: Array<{
    id: number;
    politicianId: number;
    claimText: string;
    sourceUrl: string;
    matchOn: string[];
  }>;
  fuzzyHints: {
    canonical: Array<{ id: number; politicianId: number; promiseText: string; score: number }>;
    pendingClaims: Array<{ id: number; politicianId: number; claimText: string; score: number }>;
  };
};

export type CanonicalHistoryRow = {
  id: number;
  action: "merged" | "canonized";
  actorId: string;
  claimId: number;
  claimText: string;
  sourceUrl: string;
  reason: string | null;
  reasonCode: string | null;
  createdAt: string;
};

export const claimStatuses: PromiseClaimStatus[] = ["pending", "merged", "canonized", "rejected"];

const normalizeValue = (value: string | null | undefined): string => {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
};

const diceSimilarity = (leftRaw: string, rightRaw: string): number => {
  const left = normalizeValue(leftRaw);
  const right = normalizeValue(rightRaw);
  if (!left && !right) {
    return 1;
  }
  if (!left || !right) {
    return 0;
  }
  if (left === right) {
    return 1;
  }

  const toBigrams = (value: string): string[] => {
    if (value.length < 2) {
      return [value];
    }
    const grams: string[] = [];
    for (let index = 0; index < value.length - 1; index += 1) {
      grams.push(value.slice(index, index + 2));
    }
    return grams;
  };

  const leftBigrams = toBigrams(left);
  const rightCounts = new Map<string, number>();
  for (const gram of toBigrams(right)) {
    rightCounts.set(gram, (rightCounts.get(gram) ?? 0) + 1);
  }

  let intersection = 0;
  for (const gram of leftBigrams) {
    const count = rightCounts.get(gram) ?? 0;
    if (count > 0) {
      intersection += 1;
      rightCounts.set(gram, count - 1);
    }
  }

  return (2 * intersection) / (leftBigrams.length + toBigrams(right).length);
};

export const listPromiseClaims = ({
  submitterId,
  includeAll,
  status,
  assignee,
  page,
  pageSize
}: {
  submitterId: string;
  includeAll: boolean;
  status?: PromiseClaimStatus;
  assignee?: string;
  page: number;
  pageSize: number;
}): { items: PromiseClaimRow[]; total: number } => {
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (!includeAll) {
    conditions.push("submitted_by = ?");
    params.push(submitterId);
  }
  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }
  if (assignee) {
    if (assignee === "unassigned") {
      conditions.push("assignee_id IS NULL");
    } else if (assignee === "me") {
      conditions.push("assignee_id = ?");
      params.push(submitterId);
    } else {
      conditions.push("assignee_id = ?");
      params.push(assignee);
    }
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * pageSize;
  const total = (db.prepare(`SELECT COUNT(*) AS total FROM promise_claims ${whereSql}`).get(...params) as { total: number }).total;
  const items = db
    .prepare(
      `SELECT id,
        submitted_by AS submittedBy,
        politician_id AS politicianId,
        claim_text AS claimText,
        source_url AS sourceUrl,
        date_said AS dateSaid,
        source_note AS sourceNote,
        status,
        assignee_id AS assigneeId,
        assigned_at AS assignedAt,
        decision_by AS decisionBy,
        decision_reason AS decisionReason,
        decision_code AS decisionCode,
        linked_canonical_promise_id AS linkedCanonicalPromiseId,
        review_version AS reviewVersion,
        created_at AS createdAt,
        decided_at AS decidedAt
       FROM promise_claims
       ${whereSql}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset) as PromiseClaimRow[];

  return { items, total };
};

export const getPromiseClaimById = (claimId: number): PromiseClaimRow | undefined => {
  return db
    .prepare(
      `SELECT id,
        submitted_by AS submittedBy,
        politician_id AS politicianId,
        claim_text AS claimText,
        source_url AS sourceUrl,
        date_said AS dateSaid,
        source_note AS sourceNote,
        status,
        assignee_id AS assigneeId,
        assigned_at AS assignedAt,
        decision_by AS decisionBy,
        decision_reason AS decisionReason,
        decision_code AS decisionCode,
        linked_canonical_promise_id AS linkedCanonicalPromiseId,
        review_version AS reviewVersion,
        created_at AS createdAt,
        decided_at AS decidedAt
       FROM promise_claims
       WHERE id = ?`
    )
    .get(claimId) as PromiseClaimRow | undefined;
};

export const listPromiseClaimAudits = (claimId: number): PromiseClaimAuditRow[] => {
  return db
    .prepare(
      `SELECT id,
        claim_id AS claimId,
        actor_id AS actorId,
        action,
        from_status AS fromStatus,
        to_status AS toStatus,
        reason,
        reason_code AS reasonCode,
        linked_canonical_promise_id AS linkedCanonicalPromiseId,
        created_at AS createdAt
       FROM promise_claim_audits
       WHERE claim_id = ?
       ORDER BY id DESC`
    )
    .all(claimId) as PromiseClaimAuditRow[];
};

export const listClaimEquivalenceSignals = (claimId: number): ClaimEquivalenceSignalRow[] => {
  return db
    .prepare(
      `SELECT id,
        claim_id AS claimId,
        actor_id AS actorId,
        target_kind AS targetKind,
        target_id AS targetId,
        relation,
        reason_code AS reasonCode,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM claim_equivalence_signals
       WHERE claim_id = ?
       ORDER BY created_at DESC, id DESC`
    )
    .all(claimId) as ClaimEquivalenceSignalRow[];
};

export const listCanonicalHistory = (canonicalPromiseId: number): CanonicalHistoryRow[] => {
  return db
    .prepare(
      `SELECT pca.id,
        pca.action,
        pca.actor_id AS actorId,
        pc.id AS claimId,
        pc.claim_text AS claimText,
        pc.source_url AS sourceUrl,
        pca.reason,
        pca.reason_code AS reasonCode,
        pca.created_at AS createdAt
       FROM promise_claim_audits pca
       JOIN promise_claims pc ON pc.id = pca.claim_id
       WHERE pca.linked_canonical_promise_id = ? AND pca.action IN ('merged', 'canonized')
       ORDER BY pca.id DESC`
    )
    .all(canonicalPromiseId) as CanonicalHistoryRow[];
};

export const buildPromiseClaimDuplicateAssist = ({
  claimId,
  politicianId,
  claimText,
  sourceUrl
}: {
  claimId?: number;
  politicianId: number;
  claimText: string;
  sourceUrl: string;
}): PromiseClaimDuplicateAssist => {
  const normalizedClaimText = normalizeValue(claimText);
  const normalizedSourceUrl = normalizeValue(sourceUrl);

  const canonicalExact = db
    .prepare(
      `SELECT cp.id, cp.politician_id AS politicianId, cp.promise_text AS promiseText, cp.public_status AS publicStatus,
        (
          SELECT COUNT(*) FROM canonical_promise_sources cps WHERE cps.canonical_promise_id = cp.id
        ) AS acceptedSourceCount
       FROM canonical_promises cp
       LEFT JOIN canonical_promise_sources cps ON cps.canonical_promise_id = cp.id
       WHERE cp.deleted_at IS NULL
         AND cp.politician_id = ?
         AND (
           lower(trim(cp.promise_text)) = ?
           OR lower(trim(cps.source_url)) = ?
         )
       GROUP BY cp.id
       ORDER BY cp.id`
    )
    .all(politicianId, normalizedClaimText, normalizedSourceUrl) as Array<{
      id: number;
      politicianId: number;
      promiseText: string;
      publicStatus: "draft" | "public";
      acceptedSourceCount: number;
    }>;

  const pendingExact = db
    .prepare(
      `SELECT id,
        politician_id AS politicianId,
        claim_text AS claimText,
        source_url AS sourceUrl
       FROM promise_claims
       WHERE politician_id = ?
         AND status = 'pending'
         AND (? IS NULL OR id != ?)
         AND (
           lower(trim(claim_text)) = ?
           OR lower(trim(source_url)) = ?
         )
       ORDER BY id`
    )
    .all(politicianId, claimId ?? null, claimId ?? null, normalizedClaimText, normalizedSourceUrl) as Array<{
      id: number;
      politicianId: number;
      claimText: string;
      sourceUrl: string;
    }>;

  const exactCanonicalIds = new Set(canonicalExact.map((row) => row.id));
  const exactPendingIds = new Set(pendingExact.map((row) => row.id));

  const fuzzyCanonical = (db
    .prepare(
      `SELECT cp.id, cp.politician_id AS politicianId, cp.promise_text AS promiseText
       FROM canonical_promises cp
       WHERE cp.deleted_at IS NULL AND cp.politician_id = ?`
    )
    .all(politicianId) as Array<{ id: number; politicianId: number; promiseText: string }>)
    .filter((row) => !exactCanonicalIds.has(row.id))
    .map((row) => ({
      ...row,
      score: Number(diceSimilarity(normalizedClaimText, row.promiseText).toFixed(3))
    }))
    .filter((row) => row.score >= 0.72)
    .sort((left, right) => (right.score !== left.score ? right.score - left.score : left.id - right.id))
    .slice(0, 5);

  const fuzzyPending = (db
    .prepare(
      `SELECT id, politician_id AS politicianId, claim_text AS claimText
       FROM promise_claims
       WHERE politician_id = ? AND status = 'pending' AND (? IS NULL OR id != ?)`
    )
    .all(politicianId, claimId ?? null, claimId ?? null) as Array<{ id: number; politicianId: number; claimText: string }>)
    .filter((row) => !exactPendingIds.has(row.id))
    .map((row) => ({
      ...row,
      score: Number(diceSimilarity(normalizedClaimText, row.claimText).toFixed(3))
    }))
    .filter((row) => row.score >= 0.72)
    .sort((left, right) => (right.score !== left.score ? right.score - left.score : left.id - right.id))
    .slice(0, 5);

  return {
    canonicalMatches: canonicalExact.map((row) => ({
      ...row,
      acceptedSourceCount: Number(row.acceptedSourceCount ?? 0),
      matchOn: ["promiseText"]
    })),
    pendingClaimMatches: pendingExact.map((row) => ({
      ...row,
      matchOn: ["claimText"]
    })),
    fuzzyHints: {
      canonical: fuzzyCanonical,
      pendingClaims: fuzzyPending
    }
  };
};
