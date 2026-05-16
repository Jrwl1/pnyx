// WHAT IT DO? Applies or rejects staged ingest items into the live accountability tables through explicit operator actions.

import crypto from "node:crypto";

import { db } from "../db/client.js";
import { getIngestStageItemById, updateIngestStageItem } from "../db/ingest.js";
import { getPartyById } from "../db/party-graph.js";
import { getVoteEventById } from "../db/trust-records.js";

type ApplyResult = { entityKind: string; entityId: string };

type PoliticianStatementStage = {
  politicianId?: number;
  politicianName?: string;
  statementText?: string;
  dateSaid?: string;
  person?: string;
  claimText?: string;
  publishedAt?: string;
  sourceUrl: string;
  reviewStatus: string;
};

const parseJson = <T>(value: string): T => JSON.parse(value) as T;

const requireTrimmed = (value: string | undefined, label: string): string => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    throw new Error(`politician statement requires ${label}`);
  }
  return trimmed;
};

export const applyIngestStageItem = (stageItemId: number, actorId: string): ApplyResult => {
  const stageItem = getIngestStageItemById(stageItemId);
  if (!stageItem) {
    throw new Error("stage item not found");
  }
  if (stageItem.status !== "pending") {
    throw new Error("stage item is not pending");
  }

  const applyTx = db.transaction(() => {
    if (stageItem.stageType === "vote_event") {
      const normalized = parseJson<{
        externalKey: string;
        countryCode: string;
        institutionName: string;
        issue: string | null;
        title: string;
        sourceUrl: string;
        sourceNote: string | null;
        eventDate: string;
      }>(stageItem.normalizedJson);

      const existing = db
        .prepare("SELECT id FROM vote_events WHERE external_key = ? LIMIT 1")
        .get(normalized.externalKey) as { id: number } | undefined;
      const voteEventId =
        existing?.id ??
        ((db
          .prepare(
            `INSERT INTO vote_events (external_key, country_code, institution_name, issue, title, source_url, source_note, event_date, created_by, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          )
          .run(
            normalized.externalKey,
            normalized.countryCode,
            normalized.institutionName,
            normalized.issue,
            normalized.title,
            normalized.sourceUrl,
            normalized.sourceNote,
            normalized.eventDate,
            actorId
          ).lastInsertRowid as number));

      updateIngestStageItem(stageItemId, {
        status: "applied",
        appliedEntityKind: "vote_event",
        appliedEntityId: String(voteEventId),
        decidedBy: actorId,
        decidedAt: new Date().toISOString(),
        errorMessage: null
      });
      return { entityKind: "vote_event", entityId: String(voteEventId) };
    }

    if (stageItem.stageType === "vote_record") {
      const normalized = parseJson<{
        voteEventExternalKey: string;
        politicianExternalId: string | null;
        politicianName: string;
        voteValue: "for" | "against" | "abstain" | "absent";
        sourceNote: string | null;
      }>(stageItem.normalizedJson);

      const voteEvent = db
        .prepare("SELECT id FROM vote_events WHERE external_key = ? LIMIT 1")
        .get(normalized.voteEventExternalKey) as { id: number } | undefined;
      if (!voteEvent || !getVoteEventById(voteEvent.id)) {
        throw new Error("vote event must be applied before vote records");
      }
      if (!normalized.politicianExternalId) {
        throw new Error("stage item is missing politicianExternalId");
      }

      const politician = db
        .prepare("SELECT id FROM politicians WHERE external_id = ? AND deleted_at IS NULL LIMIT 1")
        .get(normalized.politicianExternalId) as { id: number } | undefined;
      if (!politician) {
        throw new Error("matching politician external_id not found");
      }

      const existing = db
        .prepare("SELECT id FROM politician_vote_records WHERE vote_event_id = ? AND politician_id = ? LIMIT 1")
        .get(voteEvent.id, politician.id) as { id: number } | undefined;
      const voteRecordId =
        existing?.id ??
        ((db
          .prepare(
            `INSERT INTO politician_vote_records (vote_event_id, politician_id, vote_value, source_note, created_by, updated_at)
             VALUES (?, ?, ?, ?, ?, datetime('now'))`
          )
          .run(voteEvent.id, politician.id, normalized.voteValue, normalized.sourceNote, actorId).lastInsertRowid as number));

      updateIngestStageItem(stageItemId, {
        status: "applied",
        appliedEntityKind: "vote_record",
        appliedEntityId: String(voteRecordId),
        decidedBy: actorId,
        decidedAt: new Date().toISOString(),
        errorMessage: null
      });
      return { entityKind: "vote_record", entityId: String(voteRecordId) };
    }

    if (stageItem.stageType === "politician_statement") {
      const normalized = parseJson<PoliticianStatementStage>(stageItem.normalizedJson);
      if (normalized.reviewStatus !== "reviewed") {
        throw new Error("politician statement must be reviewed before apply");
      }

      const politicianName = normalized.politicianName?.trim() || normalized.person?.trim();
      const statementText = requireTrimmed(normalized.statementText ?? normalized.claimText, "statementText");
      const sourceUrl = requireTrimmed(normalized.sourceUrl, "sourceUrl");
      const dateSaid = requireTrimmed(normalized.dateSaid ?? normalized.publishedAt, "dateSaid");

      const politician = normalized.politicianId
        ? (db
            .prepare("SELECT id FROM politicians WHERE id = ? AND deleted_at IS NULL LIMIT 1")
            .get(normalized.politicianId) as { id: number } | undefined)
        : politicianName
          ? (db
              .prepare("SELECT id FROM politicians WHERE name = ? AND deleted_at IS NULL LIMIT 1")
              .get(politicianName) as { id: number } | undefined)
          : undefined;
      if (!politician) {
        throw new Error("politician statement requires an existing politician");
      }

      const normalizedBodyHash = crypto.createHash("sha256").update(statementText.toLowerCase()).digest("hex");
      const statementFingerprint = crypto.createHash("sha256").update(`${politician.id}|${normalizedBodyHash}|${sourceUrl}`).digest("hex");
      const existing = db
        .prepare("SELECT id FROM statements WHERE statement_fingerprint = ? AND deleted_at IS NULL LIMIT 1")
        .get(statementFingerprint) as { id: number } | undefined;
      const statementId =
        existing?.id ??
        ((db
          .prepare(
            "INSERT INTO statements (politician_id, source_url, body, date_said, normalized_body_hash, statement_fingerprint, verification_status, author_id) VALUES (?, ?, ?, ?, ?, ?, 'verified', ?)"
          )
          .run(politician.id, sourceUrl, statementText, dateSaid, normalizedBodyHash, statementFingerprint, actorId).lastInsertRowid as number));

      updateIngestStageItem(stageItemId, {
        status: "applied",
        appliedEntityKind: "statement",
        appliedEntityId: String(statementId),
        decidedBy: actorId,
        decidedAt: new Date().toISOString(),
        errorMessage: null
      });
      return { entityKind: "statement", entityId: String(statementId) };
    }

    const normalized = parseJson<{
      partyId: string;
      issue: string | null;
      stanceText: string;
      sourceUrl: string;
      sourceNote: string | null;
      dateSaid: string;
    }>(stageItem.normalizedJson);
    if (!getPartyById(normalized.partyId)) {
      throw new Error("party must exist before applying staged party stance");
    }

    const existing = db
      .prepare(
        `SELECT id FROM party_stances
         WHERE party_id = ? AND source_url = ? AND date_said = ? AND stance_text = ?
         LIMIT 1`
      )
      .get(normalized.partyId, normalized.sourceUrl, normalized.dateSaid, normalized.stanceText) as { id: number } | undefined;
    const partyStanceId =
      existing?.id ??
      ((db
        .prepare(
          `INSERT INTO party_stances (party_id, issue, stance_text, source_url, source_note, date_said, created_by, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
        )
        .run(
          normalized.partyId,
          normalized.issue,
          normalized.stanceText,
          normalized.sourceUrl,
          normalized.sourceNote,
          normalized.dateSaid,
          actorId
        ).lastInsertRowid as number));

    updateIngestStageItem(stageItemId, {
      status: "applied",
      appliedEntityKind: "party_stance",
      appliedEntityId: String(partyStanceId),
      decidedBy: actorId,
      decidedAt: new Date().toISOString(),
      errorMessage: null
    });
    return { entityKind: "party_stance", entityId: String(partyStanceId) };
  });

  return applyTx();
};

export const rejectIngestStageItem = (stageItemId: number, actorId: string): void => {
  const stageItem = getIngestStageItemById(stageItemId);
  if (!stageItem) {
    throw new Error("stage item not found");
  }
  if (stageItem.status !== "pending") {
    throw new Error("stage item is not pending");
  }

  updateIngestStageItem(stageItemId, {
    status: "rejected",
    decidedBy: actorId,
    decidedAt: new Date().toISOString(),
    errorMessage: null
  });
};
