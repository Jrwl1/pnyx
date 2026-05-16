// WHAT IT DO? Proves official-source ingest runs, stage items, apply, and reject flows work through the protected operator APIs.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";
import { addRawRecord, addStageItem, getIngestStageItemById, markIngestStageItemNeedsSource } from "../src/db/ingest.js";
import { applyIngestStageItem } from "../src/ingest/apply.js";

const originalFetch = globalThis.fetch;

const clearAllTables = (): void => {
  db.exec("DELETE FROM ingest_stage_items");
  db.exec("DELETE FROM ingest_raw_records");
  db.exec("DELETE FROM ingest_runs");
  db.exec("DELETE FROM product_events");
  db.exec("DELETE FROM party_stances");
  db.exec("DELETE FROM revision_audits");
  db.exec("DELETE FROM statements");
  db.exec("DELETE FROM politician_vote_records");
  db.exec("DELETE FROM vote_events");
  db.exec("DELETE FROM party_aliases");
  db.exec("DELETE FROM party_memberships");
  db.exec("DELETE FROM parties");
  db.exec("DELETE FROM politicians");
};

describe("ingest", () => {
  beforeEach(() => {
    clearAllTables();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("runs official-source imports and supports apply or reject review actions", async () => {
    db.prepare(
      "INSERT INTO parties (id, name, short_name, country_code, created_by) VALUES (?, ?, ?, ?, ?)"
    ).run("sdp", "Suomen Sosialidemokraattinen Puolue", "SDP", "FI", "system");
    db.prepare(
      "INSERT INTO politicians (name, region, office, external_id, verified, created_by) VALUES (?, ?, ?, ?, 0, ?)"
    ).run("Markus Aaltonen", "Helsinki", "MP", "102", "system");

    globalThis.fetch = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("SaliDBAanestys/rows?columnName=AanestysId")) {
        return new Response(
          JSON.stringify({
            columnNames: ["AanestysId", "IstuntoPvm", "AanestysOtsikko", "PaaKohtaOtsikko", "Url", "AanestysPoytakirja"],
            rowData: [["55554", "2025-10-09 21:00:00", "Vote title", "Climate topic", "/aanestystulos/1/94/2025", "PTK 94/2025 vp"]]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("SaliDBAanestysEdustaja/rows?columnName=AanestysId")) {
        return new Response(
          JSON.stringify({
            columnNames: [
              "EdustajaId",
              "AanestysId",
              "EdustajaEtunimi",
              "EdustajaSukunimi",
              "EdustajaHenkiloNumero",
              "EdustajaRyhmaLyhenne",
              "EdustajaAanestys"
            ],
            rowData: [
              ["2736692", "55554", "Markus", "Aaltonen", "102", "sd", "Jaa"],
              ["2736693", "55554", "Missing", "Member", "999", "sd", "Ei"]
            ]
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("sdp.fi/ajankohtaista")) {
        return new Response(
          `
          <html>
            <head>
              <title>Official SDP climate article - SDP</title>
              <meta property="og:title" content="Official SDP climate article - SDP" />
              <meta property="og:description" content="Official party stance description." />
              <meta property="article:published_time" content="2025-09-04T12:32:00+00:00" />
            </head>
            <body><article><h1>Official SDP climate article</h1></article></body>
          </html>
          `,
          { status: 200, headers: { "Content-Type": "text/html" } }
        );
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    const moderator = await authHeaders("ingest-mod", "moderator");

    const voteRun = await request(app)
      .post("/ops/import-runs")
      .set(moderator)
      .send({ sourceKey: "eduskunta_vote_55554" })
      .expect(201);
    expect(voteRun.body.run).toMatchObject({ sourceKey: "eduskunta_vote_55554", status: "staged" });

    const voteRunDetail = await request(app).get(`/ops/import-runs/${voteRun.body.run.id}`).set(moderator).expect(200);
    const voteEventItem = voteRunDetail.body.stageItems.find((item: { stageType: string }) => item.stageType === "vote_event");
    const voteRecordItems = voteRunDetail.body.stageItems.filter((item: { stageType: string }) => item.stageType === "vote_record");
    expect(voteEventItem).toBeTruthy();
    expect(voteRecordItems).toHaveLength(2);
    const mappedVoteRecord = voteRecordItems.find(
      (item: { normalized: { politicianExternalId?: string } }) => item.normalized.politicianExternalId === "102"
    );
    const unmatchedVoteRecord = voteRecordItems.find(
      (item: { normalized: { politicianExternalId?: string } }) => item.normalized.politicianExternalId === "999"
    );

    await request(app).post(`/ops/stage-items/${voteEventItem.id}/apply`).set(moderator).expect(200);
    await request(app).post(`/ops/stage-items/${mappedVoteRecord.id}/apply`).set(moderator).expect(200);
    await request(app).post(`/ops/stage-items/${unmatchedVoteRecord.id}/reject`).set(moderator).expect(200);

    const voteEvent = db.prepare("SELECT external_key AS externalKey FROM vote_events WHERE external_key = ?").get("eduskunta:55554") as
      | { externalKey: string }
      | undefined;
    expect(voteEvent).toMatchObject({ externalKey: "eduskunta:55554" });
    const voteRecord = db
      .prepare(
        "SELECT vote_value AS voteValue FROM politician_vote_records WHERE politician_id = (SELECT id FROM politicians WHERE external_id = '102')"
      )
      .get() as { voteValue: string };
    expect(voteRecord.voteValue).toBe("for");

    const stanceRun = await request(app)
      .post("/ops/import-runs")
      .set(moderator)
      .send({ sourceKey: "sdp_climate_article_2025_09_04" })
      .expect(201);
    const stanceRunDetail = await request(app).get(`/ops/import-runs/${stanceRun.body.run.id}`).set(moderator).expect(200);
    const partyStanceItem = stanceRunDetail.body.stageItems.find((item: { stageType: string }) => item.stageType === "party_stance");
    expect(partyStanceItem).toBeTruthy();

    await request(app).post(`/ops/stage-items/${partyStanceItem.id}/apply`).set(moderator).expect(200);

    const partyStance = db.prepare("SELECT party_id AS partyId, date_said AS dateSaid FROM party_stances WHERE party_id = 'sdp'").get() as
      | { partyId: string; dateSaid: string }
      | undefined;
    expect(partyStance).toMatchObject({ partyId: "sdp", dateSaid: "2025-09-04" });
  });

  it("lists the research watch pulse import source", async () => {
    const moderator = await authHeaders("research-source-mod", "moderator");

    const response = await request(app).get("/ops/import-sources").set(moderator).expect(200);

    expect(response.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceKey: "research_watch_pulse_fi",
          sourceFamily: "research_watch_pulse",
          label: "Research watch pulse FI"
        })
      ])
    );
  });

  it("stores politician statement stage items and marks candidates as needing source", () => {
    const runId = db
      .prepare("INSERT INTO ingest_runs (source_family, source_key, triggered_by) VALUES (?, ?, ?)")
      .run("research_watch_pulse", "research_watch_pulse_fi", "test").lastInsertRowid as number;
    const rawRecordId = addRawRecord({
      runId,
      sourceFamily: "research_watch_pulse",
      sourceKey: "research_watch_pulse_fi",
      recordType: "politician_statement",
      sourceRecordKey: "statement-1",
      sourceUrl: "https://valtioneuvosto.fi/example",
      payload: { ok: true }
    });

    const stageItemId = addStageItem({
      runId,
      rawRecordId,
      stageType: "politician_statement",
      sourceKey: "research_watch_pulse_fi",
      dedupeKey: "research:statement-1",
      normalized: {
        politicianName: "Petteri Orpo",
        statementText: "The government will reduce debt.",
        sourceUrl: "https://valtioneuvosto.fi/example",
        dateSaid: "2026-05-16",
        reviewStatus: "pending"
      }
    });

    expect(getIngestStageItemById(stageItemId)?.stageType).toBe("politician_statement");

    markIngestStageItemNeedsSource(stageItemId, "moderator");

    expect(getIngestStageItemById(stageItemId)).toMatchObject({
      status: "needs_source",
      decidedBy: "moderator",
      errorMessage: "Needs stronger source confirmation before publication"
    });
  });

  it("lets moderators mark research stage items as needing stronger source confirmation", async () => {
    const runId = db
      .prepare("INSERT INTO ingest_runs (source_family, source_key, triggered_by) VALUES (?, ?, ?)")
      .run("research_watch_pulse", "research_watch_pulse_fi", "test").lastInsertRowid as number;
    const rawRecordId = addRawRecord({
      runId,
      sourceFamily: "research_watch_pulse",
      sourceKey: "research_watch_pulse_fi",
      recordType: "fulfillment_assessment",
      sourceRecordKey: "needs-source-1",
      sourceUrl: "https://yle.fi/a/74-20000000",
      payload: { ok: true }
    });
    const stageItemId = addStageItem({
      runId,
      rawRecordId,
      stageType: "fulfillment_assessment",
      sourceKey: "research_watch_pulse_fi",
      dedupeKey: "research:needs-source-1",
      normalized: {
        status: "in_progress",
        summary: "Article-only fulfillment signal.",
        sourceUrl: "https://yle.fi/a/74-20000000",
        sourceNote: "Article source",
        evidenceDate: "2026-05-16",
        reviewStatus: "pending",
        needsOfficialConfirmation: true
      }
    });
    const moderator = await authHeaders("needs-source-mod", "moderator");

    await request(app).post(`/ops/stage-items/${stageItemId}/needs-source`).set(moderator).expect(200);

    expect(getIngestStageItemById(stageItemId)?.status).toBe("needs_source");
  });

  it("applies reviewed politician statement stage items from research candidates without auto-applying during staging", () => {
    db.prepare(
      "INSERT INTO politicians (name, region, office, external_id, verified, created_by) VALUES (?, ?, ?, ?, 1, ?)"
    ).run("Petteri Orpo", "Uusimaa", "Prime Minister", "petteri-orpo", "system");
    const politicianId = db.prepare("SELECT id FROM politicians WHERE external_id = ?").pluck().get("petteri-orpo") as number;
    const runId = db
      .prepare("INSERT INTO ingest_runs (source_family, source_key, triggered_by) VALUES (?, ?, ?)")
      .run("research_watch_pulse", "research_watch_pulse_fi", "test").lastInsertRowid as number;
    const rawRecordId = addRawRecord({
      runId,
      sourceFamily: "research_watch_pulse",
      sourceKey: "research_watch_pulse_fi",
      recordType: "politician_statement",
      sourceRecordKey: "statement-apply-1",
      sourceUrl: "https://valtioneuvosto.fi/example",
      payload: { ok: true }
    });
    const stageItemId = addStageItem({
      runId,
      rawRecordId,
      stageType: "politician_statement",
      sourceKey: "research_watch_pulse_fi",
      dedupeKey: "research:statement-apply-1",
      normalized: {
        person: "Petteri Orpo",
        claimText: "The government will reduce debt.",
        sourceUrl: "https://valtioneuvosto.fi/example",
        publishedAt: "2026-05-16",
        reviewStatus: "reviewed"
      }
    });
    const duplicateStageItemId = addStageItem({
      runId,
      rawRecordId,
      stageType: "politician_statement",
      sourceKey: "research_watch_pulse_fi",
      dedupeKey: "research:statement-apply-duplicate",
      normalized: {
        person: "Petteri Orpo",
        claimText: "The government will reduce debt.",
        sourceUrl: "https://valtioneuvosto.fi/example",
        publishedAt: "2026-05-16",
        reviewStatus: "reviewed"
      }
    });

    expect(Number(db.prepare("SELECT COUNT(*) FROM statements").pluck().get())).toBe(0);

    const result = applyIngestStageItem(stageItemId, "moderator");
    const duplicateResult = applyIngestStageItem(duplicateStageItemId, "moderator");

    expect(result.entityKind).toBe("statement");
    expect(duplicateResult).toEqual(result);
    expect(Number(db.prepare("SELECT COUNT(*) FROM statements WHERE verification_status = 'verified'").pluck().get())).toBe(1);
    expect(
      db
        .prepare(
          "SELECT actor_id AS actorId, change_type AS changeType, to_value AS toValue FROM revision_audits WHERE statement_id = ? ORDER BY id"
        )
        .all(Number(result.entityId))
    ).toEqual([{ actorId: "moderator", changeType: "createStatement", toValue: "The government will reduce debt." }]);
    expect(
      db
        .prepare(
          "SELECT event_domain AS eventDomain, event_name AS eventName, actor_id AS actorId, entity_kind AS entityKind, entity_id AS entityId, metadata_json AS metadataJson FROM product_events ORDER BY id"
        )
        .all()
    ).toEqual([
      {
        eventDomain: "contribution",
        eventName: "statement_submitted",
        actorId: "moderator",
        entityKind: "statement",
        entityId: result.entityId,
        metadataJson: JSON.stringify({ politicianId })
      }
    ]);
  });

  it("applies reviewed politician statement stage items from planned normalized shape", () => {
    db.prepare(
      "INSERT INTO politicians (name, region, office, external_id, verified, created_by) VALUES (?, ?, ?, ?, 1, ?)"
    ).run("Petteri Orpo", "Uusimaa", "Prime Minister", "petteri-orpo", "system");
    const politicianId = db.prepare("SELECT id FROM politicians WHERE name = ?").pluck().get("Petteri Orpo") as number;
    const runId = db
      .prepare("INSERT INTO ingest_runs (source_family, source_key, triggered_by) VALUES (?, ?, ?)")
      .run("research_watch_pulse", "research_watch_pulse_fi", "test").lastInsertRowid as number;
    const rawRecordId = addRawRecord({
      runId,
      sourceFamily: "research_watch_pulse",
      sourceKey: "research_watch_pulse_fi",
      recordType: "politician_statement",
      sourceRecordKey: "statement-apply-planned",
      sourceUrl: "https://valtioneuvosto.fi/planned",
      payload: { ok: true }
    });
    const stageItemId = addStageItem({
      runId,
      rawRecordId,
      stageType: "politician_statement",
      sourceKey: "research_watch_pulse_fi",
      dedupeKey: "research:statement-apply-planned",
      normalized: {
        politicianId,
        politicianName: "Petteri Orpo",
        statementText: "The budget will prioritize employment.",
        sourceUrl: "https://valtioneuvosto.fi/planned",
        dateSaid: "2026-05-16",
        reviewStatus: "reviewed"
      }
    });

    const result = applyIngestStageItem(stageItemId, "moderator");

    expect(result.entityKind).toBe("statement");
    expect(Number(db.prepare("SELECT COUNT(*) FROM statements WHERE body = ?").pluck().get("The budget will prioritize employment."))).toBe(1);
  });

  it("rejects reviewed politician statement stage items with ambiguous name-only politician lookup", () => {
    db.prepare(
      "INSERT INTO politicians (name, region, office, external_id, verified, created_by) VALUES (?, ?, ?, ?, 1, ?)"
    ).run("Petteri Orpo", "Uusimaa", "Prime Minister", "petteri-orpo-1", "system");
    db.prepare(
      "INSERT INTO politicians (name, region, office, external_id, verified, created_by) VALUES (?, ?, ?, ?, 1, ?)"
    ).run("Petteri Orpo", "Varsinais-Suomi", "MP", "petteri-orpo-2", "system");
    const runId = db
      .prepare("INSERT INTO ingest_runs (source_family, source_key, triggered_by) VALUES (?, ?, ?)")
      .run("research_watch_pulse", "research_watch_pulse_fi", "test").lastInsertRowid as number;
    const rawRecordId = addRawRecord({
      runId,
      sourceFamily: "research_watch_pulse",
      sourceKey: "research_watch_pulse_fi",
      recordType: "politician_statement",
      sourceRecordKey: "statement-ambiguous",
      sourceUrl: "https://valtioneuvosto.fi/ambiguous",
      payload: { ok: true }
    });
    const stageItemId = addStageItem({
      runId,
      rawRecordId,
      stageType: "politician_statement",
      sourceKey: "research_watch_pulse_fi",
      dedupeKey: "research:statement-ambiguous",
      normalized: {
        politicianName: "Petteri Orpo",
        statementText: "The statement needs an explicit politician id.",
        sourceUrl: "https://valtioneuvosto.fi/ambiguous",
        dateSaid: "2026-05-16",
        reviewStatus: "reviewed"
      }
    });

    expect(() => applyIngestStageItem(stageItemId, "moderator")).toThrow(
      "politician statement name is ambiguous; provide politicianId"
    );
    expect(Number(db.prepare("SELECT COUNT(*) FROM statements").pluck().get())).toBe(0);
  });

  it("uses politicianId for reviewed politician statement stage items when politicianName is ambiguous", () => {
    db.prepare(
      "INSERT INTO politicians (name, region, office, external_id, verified, created_by) VALUES (?, ?, ?, ?, 1, ?)"
    ).run("Petteri Orpo", "Uusimaa", "Prime Minister", "petteri-orpo-1", "system");
    db.prepare(
      "INSERT INTO politicians (name, region, office, external_id, verified, created_by) VALUES (?, ?, ?, ?, 1, ?)"
    ).run("Petteri Orpo", "Varsinais-Suomi", "MP", "petteri-orpo-2", "system");
    const politicianId = db.prepare("SELECT id FROM politicians WHERE external_id = ?").pluck().get("petteri-orpo-2") as number;
    const runId = db
      .prepare("INSERT INTO ingest_runs (source_family, source_key, triggered_by) VALUES (?, ?, ?)")
      .run("research_watch_pulse", "research_watch_pulse_fi", "test").lastInsertRowid as number;
    const rawRecordId = addRawRecord({
      runId,
      sourceFamily: "research_watch_pulse",
      sourceKey: "research_watch_pulse_fi",
      recordType: "politician_statement",
      sourceRecordKey: "statement-explicit-politician-id",
      sourceUrl: "https://valtioneuvosto.fi/explicit",
      payload: { ok: true }
    });
    const stageItemId = addStageItem({
      runId,
      rawRecordId,
      stageType: "politician_statement",
      sourceKey: "research_watch_pulse_fi",
      dedupeKey: "research:statement-explicit-politician-id",
      normalized: {
        politicianId,
        politicianName: "Petteri Orpo",
        statementText: "The explicit politician id should be used.",
        sourceUrl: "https://valtioneuvosto.fi/explicit",
        dateSaid: "2026-05-16",
        reviewStatus: "reviewed"
      }
    });

    const result = applyIngestStageItem(stageItemId, "moderator");

    expect(result.entityKind).toBe("statement");
    expect(
      db.prepare("SELECT politician_id AS politicianId FROM statements WHERE id = ?").get(Number(result.entityId))
    ).toEqual({ politicianId });
  });

  it("rejects unreviewed politician statement stage item apply", () => {
    db.prepare(
      "INSERT INTO politicians (name, region, office, external_id, verified, created_by) VALUES (?, ?, ?, ?, 1, ?)"
    ).run("Petteri Orpo", "Uusimaa", "Prime Minister", "petteri-orpo", "system");
    const runId = db
      .prepare("INSERT INTO ingest_runs (source_family, source_key, triggered_by) VALUES (?, ?, ?)")
      .run("research_watch_pulse", "research_watch_pulse_fi", "test").lastInsertRowid as number;
    const rawRecordId = addRawRecord({
      runId,
      sourceFamily: "research_watch_pulse",
      sourceKey: "research_watch_pulse_fi",
      recordType: "politician_statement",
      sourceRecordKey: "statement-unreviewed",
      sourceUrl: "https://valtioneuvosto.fi/unreviewed",
      payload: { ok: true }
    });
    const stageItemId = addStageItem({
      runId,
      rawRecordId,
      stageType: "politician_statement",
      sourceKey: "research_watch_pulse_fi",
      dedupeKey: "research:statement-unreviewed",
      normalized: {
        politicianName: "Petteri Orpo",
        statementText: "The government will reduce debt.",
        sourceUrl: "https://valtioneuvosto.fi/unreviewed",
        dateSaid: "2026-05-16",
        reviewStatus: "pending"
      }
    });

    expect(() => applyIngestStageItem(stageItemId, "moderator")).toThrow("politician statement must be reviewed before apply");
    expect(Number(db.prepare("SELECT COUNT(*) FROM statements").pluck().get())).toBe(0);
  });

  it("deduplicates stage items within a single run only", () => {
    const firstRunId = db
      .prepare("INSERT INTO ingest_runs (source_family, source_key, triggered_by) VALUES (?, ?, ?)")
      .run("research_watch_pulse", "research_watch_pulse_fi", "test").lastInsertRowid as number;
    const secondRunId = db
      .prepare("INSERT INTO ingest_runs (source_family, source_key, triggered_by) VALUES (?, ?, ?)")
      .run("research_watch_pulse", "research_watch_pulse_fi", "test").lastInsertRowid as number;
    const firstRawRecordId = addRawRecord({
      runId: firstRunId,
      sourceFamily: "research_watch_pulse",
      sourceKey: "research_watch_pulse_fi",
      recordType: "politician_statement",
      sourceRecordKey: "statement-1",
      payload: { text: "first" }
    });
    const secondRawRecordId = addRawRecord({
      runId: secondRunId,
      sourceFamily: "research_watch_pulse",
      sourceKey: "research_watch_pulse_fi",
      recordType: "politician_statement",
      sourceRecordKey: "statement-2",
      payload: { text: "second" }
    });

    const firstStageItemId = addStageItem({
      runId: firstRunId,
      rawRecordId: firstRawRecordId,
      stageType: "politician_statement",
      sourceKey: "research_watch_pulse_fi",
      dedupeKey: "research:statement-shared",
      normalized: { statementText: "first" }
    });
    const secondStageItemId = addStageItem({
      runId: secondRunId,
      rawRecordId: secondRawRecordId,
      stageType: "politician_statement",
      sourceKey: "research_watch_pulse_fi",
      dedupeKey: "research:statement-shared",
      normalized: { statementText: "second" }
    });
    const updatedFirstStageItemId = addStageItem({
      runId: firstRunId,
      rawRecordId: firstRawRecordId,
      stageType: "politician_statement",
      sourceKey: "research_watch_pulse_fi",
      dedupeKey: "research:statement-shared",
      normalized: { statementText: "first updated" }
    });

    expect(secondStageItemId).not.toBe(firstStageItemId);
    expect(updatedFirstStageItemId).toBe(firstStageItemId);
    expect(getIngestStageItemById(firstStageItemId)).toMatchObject({
      runId: firstRunId,
      rawRecordId: firstRawRecordId,
      normalizedJson: JSON.stringify({ statementText: "first updated" })
    });
    expect(getIngestStageItemById(secondStageItemId)).toMatchObject({
      runId: secondRunId,
      rawRecordId: secondRawRecordId,
      normalizedJson: JSON.stringify({ statementText: "second" })
    });
  });

  it("keeps identical raw records scoped to their ingest run when cascading deletes", () => {
    db.pragma("foreign_keys = ON");
    try {
      const firstRunId = db
        .prepare("INSERT INTO ingest_runs (source_family, source_key, triggered_by) VALUES (?, ?, ?)")
        .run("research_watch_pulse", "research_watch_pulse_fi", "test").lastInsertRowid as number;
      const secondRunId = db
        .prepare("INSERT INTO ingest_runs (source_family, source_key, triggered_by) VALUES (?, ?, ?)")
        .run("research_watch_pulse", "research_watch_pulse_fi", "test").lastInsertRowid as number;
      const sharedRawRecord = {
        sourceFamily: "research_watch_pulse",
        sourceKey: "research_watch_pulse_fi",
        recordType: "politician_statement",
        sourceRecordKey: "shared-statement",
        sourceUrl: "https://valtioneuvosto.fi/shared",
        payload: { text: "same official statement" }
      };

      const firstRawRecordId = addRawRecord({ runId: firstRunId, ...sharedRawRecord });
      const secondRawRecordId = addRawRecord({ runId: secondRunId, ...sharedRawRecord });

      const firstStageItemId = addStageItem({
        runId: firstRunId,
        rawRecordId: firstRawRecordId,
        stageType: "politician_statement",
        sourceKey: "research_watch_pulse_fi",
        dedupeKey: "research:shared-statement",
        normalized: { statementText: "same official statement" }
      });
      const secondStageItemId = addStageItem({
        runId: secondRunId,
        rawRecordId: secondRawRecordId,
        stageType: "politician_statement",
        sourceKey: "research_watch_pulse_fi",
        dedupeKey: "research:shared-statement",
        normalized: { statementText: "same official statement" }
      });

      expect(secondRawRecordId).not.toBe(firstRawRecordId);
      expect(getIngestStageItemById(secondStageItemId)).toMatchObject({
        runId: secondRunId,
        rawRecordId: secondRawRecordId
      });

      db.prepare("DELETE FROM ingest_runs WHERE id = ?").run(firstRunId);

      expect(getIngestStageItemById(firstStageItemId)).toBeUndefined();
      expect(getIngestStageItemById(secondStageItemId)).toMatchObject({
        runId: secondRunId,
        rawRecordId: secondRawRecordId
      });
    } finally {
      db.pragma("foreign_keys = OFF");
    }
  });

  it("cascades stage item deletion when an ingest run or raw record is deleted", () => {
    db.pragma("foreign_keys = ON");
    try {
      const runDeletedId = db
        .prepare("INSERT INTO ingest_runs (source_family, source_key, triggered_by) VALUES (?, ?, ?)")
        .run("research_watch_pulse", "research_watch_pulse_fi", "test").lastInsertRowid as number;
      const runDeletedRawRecordId = addRawRecord({
        runId: runDeletedId,
        sourceFamily: "research_watch_pulse",
        sourceKey: "research_watch_pulse_fi",
        recordType: "politician_statement",
        sourceRecordKey: "run-deleted",
        payload: { text: "run deleted" }
      });
      const runDeletedStageItemId = addStageItem({
        runId: runDeletedId,
        rawRecordId: runDeletedRawRecordId,
        stageType: "politician_statement",
        sourceKey: "research_watch_pulse_fi",
        dedupeKey: "research:run-deleted",
        normalized: { statementText: "run deleted" }
      });

      db.prepare("DELETE FROM ingest_runs WHERE id = ?").run(runDeletedId);
      expect(getIngestStageItemById(runDeletedStageItemId)).toBeUndefined();

      const rawDeletedRunId = db
        .prepare("INSERT INTO ingest_runs (source_family, source_key, triggered_by) VALUES (?, ?, ?)")
        .run("research_watch_pulse", "research_watch_pulse_fi", "test").lastInsertRowid as number;
      const rawDeletedRawRecordId = addRawRecord({
        runId: rawDeletedRunId,
        sourceFamily: "research_watch_pulse",
        sourceKey: "research_watch_pulse_fi",
        recordType: "politician_statement",
        sourceRecordKey: "raw-deleted",
        payload: { text: "raw deleted" }
      });
      const rawDeletedStageItemId = addStageItem({
        runId: rawDeletedRunId,
        rawRecordId: rawDeletedRawRecordId,
        stageType: "politician_statement",
        sourceKey: "research_watch_pulse_fi",
        dedupeKey: "research:raw-deleted",
        normalized: { statementText: "raw deleted" }
      });

      db.prepare("DELETE FROM ingest_raw_records WHERE id = ?").run(rawDeletedRawRecordId);
      expect(getIngestStageItemById(rawDeletedStageItemId)).toBeUndefined();
    } finally {
      db.pragma("foreign_keys = OFF");
    }
  });
});
