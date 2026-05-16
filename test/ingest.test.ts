// WHAT IT DO? Proves official-source ingest runs, stage items, apply, and reject flows work through the protected operator APIs.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";
import { addRawRecord, addStageItem, getIngestStageItemById, markIngestStageItemNeedsSource } from "../src/db/ingest.js";

const originalFetch = globalThis.fetch;

const clearAllTables = (): void => {
  db.exec("DELETE FROM ingest_stage_items");
  db.exec("DELETE FROM ingest_raw_records");
  db.exec("DELETE FROM ingest_runs");
  db.exec("DELETE FROM party_stances");
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
});
