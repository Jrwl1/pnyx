// WHAT IT DO? Reads party stances, vote events, promise-vote links, fulfillment assessments, and party-alignment records.
import { db } from "./client.js";

export type VoteValue = "for" | "against" | "abstain" | "absent";
export type AlignmentStatus = "aligned" | "contradicted" | "mixed" | "unknown";
export type FulfillmentStatus = "fulfilled" | "broken" | "in_progress" | "unknown";
export type PartyAlignmentStatus = "aligned" | "broke_party_line";

export type PartyStanceRow = {
  id: number;
  partyId: string;
  issue: string | null;
  stanceText: string;
  sourceUrl: string;
  sourceNote: string | null;
  dateSaid: string;
  createdAt: string;
  updatedAt: string;
};

export type VoteEventSummaryRow = {
  id: number;
  externalKey: string | null;
  countryCode: string;
  institutionName: string;
  issue: string | null;
  title: string;
  sourceUrl: string;
  sourceNote: string | null;
  eventDate: string;
  recordCount: number;
  linkedPromiseCount: number;
  createdAt: string;
  updatedAt: string;
  politicianVoteRecordId: number | null;
  politicianId: number | null;
  politicianName: string | null;
  voteValue: VoteValue | null;
};

export type VoteEventRecordRow = {
  id: number;
  voteEventId: number;
  politicianId: number;
  politicianName: string;
  region: string | null;
  office: string | null;
  voteValue: VoteValue;
  sourceNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PromiseVoteComparisonRow = {
  linkId: number;
  canonicalPromiseId: number;
  voteEventId: number;
  alignedVoteValue: Exclude<VoteValue, "absent">;
  comparisonNote: string | null;
  createdAt: string;
  updatedAt: string;
  eventTitle: string;
  eventDate: string;
  eventSourceUrl: string;
  eventSourceNote: string | null;
  externalKey: string | null;
  countryCode: string;
  institutionName: string;
  issue: string | null;
  politicianVoteRecordId: number | null;
  politicianVoteValue: VoteValue | null;
  politicianVoteSourceNote: string | null;
  alignmentStatus: Exclude<AlignmentStatus, "mixed">;
};

export type PromiseFulfillmentAssessmentRow = {
  id: number;
  canonicalPromiseId: number;
  status: FulfillmentStatus;
  summary: string;
  sourceUrl: string;
  sourceNote: string | null;
  evidenceDate: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PromisePartyAlignmentRow = {
  id: number;
  canonicalPromiseId: number;
  partyStanceId: number;
  status: PartyAlignmentStatus;
  reason: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  partyId: string;
  partyName: string;
  partyShortName: string;
  issue: string | null;
  stanceText: string;
  sourceUrl: string;
  sourceNote: string | null;
  dateSaid: string;
};

export const listPartyStances = (partyId: string): PartyStanceRow[] => {
  return db
    .prepare(
      `SELECT id,
        party_id AS partyId,
        issue,
        stance_text AS stanceText,
        source_url AS sourceUrl,
        source_note AS sourceNote,
        date_said AS dateSaid,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM party_stances
       WHERE party_id = ?
       ORDER BY date_said DESC, id DESC`
    )
    .all(partyId) as PartyStanceRow[];
};

export const getPartyStanceById = (partyStanceId: number): PartyStanceRow | undefined => {
  return db
    .prepare(
      `SELECT id,
        party_id AS partyId,
        issue,
        stance_text AS stanceText,
        source_url AS sourceUrl,
        source_note AS sourceNote,
        date_said AS dateSaid,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM party_stances
       WHERE id = ?
       LIMIT 1`
    )
    .get(partyStanceId) as PartyStanceRow | undefined;
};

const voteEventSummarySelect = `SELECT ve.id,
  ve.external_key AS externalKey,
  ve.country_code AS countryCode,
  ve.institution_name AS institutionName,
  ve.issue,
  ve.title,
  ve.source_url AS sourceUrl,
  ve.source_note AS sourceNote,
  ve.event_date AS eventDate,
  (
    SELECT COUNT(*)
    FROM politician_vote_records pvr
    WHERE pvr.vote_event_id = ve.id
  ) AS recordCount,
  (
    SELECT COUNT(*)
    FROM canonical_promise_vote_links cpvl
    WHERE cpvl.vote_event_id = ve.id
  ) AS linkedPromiseCount,
  ve.created_at AS createdAt,
  ve.updated_at AS updatedAt`;

export const listVoteEvents = ({ politicianId }: { politicianId?: number }): VoteEventSummaryRow[] => {
  if (politicianId === undefined) {
    const rows = db
      .prepare(
        `${voteEventSummarySelect},
          NULL AS politicianVoteRecordId,
          NULL AS politicianId,
          NULL AS politicianName,
          NULL AS voteValue
         FROM vote_events ve
         ORDER BY ve.event_date DESC, ve.id DESC`
      )
      .all() as VoteEventSummaryRow[];
    return rows.map((row) => ({
      ...row,
      recordCount: Number(row.recordCount ?? 0),
      linkedPromiseCount: Number(row.linkedPromiseCount ?? 0)
    }));
  }

  const rows = db
    .prepare(
      `${voteEventSummarySelect},
        pvr.id AS politicianVoteRecordId,
        pvr.politician_id AS politicianId,
        pol.name AS politicianName,
        pvr.vote_value AS voteValue
       FROM vote_events ve
       JOIN politician_vote_records pvr ON pvr.vote_event_id = ve.id AND pvr.politician_id = ?
       JOIN politicians pol ON pol.id = pvr.politician_id
       WHERE pol.deleted_at IS NULL
       ORDER BY ve.event_date DESC, ve.id DESC`
    )
    .all(politicianId) as VoteEventSummaryRow[];
  return rows.map((row) => ({
    ...row,
    recordCount: Number(row.recordCount ?? 0),
    linkedPromiseCount: Number(row.linkedPromiseCount ?? 0)
  }));
};

export const getVoteEventById = (voteEventId: number): VoteEventSummaryRow | undefined => {
  const row = db
    .prepare(
      `${voteEventSummarySelect},
        NULL AS politicianVoteRecordId,
        NULL AS politicianId,
        NULL AS politicianName,
        NULL AS voteValue
       FROM vote_events ve
       WHERE ve.id = ?
       LIMIT 1`
    )
    .get(voteEventId) as VoteEventSummaryRow | undefined;
  if (!row) {
    return undefined;
  }
  return {
    ...row,
    recordCount: Number(row.recordCount ?? 0),
    linkedPromiseCount: Number(row.linkedPromiseCount ?? 0)
  };
};

export const listVoteEventRecords = (voteEventId: number): VoteEventRecordRow[] => {
  return db
    .prepare(
      `SELECT pvr.id,
        pvr.vote_event_id AS voteEventId,
        pvr.politician_id AS politicianId,
        pol.name AS politicianName,
        pol.region,
        pol.office,
        pvr.vote_value AS voteValue,
        pvr.source_note AS sourceNote,
        pvr.created_at AS createdAt,
        pvr.updated_at AS updatedAt
       FROM politician_vote_records pvr
       JOIN politicians pol ON pol.id = pvr.politician_id
       WHERE pvr.vote_event_id = ? AND pol.deleted_at IS NULL
       ORDER BY pvr.id ASC`
    )
    .all(voteEventId) as VoteEventRecordRow[];
};

const toVoteAlignmentStatus = (
  politicianVoteValue: VoteValue | null,
  alignedVoteValue: Exclude<VoteValue, "absent">
): Exclude<AlignmentStatus, "mixed"> => {
  if (!politicianVoteValue || politicianVoteValue === "absent") {
    return "unknown";
  }
  return politicianVoteValue === alignedVoteValue ? "aligned" : "contradicted";
};

export const listPromiseVoteComparisons = (canonicalPromiseId: number): PromiseVoteComparisonRow[] => {
  const rows = db
    .prepare(
      `SELECT cpvl.id AS linkId,
        cpvl.canonical_promise_id AS canonicalPromiseId,
        cpvl.vote_event_id AS voteEventId,
        cpvl.aligned_vote_value AS alignedVoteValue,
        cpvl.comparison_note AS comparisonNote,
        cpvl.created_at AS createdAt,
        cpvl.updated_at AS updatedAt,
        ve.title AS eventTitle,
        ve.event_date AS eventDate,
        ve.source_url AS eventSourceUrl,
        ve.source_note AS eventSourceNote,
        ve.external_key AS externalKey,
        ve.country_code AS countryCode,
        ve.institution_name AS institutionName,
        ve.issue,
        pvr.id AS politicianVoteRecordId,
        pvr.vote_value AS politicianVoteValue,
        pvr.source_note AS politicianVoteSourceNote
       FROM canonical_promise_vote_links cpvl
       JOIN canonical_promises cp ON cp.id = cpvl.canonical_promise_id
       JOIN vote_events ve ON ve.id = cpvl.vote_event_id
       LEFT JOIN politician_vote_records pvr ON pvr.vote_event_id = ve.id AND pvr.politician_id = cp.politician_id
       WHERE cpvl.canonical_promise_id = ?
       ORDER BY ve.event_date DESC, cpvl.id DESC`
    )
    .all(canonicalPromiseId) as Array<Omit<PromiseVoteComparisonRow, "alignmentStatus">>;

  return rows.map((row) => ({
    ...row,
    alignmentStatus: toVoteAlignmentStatus(row.politicianVoteValue, row.alignedVoteValue)
  }));
};

export const summarizePromiseVoteAlignment = (rows: PromiseVoteComparisonRow[]): AlignmentStatus => {
  let hasAligned = false;
  let hasContradicted = false;
  for (const row of rows) {
    if (row.alignmentStatus === "aligned") {
      hasAligned = true;
    } else if (row.alignmentStatus === "contradicted") {
      hasContradicted = true;
    }
  }

  if (hasAligned && hasContradicted) {
    return "mixed";
  }
  if (hasAligned) {
    return "aligned";
  }
  if (hasContradicted) {
    return "contradicted";
  }
  return "unknown";
};

export const listPromiseFulfillmentAssessments = (canonicalPromiseId: number): PromiseFulfillmentAssessmentRow[] => {
  return db
    .prepare(
      `SELECT id,
        canonical_promise_id AS canonicalPromiseId,
        status,
        summary,
        source_url AS sourceUrl,
        source_note AS sourceNote,
        evidence_date AS evidenceDate,
        created_by AS createdBy,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM promise_fulfillment_assessments
       WHERE canonical_promise_id = ?
       ORDER BY evidence_date DESC, id DESC`
    )
    .all(canonicalPromiseId) as PromiseFulfillmentAssessmentRow[];
};

export const getLatestPromiseFulfillmentAssessment = (
  canonicalPromiseId: number
): PromiseFulfillmentAssessmentRow | undefined => {
  return db
    .prepare(
      `SELECT id,
        canonical_promise_id AS canonicalPromiseId,
        status,
        summary,
        source_url AS sourceUrl,
        source_note AS sourceNote,
        evidence_date AS evidenceDate,
        created_by AS createdBy,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM promise_fulfillment_assessments
       WHERE canonical_promise_id = ?
       ORDER BY evidence_date DESC, id DESC
       LIMIT 1`
    )
    .get(canonicalPromiseId) as PromiseFulfillmentAssessmentRow | undefined;
};

export const listPromisePartyAlignments = (canonicalPromiseId: number): PromisePartyAlignmentRow[] => {
  return db
    .prepare(
      `SELECT paa.id,
        paa.canonical_promise_id AS canonicalPromiseId,
        paa.party_stance_id AS partyStanceId,
        paa.status,
        paa.reason,
        paa.created_by AS createdBy,
        paa.created_at AS createdAt,
        paa.updated_at AS updatedAt,
        ps.party_id AS partyId,
        p.name AS partyName,
        p.short_name AS partyShortName,
        ps.issue,
        ps.stance_text AS stanceText,
        ps.source_url AS sourceUrl,
        ps.source_note AS sourceNote,
        ps.date_said AS dateSaid
       FROM party_alignment_assessments paa
       JOIN party_stances ps ON ps.id = paa.party_stance_id
       JOIN parties p ON p.id = ps.party_id
       WHERE paa.canonical_promise_id = ? AND p.deleted_at IS NULL
       ORDER BY paa.id DESC`
    )
    .all(canonicalPromiseId) as PromisePartyAlignmentRow[];
};

export const politicianHasPartyMembership = (politicianId: number, partyId: string): boolean => {
  const row = db
    .prepare(
      `SELECT 1
       FROM party_memberships
       WHERE politician_id = ? AND party_id = ?
       LIMIT 1`
    )
    .get(politicianId, partyId) as { "1"?: number } | undefined;
  return Boolean(row);
};
