// WHAT IT DO? S31 proof: launch rehearsal seed data produces non-empty Finland-first coverage for the final launch dry run.
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "../src/db/client.js";
import { assertLaunchCoverage, readLaunchCoverage, resetLaunchRehearsalData, seedLaunchRehearsalData } from "./helpers/launch-rehearsal.js";

describe("launch rehearsal seed", () => {
  beforeEach(() => {
    resetLaunchRehearsalData(db);
  });

  it("loads launch-candidate seed data and reports non-empty coverage", () => {
    const seeded = seedLaunchRehearsalData(db);
    const coverage = readLaunchCoverage(db);

    assertLaunchCoverage(coverage);

    expect(seeded.partyId).toBe("launch-party");
    expect(seeded.politicianId).toBeGreaterThan(0);
    expect(seeded.statementId).toBeGreaterThan(0);
    expect(seeded.canonicalPromiseId).toBeGreaterThan(0);
    expect(seeded.claimId).toBeGreaterThan(0);
    expect(seeded.partyStanceId).toBeGreaterThan(0);
    expect(seeded.voteEventId).toBeGreaterThan(0);

    expect(coverage).toEqual({
      parties: 1,
      politicians: 1,
      publicPromises: 1,
      pendingClaims: 1,
      stances: 1,
      voteEvents: 1,
      fulfillment: 1,
      alignments: 1
    });
  });
});
