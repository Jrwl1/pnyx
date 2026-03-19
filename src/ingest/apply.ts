// WHAT IT DO? Applies or rejects staged ingest items into the live accountability tables through explicit operator actions.

import { db } from "../db/client.js";
import { getCanonicalPromiseById } from "../db/canonical-promises.js";
import { getIngestStageItemById, updateIngestStageItem } from "../db/ingest.js";
import { getPartyById } from "../db/party-graph.js";
import { getVoteEventById } from "../db/trust-records.js";

type ApplyResult = { entityKind: string; entityId: string };

const parseJson = <T>(value: string): T => JSON.parse(value) as T;

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
