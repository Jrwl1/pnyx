// WHAT IT DO? S5-T04/T06 proof: duplicate-assist fuzzy hints are bounded, deterministic, and assistive-only.
import { beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { authHeaders } from "./helpers/auth.js";
import { app } from "../src/server.js";
import { db } from "../src/db/client.js";

describe("duplicate assist fuzzy", () => {
  beforeEach(() => {
    db.exec("DELETE FROM politician_proposal_audits");
    db.exec("DELETE FROM politician_proposals");
    db.exec("DELETE FROM politicians");
  });

  it("returns bounded deterministic fuzzy hints without mutating proposal state", async () => {
    const mod = await authHeaders("fuzzy-mod", "moderator");

    const exactCanonical = await request(app)
      .post("/politicians")
      .set(mod)
      .send({ name: "Alexandra Johnson", region: "CA", office: "Governor" })
      .expect(201);

    const fuzzyCanonicalNames = [
      "Alexandra Johnsona",
      "Alexandra Johnsonb",
      "Alexandra Johnsonc",
      "Alexandra Johnsond",
      "Alexandra Johnsone",
      "Alexandra Johnsonf"
    ];
    for (const name of fuzzyCanonicalNames) {
      await request(app)
        .post("/politicians")
        .set(mod)
        .send({ name, region: "CA", office: "Governor" })
        .expect(201);
    }

    const target = db
      .prepare(
        "INSERT INTO politician_proposals (submitted_by, name, region, office, external_id, source_note, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')"
      )
      .run("fuzzy-user", "Alexandra Johnson", "CA", "Governor", null, "target");

    db.prepare(
      "INSERT INTO politician_proposals (submitted_by, name, region, office, external_id, source_note, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')"
    ).run("fuzzy-user-2", "Alexandra Johnsin", "CA", "Governor", null, "pending fuzzy 1");
    db.prepare(
      "INSERT INTO politician_proposals (submitted_by, name, region, office, external_id, source_note, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')"
    ).run("fuzzy-user-3", "Alexandra Johnsun", "CA", "Governor", null, "pending fuzzy 2");

    const res = await request(app)
      .get(`/politician-proposals/${target.lastInsertRowid}/duplicate-assist`)
      .set(mod)
      .expect(200);

    expect(res.body.canonicalMatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: exactCanonical.body.id,
          matchOn: expect.arrayContaining(["normalizedKey"])
        })
      ])
    );

    expect(res.body.fuzzyHints.canonical).toHaveLength(5);
    expect(res.body.fuzzyHints.pendingProposals.length).toBeGreaterThan(0);

    for (const hint of res.body.fuzzyHints.canonical as Array<{ id: number; score: number }>) {
      expect(hint.id).not.toBe(exactCanonical.body.id);
      expect(hint.score).toBeGreaterThanOrEqual(0.72);
    }

    const canonicalHints = res.body.fuzzyHints.canonical as Array<{ id: number; score: number }>;
    const canonicalSorted = [...canonicalHints].sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return left.id - right.id;
    });
    expect(canonicalHints).toEqual(canonicalSorted);

    const proposalRow = db
      .prepare("SELECT status, decision_by AS decisionBy, decision_reason AS decisionReason FROM politician_proposals WHERE id = ?")
      .get(target.lastInsertRowid) as { status: string; decisionBy: string | null; decisionReason: string | null };
    expect(proposalRow).toMatchObject({ status: "pending", decisionBy: null, decisionReason: null });
  });
});
