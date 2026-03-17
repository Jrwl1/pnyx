// WHAT IT DO? S22 proof: canonical parties, aliases, memberships, public reads, and moderator/admin write paths work together.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("party graph", () => {
  let politicianId: number;

  beforeEach(() => {
    db.exec("DELETE FROM party_memberships");
    db.exec("DELETE FROM party_aliases");
    db.exec("DELETE FROM parties");
    db.exec("DELETE FROM politician_proposal_audits");
    db.exec("DELETE FROM politician_proposals");
    db.exec("DELETE FROM votes");
    db.exec("DELETE FROM revision_audits");
    db.exec("DELETE FROM statements");
    db.exec("DELETE FROM politicians");

    const politician = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)")
      .run("Party Graph Politician", "Uusimaa", "MP", "system");
    politicianId = politician.lastInsertRowid as number;
  });

  it("moderator can create parties, aliases, memberships, and public reads expose the graph", async () => {
    const moderator = await authHeaders("party-graph-mod", "moderator");

    await request(app)
      .post("/parties")
      .set(moderator)
      .send({
        id: "sdp",
        name: "Social Democratic Party of Finland",
        shortName: "SDP",
        description: "Finland-first test party",
        websiteUrl: "https://example.fi/sdp"
      })
      .expect(201);

    await request(app)
      .post("/parties/sdp/aliases")
      .set(moderator)
      .send({ alias: "Suomen Sosialidemokraattinen Puolue", sourceNote: "official name" })
      .expect(201);

    await request(app)
      .post("/party-memberships")
      .set(moderator)
      .send({
        politicianId,
        partyId: "sdp",
        roleTitle: "Member of Parliament",
        startDate: "2024-01-01",
        sourceNote: "current membership"
      })
      .expect(201);

    const parties = await request(app).get("/parties").expect(200);
    expect(parties.body.items).toEqual([
      expect.objectContaining({
        id: "sdp",
        shortName: "SDP",
        aliasCount: 1,
        memberCount: 1,
        currentMemberCount: 1
      })
    ]);

    const partyDetail = await request(app).get("/parties/sdp").expect(200);
    expect(partyDetail.body.party).toMatchObject({
      id: "sdp",
      shortName: "SDP",
      aliasCount: 1,
      currentMemberCount: 1
    });
    expect(partyDetail.body.aliases).toEqual([
      expect.objectContaining({
        partyId: "sdp",
        alias: "Suomen Sosialidemokraattinen Puolue"
      })
    ]);

    const members = await request(app).get("/parties/sdp/members").expect(200);
    expect(members.body.items).toEqual([
      expect.objectContaining({
        politicianId,
        name: "Party Graph Politician",
        partyId: "sdp",
        current: 1
      })
    ]);

    const politicians = await request(app).get("/politicians").expect(200);
    expect(politicians.body.items).toEqual([
      expect.objectContaining({
        id: politicianId,
        partyId: "sdp",
        partyName: "Social Democratic Party of Finland",
        partyShortName: "SDP"
      })
    ]);
  });

  it("supports historical memberships and enforces one open membership per politician", async () => {
    const moderator = await authHeaders("party-history-mod", "moderator");

    await request(app)
      .post("/parties")
      .set(moderator)
      .send({ id: "kesk", name: "Centre Party of Finland", shortName: "KESK" })
      .expect(201);

    const createMembership = await request(app)
      .post("/party-memberships")
      .set(moderator)
      .send({
        politicianId,
        partyId: "kesk",
        startDate: "2020-01-01",
        sourceNote: "initial"
      })
      .expect(201);

    await request(app)
      .patch(`/party-memberships/${createMembership.body.id}`)
      .set(moderator)
      .send({
        endDate: "2022-12-31",
        sourceNote: "historical close"
      })
      .expect(200);

    await request(app)
      .post("/party-memberships")
      .set(moderator)
      .send({
        politicianId,
        partyId: "kesk",
        startDate: "2023-01-01",
        sourceNote: "current"
      })
      .expect(201);

    const secondPolitician = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)")
      .run("Second Party Politician", "Pirkanmaa", "Councillor", "system")
      .lastInsertRowid as number;

    await request(app)
      .post("/party-memberships")
      .set(moderator)
      .send({
        politicianId: secondPolitician,
        partyId: "kesk",
        startDate: "2024-01-01"
      })
      .expect(201);

    await request(app)
      .post("/party-memberships")
      .set(moderator)
      .send({
        politicianId: secondPolitician,
        partyId: "kesk",
        startDate: "2025-01-01"
      })
      .expect(409);

    const currentOnly = await request(app).get("/parties/kesk/members").expect(200);
    expect(currentOnly.body.items).toHaveLength(2);
    expect(currentOnly.body.items.every((item: { current: number }) => item.current === 1)).toBe(true);

    const historical = await request(app).get("/parties/kesk/members?includeHistorical=1").expect(200);
    expect(historical.body.items.some((item: { current: number; endDate: string | null }) => item.current === 0 && item.endDate === "2022-12-31")).toBe(true);
  });

  it("rejects unauthorized writes and invalid references", async () => {
    const user = await authHeaders("party-plain-user", "user");
    await request(app)
      .post("/parties")
      .set(user)
      .send({ id: "vihr", name: "Green League", shortName: "VIHR" })
      .expect(403);

    const moderator = await authHeaders("party-invalid-mod", "moderator");
    await request(app)
      .post("/party-memberships")
      .set(moderator)
      .send({
        politicianId,
        partyId: "missing"
      })
      .expect(404);
  });
});
