// WHAT IT DO? Stores ingest runs, raw records, and staged normalized items for Finland-first official-source imports.

import crypto from "node:crypto";

import { db } from "./client.js";

export type IngestRunRow = {
  id: number;
  sourceFamily: string;
  sourceKey: string;
  sourceUrl: string | null;
  triggeredBy: string;
  status: "pending" | "fetched" | "staged" | "applied" | "failed";
  fetchedCount: number;
  stagedCount: number;
  appliedCount: number;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IngestStageItemRow = {
  id: number;
  runId: number;
  rawRecordId: number;
  stageType:
    | "party_stance"
    | "vote_event"
    | "vote_record"
    | "coverage_party_target"
    | "coverage_politician_target"
    | "canonical_promise"
    | "fulfillment_assessment"
    | "party_alignment"
    | "politician_statement";
  sourceKey: string;
  dedupeKey: string;
  normalizedJson: string;
  status: "pending" | "applied" | "rejected" | "failed" | "needs_source";
  appliedEntityKind: string | null;
  appliedEntityId: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

const hashPayload = (payload: unknown): string => {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
};

export const createIngestRun = (input: {
  sourceFamily: string;
  sourceKey: string;
  sourceUrl?: string | null;
  triggeredBy: string;
}): number => {
  const result = db
    .prepare(
      `INSERT INTO ingest_runs (source_family, source_key, source_url, triggered_by)
       VALUES (?, ?, ?, ?)`
    )
    .run(input.sourceFamily, input.sourceKey, input.sourceUrl ?? null, input.triggeredBy);
  return result.lastInsertRowid as number;
};

export const addRawRecord = (input: {
  runId: number;
  sourceFamily: string;
  sourceKey: string;
  recordType: string;
  sourceRecordKey: string;
  sourceUrl?: string | null;
  payload: unknown;
}): number => {
  const payloadJson = JSON.stringify(input.payload);
  const payloadHash = hashPayload(input.payload);
  const existing = db
    .prepare(
      `SELECT id
       FROM ingest_raw_records
       WHERE run_id = ?
         AND source_family = ?
         AND source_key = ?
         AND record_type = ?
         AND source_record_key = ?
         AND payload_hash = ?`
    )
    .get(input.runId, input.sourceFamily, input.sourceKey, input.recordType, input.sourceRecordKey, payloadHash) as { id: number } | undefined;

  if (existing) {
    return existing.id;
  }

  const result = db
    .prepare(
      `INSERT INTO ingest_raw_records
       (run_id, source_family, source_key, record_type, source_record_key, source_url, payload_json, payload_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.runId,
      input.sourceFamily,
      input.sourceKey,
      input.recordType,
      input.sourceRecordKey,
      input.sourceUrl ?? null,
      payloadJson,
      payloadHash
    );

  return result.lastInsertRowid as number;
};

export const addStageItem = (input: {
  runId: number;
  rawRecordId: number;
  stageType: IngestStageItemRow["stageType"];
  sourceKey: string;
  dedupeKey: string;
  normalized: unknown;
}): number => {
  const normalizedJson = JSON.stringify(input.normalized);
  const existing = db
    .prepare("SELECT id FROM ingest_stage_items WHERE run_id = ? AND source_key = ? AND dedupe_key = ?")
    .get(input.runId, input.sourceKey, input.dedupeKey) as { id: number } | undefined;

  if (existing) {
    db.prepare("UPDATE ingest_stage_items SET raw_record_id = ?, normalized_json = ?, updated_at = datetime('now') WHERE id = ?").run(
      input.rawRecordId,
      normalizedJson,
      existing.id
    );
    return existing.id;
  }

  const result = db
    .prepare(
      `INSERT INTO ingest_stage_items (run_id, raw_record_id, stage_type, source_key, dedupe_key, normalized_json)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(input.runId, input.rawRecordId, input.stageType, input.sourceKey, input.dedupeKey, normalizedJson);
  return result.lastInsertRowid as number;
};

export const markIngestRunStatus = (
  runId: number,
  input: Partial<Pick<IngestRunRow, "status" | "fetchedCount" | "stagedCount" | "appliedCount" | "errorMessage">>
): void => {
  const current = db
    .prepare(
      `SELECT status, fetched_count AS fetchedCount, staged_count AS stagedCount, applied_count AS appliedCount, error_message AS errorMessage
       FROM ingest_runs WHERE id = ?`
    )
    .get(runId) as { status: string; fetchedCount: number; stagedCount: number; appliedCount: number; errorMessage: string | null } | undefined;
  if (!current) {
    return;
  }

  db.prepare(
    `UPDATE ingest_runs
     SET status = ?, fetched_count = ?, staged_count = ?, applied_count = ?, error_message = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    input.status ?? current.status,
    input.fetchedCount ?? current.fetchedCount,
    input.stagedCount ?? current.stagedCount,
    input.appliedCount ?? current.appliedCount,
    input.errorMessage ?? current.errorMessage,
    runId
  );
};

export const listIngestRuns = (): IngestRunRow[] => {
  return db
    .prepare(
      `SELECT id,
        source_family AS sourceFamily,
        source_key AS sourceKey,
        source_url AS sourceUrl,
        triggered_by AS triggeredBy,
        status,
        fetched_count AS fetchedCount,
        staged_count AS stagedCount,
        applied_count AS appliedCount,
        error_message AS errorMessage,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM ingest_runs
       ORDER BY id DESC`
    )
    .all() as IngestRunRow[];
};

export const getIngestRunById = (runId: number): IngestRunRow | undefined => {
  return db
    .prepare(
      `SELECT id,
        source_family AS sourceFamily,
        source_key AS sourceKey,
        source_url AS sourceUrl,
        triggered_by AS triggeredBy,
        status,
        fetched_count AS fetchedCount,
        staged_count AS stagedCount,
        applied_count AS appliedCount,
        error_message AS errorMessage,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM ingest_runs
       WHERE id = ?`
    )
    .get(runId) as IngestRunRow | undefined;
};

export const listIngestStageItems = (runId?: number): IngestStageItemRow[] => {
  const whereSql = runId ? "WHERE run_id = ?" : "";
  return db
    .prepare(
      `SELECT id,
        run_id AS runId,
        raw_record_id AS rawRecordId,
        stage_type AS stageType,
        source_key AS sourceKey,
        dedupe_key AS dedupeKey,
        normalized_json AS normalizedJson,
        status,
        applied_entity_kind AS appliedEntityKind,
        applied_entity_id AS appliedEntityId,
        decided_by AS decidedBy,
        decided_at AS decidedAt,
        error_message AS errorMessage,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM ingest_stage_items
       ${whereSql}
       ORDER BY id DESC`
    )
    .all(...(runId ? [runId] : [])) as IngestStageItemRow[];
};

export const getIngestStageItemById = (stageItemId: number): IngestStageItemRow | undefined => {
  return db
    .prepare(
      `SELECT id,
        run_id AS runId,
        raw_record_id AS rawRecordId,
        stage_type AS stageType,
        source_key AS sourceKey,
        dedupe_key AS dedupeKey,
        normalized_json AS normalizedJson,
        status,
        applied_entity_kind AS appliedEntityKind,
        applied_entity_id AS appliedEntityId,
        decided_by AS decidedBy,
        decided_at AS decidedAt,
        error_message AS errorMessage,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM ingest_stage_items
       WHERE id = ?`
    )
    .get(stageItemId) as IngestStageItemRow | undefined;
};

export const updateIngestStageItem = (
  stageItemId: number,
  input: Partial<Pick<IngestStageItemRow, "status" | "appliedEntityKind" | "appliedEntityId" | "decidedBy" | "decidedAt" | "errorMessage">>
): void => {
  const current = getIngestStageItemById(stageItemId);
  if (!current) {
    return;
  }

  db.prepare(
    `UPDATE ingest_stage_items
     SET status = ?, applied_entity_kind = ?, applied_entity_id = ?, decided_by = ?, decided_at = ?, error_message = ?, updated_at = datetime('now')
     WHERE id = ?`
  ).run(
    input.status ?? current.status,
    input.appliedEntityKind ?? current.appliedEntityKind,
    input.appliedEntityId ?? current.appliedEntityId,
    input.decidedBy ?? current.decidedBy,
    input.decidedAt ?? current.decidedAt,
    input.errorMessage ?? current.errorMessage,
    stageItemId
  );
};

export const markIngestStageItemNeedsSource = (stageItemId: number, actorId: string): void => {
  const stageItem = getIngestStageItemById(stageItemId);
  if (!stageItem) {
    throw new Error("stage item not found");
  }
  if (stageItem.status !== "pending") {
    throw new Error("stage item is not pending");
  }

  updateIngestStageItem(stageItemId, {
    status: "needs_source",
    decidedBy: actorId,
    decidedAt: new Date().toISOString(),
    errorMessage: "Needs stronger source confirmation before publication"
  });
};

export const getIngestCoverage = (): {
  pending: Record<string, number>;
  applied: Record<string, number>;
} => {
  const rows = db
    .prepare(
      `SELECT stage_type AS stageType, status, COUNT(*) AS total
       FROM ingest_stage_items
       GROUP BY stage_type, status`
    )
    .all() as Array<{ stageType: string; status: string; total: number }>;

  const pending: Record<string, number> = {};
  const applied: Record<string, number> = {};
  for (const row of rows) {
    if (row.status === "pending") {
      pending[row.stageType] = Number(row.total ?? 0);
    }
    if (row.status === "applied") {
      applied[row.stageType] = Number(row.total ?? 0);
    }
  }

  return { pending, applied };
};

export const refreshIngestRunCounts = (runId: number): void => {
  const counts = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM ingest_raw_records WHERE run_id = ?) AS fetchedCount,
        (SELECT COUNT(*) FROM ingest_stage_items WHERE run_id = ?) AS stagedCount,
        (SELECT COUNT(*) FROM ingest_stage_items WHERE run_id = ? AND status = 'applied') AS appliedCount,
        (SELECT COUNT(*) FROM ingest_stage_items WHERE run_id = ? AND status = 'pending') AS pendingCount,
        (SELECT COUNT(*) FROM ingest_stage_items WHERE run_id = ? AND status = 'failed') AS failedCount
       `
    )
    .get(runId, runId, runId, runId, runId) as {
    fetchedCount: number;
    stagedCount: number;
    appliedCount: number;
    pendingCount: number;
    failedCount: number;
  };

  const status: IngestRunRow["status"] =
    counts.failedCount > 0
      ? "failed"
      : counts.pendingCount > 0
        ? "staged"
        : counts.appliedCount > 0
          ? "applied"
          : counts.fetchedCount > 0
            ? "fetched"
            : "pending";

  markIngestRunStatus(runId, {
    status,
    fetchedCount: counts.fetchedCount,
    stagedCount: counts.stagedCount,
    appliedCount: counts.appliedCount
  });
};
