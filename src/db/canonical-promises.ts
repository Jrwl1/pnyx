// WHAT IT DO? Reads canonical promises, accepted source bundles, and statement compatibility metadata.
import { db } from "./client.js";

export type CanonicalPromiseSummaryRow = {
  id: number;
  politicianId: number;
  promiseText: string;
  publicStatus: "draft" | "public";
  primaryStatementId: number | null;
  acceptedSourceCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CanonicalPromiseSourceRow = {
  id: number;
  canonicalPromiseId: number;
  statementId: number | null;
  sourceUrl: string;
  sourceNote: string | null;
  acceptedBy: string;
  acceptedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type StatementCanonicalMetadataRow = {
  canonicalPromiseId: number;
  canonicalPromiseText: string;
  canonicalPublicStatus: "draft" | "public";
  primaryStatementId: number | null;
  acceptedSourceCount: number;
};

const canonicalSummarySelect = `
  SELECT cp.id,
    cp.politician_id AS politicianId,
    cp.promise_text AS promiseText,
    cp.public_status AS publicStatus,
    cp.primary_statement_id AS primaryStatementId,
    (
      SELECT COUNT(*)
      FROM canonical_promise_sources cps
      WHERE cps.canonical_promise_id = cp.id
    ) AS acceptedSourceCount,
    cp.created_at AS createdAt,
    cp.updated_at AS updatedAt
  FROM canonical_promises cp
  WHERE cp.deleted_at IS NULL
`;

export const listCanonicalPromises = ({
  politicianId,
  includeNonPublic
}: {
  politicianId?: number;
  includeNonPublic: boolean;
}): CanonicalPromiseSummaryRow[] => {
  const conditions: string[] = [];
  const params: Array<number | string> = [];

  if (!includeNonPublic) {
    conditions.push("cp.public_status = 'public'");
  }
  if (politicianId !== undefined) {
    conditions.push("cp.politician_id = ?");
    params.push(politicianId);
  }

  const whereSql = conditions.length > 0 ? ` AND ${conditions.join(" AND ")}` : "";
  return db
    .prepare(`${canonicalSummarySelect}${whereSql} ORDER BY cp.created_at DESC, cp.id DESC`)
    .all(...params) as CanonicalPromiseSummaryRow[];
};

export const getCanonicalPromiseById = (
  canonicalPromiseId: number,
  includeNonPublic: boolean
): CanonicalPromiseSummaryRow | undefined => {
  const whereSql = includeNonPublic ? "" : " AND cp.public_status = 'public'";
  return db
    .prepare(`${canonicalSummarySelect} AND cp.id = ?${whereSql} LIMIT 1`)
    .get(canonicalPromiseId) as CanonicalPromiseSummaryRow | undefined;
};

export const listCanonicalPromiseSources = (canonicalPromiseId: number): CanonicalPromiseSourceRow[] => {
  return db
    .prepare(
      `SELECT id,
        canonical_promise_id AS canonicalPromiseId,
        statement_id AS statementId,
        source_url AS sourceUrl,
        source_note AS sourceNote,
        accepted_by AS acceptedBy,
        accepted_at AS acceptedAt,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM canonical_promise_sources
       WHERE canonical_promise_id = ?
       ORDER BY id ASC`
    )
    .all(canonicalPromiseId) as CanonicalPromiseSourceRow[];
};

export const getStatementCanonicalMetadataMap = (
  statementIds: number[],
  includeNonPublic: boolean
): Map<number, StatementCanonicalMetadataRow> => {
  if (statementIds.length === 0) {
    return new Map<number, StatementCanonicalMetadataRow>();
  }

  const placeholders = statementIds.map(() => "?").join(", ");
  const visibilityClause = includeNonPublic ? "" : " AND cp.public_status = 'public'";
  const rows = db
    .prepare(
      `SELECT cp.primary_statement_id AS statementId,
        cp.id AS canonicalPromiseId,
        cp.promise_text AS canonicalPromiseText,
        cp.public_status AS canonicalPublicStatus,
        cp.primary_statement_id AS primaryStatementId,
        (
          SELECT COUNT(*)
          FROM canonical_promise_sources cps
          WHERE cps.canonical_promise_id = cp.id
        ) AS acceptedSourceCount
       FROM canonical_promises cp
       WHERE cp.deleted_at IS NULL AND cp.primary_statement_id IN (${placeholders})${visibilityClause}`
    )
    .all(...statementIds) as Array<{ statementId: number } & StatementCanonicalMetadataRow>;

  return new Map(rows.map((row) => [row.statementId, row]));
};
