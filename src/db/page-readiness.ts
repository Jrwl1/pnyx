// WHAT IT DO? Stores reviewed readiness state for public politician, party, and promise pages.
import { db } from "./client.js";

export type PageReadinessEntityKind = "politician" | "party" | "canonical_promise";
export type PageReadinessState = "ready" | "thin_but_honest" | "not_ready";

export type PageReadinessInput = {
  entityKind: PageReadinessEntityKind;
  entityId: string | number;
  readinessState: PageReadinessState;
  freshnessCheckedAt: string | null;
  sourceCount: number;
  missingDataKeys: string[];
  provenanceSummary: string;
  reviewedBy: string;
};

export type PageReadinessRow = {
  id: number;
  entityKind: PageReadinessEntityKind;
  entityId: string;
  readinessState: PageReadinessState;
  freshnessCheckedAt: string | null;
  sourceCount: number;
  missingDataKeys: string[];
  provenanceSummary: string;
  reviewedBy: string;
  reviewedAt: string;
  createdAt: string;
  updatedAt: string;
};

type PageReadinessDbRow = Omit<PageReadinessRow, "missingDataKeys"> & {
  missingDataJson: string;
};

const serializeEntityId = (entityId: string | number): string => String(entityId);

const parseMissingDataKeys = (value: string): string[] => {
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed.map((item) => String(item));
};

const toPageReadinessRow = (row: PageReadinessDbRow): PageReadinessRow => ({
  ...row,
  sourceCount: Number(row.sourceCount ?? 0),
  missingDataKeys: parseMissingDataKeys(row.missingDataJson)
});

const pageReadinessSelect = `
  SELECT id,
    entity_kind AS entityKind,
    entity_id AS entityId,
    readiness_state AS readinessState,
    freshness_checked_at AS freshnessCheckedAt,
    source_count AS sourceCount,
    provenance_summary AS provenanceSummary,
    missing_data_json AS missingDataJson,
    reviewed_by AS reviewedBy,
    reviewed_at AS reviewedAt,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM page_readiness
`;

export const getPageReadiness = (
  entityKind: PageReadinessEntityKind,
  entityId: string | number
): PageReadinessRow | null => {
  const row = db
    .prepare(`${pageReadinessSelect} WHERE entity_kind = ? AND entity_id = ? LIMIT 1`)
    .get(entityKind, serializeEntityId(entityId)) as PageReadinessDbRow | undefined;
  return row ? toPageReadinessRow(row) : null;
};

export const getPageReadinessMap = (
  entityKind: PageReadinessEntityKind,
  entityIds: Array<string | number>
): Map<string, PageReadinessRow> => {
  const serializedIds = [...new Set(entityIds.map(serializeEntityId))];
  if (serializedIds.length === 0) {
    return new Map<string, PageReadinessRow>();
  }

  const placeholders = serializedIds.map(() => "?").join(", ");
  const rows = db
    .prepare(`${pageReadinessSelect} WHERE entity_kind = ? AND entity_id IN (${placeholders})`)
    .all(entityKind, ...serializedIds) as PageReadinessDbRow[];

  return new Map(rows.map((row) => [row.entityId, toPageReadinessRow(row)]));
};

export const upsertPageReadiness = (input: PageReadinessInput): PageReadinessRow => {
  const entityId = serializeEntityId(input.entityId);
  const sourceCount = Math.max(0, Math.floor(input.sourceCount));
  const missingDataJson = JSON.stringify(input.missingDataKeys);

  db.prepare(
    `INSERT INTO page_readiness (
      entity_kind,
      entity_id,
      readiness_state,
      freshness_checked_at,
      source_count,
      provenance_summary,
      missing_data_json,
      reviewed_by,
      reviewed_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(entity_kind, entity_id) DO UPDATE SET
      readiness_state = excluded.readiness_state,
      freshness_checked_at = excluded.freshness_checked_at,
      source_count = excluded.source_count,
      provenance_summary = excluded.provenance_summary,
      missing_data_json = excluded.missing_data_json,
      reviewed_by = excluded.reviewed_by,
      reviewed_at = excluded.reviewed_at,
      updated_at = excluded.updated_at`
  ).run(
    input.entityKind,
    entityId,
    input.readinessState,
    input.freshnessCheckedAt,
    sourceCount,
    input.provenanceSummary,
    missingDataJson,
    input.reviewedBy
  );

  const row = getPageReadiness(input.entityKind, entityId);
  if (!row) {
    throw new Error("page readiness upsert failed");
  }
  return row;
};
