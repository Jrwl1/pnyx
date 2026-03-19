import Database from "better-sqlite3";
import { pathToFileURL } from "node:url";
import { applyMigrations } from "../../src/db/migrate.js";

export type LaunchRehearsalSeed = {
  partyId: string;
  politicianId: number;
  statementId: number;
  canonicalPromiseId: number;
  claimId: number;
  partyStanceId: number;
  voteEventId: number;
};

export type LaunchCoverageSnapshot = {
  parties: number;
  politicians: number;
  publicPromises: number;
  pendingClaims: number;
  stances: number;
  voteEvents: number;
  fulfillment: number;
  alignments: number;
  notifications: number;
  reputationRows: number;
  ingestRuns: number;
  ingestPending: number;
};

const DEFAULT_DB_PATH = "data/pnyx.db";
const SEED_USER_ID = "seed";
const SEED_ADMIN_ID = "launch-admin";
const SEED_ADMIN_EMAIL = "admin@launch.test";
const PARTY_ID = "launch-party";
const PARTY_NAME = "Launch Rehearsal Party";
const PARTY_SHORT_NAME = "LRP";
const POLITICIAN_NAME = "Launch Rehearsal Politician";
const CLAIM_TEXT = "Launch rehearsal canonical promise";
const CLAIM_SOURCE_URL = "https://example.fi/launch-rehearsal-promise";
const CLAIM_SOURCE_NOTE = "launch rehearsal source";
const STANCE_TEXT = "Launch rehearsal party stance";
const STANCE_SOURCE_URL = "https://example.fi/launch-rehearsal-stance";
const VOTE_TITLE = "Launch rehearsal vote event";
const VOTE_SOURCE_URL = "https://example.fi/launch-rehearsal-vote";
const FULFILLMENT_SOURCE_URL = "https://example.fi/launch-rehearsal-fulfillment";

export const resetLaunchRehearsalData = (db: Database.Database): void => {
  db.prepare("DELETE FROM auth_login_codes").run();
  db.prepare("DELETE FROM notification_deliveries").run();
  db.prepare("DELETE FROM notifications").run();
  db.prepare("DELETE FROM notification_preferences").run();
  db.prepare("DELETE FROM product_events").run();
  db.prepare("DELETE FROM contributor_reputation").run();
  db.prepare("DELETE FROM ingest_stage_items").run();
  db.prepare("DELETE FROM ingest_raw_records").run();
  db.prepare("DELETE FROM ingest_runs").run();
  db.prepare("DELETE FROM party_alignment_assessments").run();
  db.prepare("DELETE FROM promise_fulfillment_assessments").run();
  db.prepare("DELETE FROM canonical_promise_vote_links").run();
  db.prepare("DELETE FROM politician_vote_records").run();
  db.prepare("DELETE FROM vote_events").run();
  db.prepare("DELETE FROM party_stances").run();
  db.prepare("DELETE FROM claim_equivalence_signals").run();
  db.prepare("DELETE FROM promise_claim_audits").run();
  db.prepare("DELETE FROM promise_claims").run();
  db.prepare("DELETE FROM canonical_promise_sources").run();
  db.prepare("DELETE FROM canonical_promises").run();
  db.prepare("DELETE FROM party_memberships").run();
  db.prepare("DELETE FROM party_aliases").run();
  db.prepare("DELETE FROM parties").run();
  db.prepare("DELETE FROM revision_audits").run();
  db.prepare("DELETE FROM votes").run();
  db.prepare("DELETE FROM statements").run();
  db.prepare("DELETE FROM politicians").run();
  db.prepare("DELETE FROM users").run();
};

const ensureLaunchAdmin = (db: Database.Database): void => {
  db.prepare("INSERT OR IGNORE INTO users (id, email, role) VALUES (?, ?, 'admin')").run(SEED_ADMIN_ID, SEED_ADMIN_EMAIL);
};

export const seedLaunchRehearsalData = (db: Database.Database): LaunchRehearsalSeed => {
  ensureLaunchAdmin(db);

  const existingParty = db.prepare("SELECT id FROM parties WHERE id = ?").get(PARTY_ID) as { id: string } | undefined;
  if (!existingParty) {
    db.prepare(
      "INSERT INTO parties (id, name, short_name, country_code, description, website_url, created_by) VALUES (?, ?, ?, 'FI', ?, ?, ?)"
    ).run(PARTY_ID, PARTY_NAME, PARTY_SHORT_NAME, "Launch rehearsal seed party", "https://example.fi/launch-party", SEED_USER_ID);
  }

  let politician = db.prepare("SELECT id FROM politicians WHERE name = ? LIMIT 1").get(POLITICIAN_NAME) as { id: number } | undefined;
  if (!politician) {
    const result = db
      .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)")
      .run(POLITICIAN_NAME, "Helsinki", "MP", SEED_USER_ID);
    politician = { id: result.lastInsertRowid as number };
  }

  const membership = db
    .prepare("SELECT id FROM party_memberships WHERE politician_id = ? AND party_id = ? AND end_date IS NULL LIMIT 1")
    .get(politician.id, PARTY_ID) as { id: number } | undefined;
  if (!membership) {
    db.prepare(
      "INSERT INTO party_memberships (politician_id, party_id, role_title, start_date, source_note, created_by) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(politician.id, PARTY_ID, "Member", "2026-01-01", "launch rehearsal seed", SEED_USER_ID);
  }

  let statement = db.prepare("SELECT id FROM statements WHERE body = ? LIMIT 1").get(CLAIM_TEXT) as { id: number } | undefined;
  if (!statement) {
    const result = db
      .prepare(
        "INSERT INTO statements (politician_id, source_url, body, date_said, normalized_body_hash, statement_fingerprint, verification_status, author_id) VALUES (?, ?, ?, ?, ?, ?, 'verified', ?)"
      )
      .run(
        politician.id,
        CLAIM_SOURCE_URL,
        CLAIM_TEXT,
        "2026-03-18",
        "launch-rehearsal-hash",
        "launch-rehearsal-fingerprint",
        SEED_ADMIN_ID
      );
    statement = { id: result.lastInsertRowid as number };
  }

  let canonicalPromise = db
    .prepare("SELECT id FROM canonical_promises WHERE promise_text = ? LIMIT 1")
    .get(CLAIM_TEXT) as { id: number } | undefined;
  if (!canonicalPromise) {
    const result = db
      .prepare(
        "INSERT INTO canonical_promises (politician_id, promise_text, public_status, primary_statement_id, created_by) VALUES (?, ?, 'public', ?, ?)"
      )
      .run(politician.id, CLAIM_TEXT, statement.id, SEED_USER_ID);
    canonicalPromise = { id: result.lastInsertRowid as number };
  }

  const source = db
    .prepare("SELECT id FROM canonical_promise_sources WHERE canonical_promise_id = ? AND source_url = ? LIMIT 1")
    .get(canonicalPromise.id, CLAIM_SOURCE_URL) as { id: number } | undefined;
  if (!source) {
    db.prepare(
      "INSERT INTO canonical_promise_sources (canonical_promise_id, statement_id, source_url, source_note, accepted_by) VALUES (?, ?, ?, ?, ?)"
    ).run(canonicalPromise.id, statement.id, CLAIM_SOURCE_URL, CLAIM_SOURCE_NOTE, SEED_ADMIN_ID);
  }

  let claim = db
    .prepare("SELECT id FROM promise_claims WHERE politician_id = ? AND claim_text = ? LIMIT 1")
    .get(politician.id, CLAIM_TEXT) as { id: number } | undefined;
  if (!claim) {
    const result = db
      .prepare(
        "INSERT INTO promise_claims (submitted_by, politician_id, claim_text, source_url, source_note, date_said, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')"
      )
      .run(SEED_USER_ID, politician.id, CLAIM_TEXT, CLAIM_SOURCE_URL, CLAIM_SOURCE_NOTE, "2026-03-18");
    claim = { id: result.lastInsertRowid as number };
  }

  let stance = db
    .prepare("SELECT id FROM party_stances WHERE party_id = ? AND stance_text = ? LIMIT 1")
    .get(PARTY_ID, STANCE_TEXT) as { id: number } | undefined;
  if (!stance) {
    const result = db
      .prepare(
        "INSERT INTO party_stances (party_id, issue, stance_text, source_url, source_note, date_said, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(PARTY_ID, "Economy", STANCE_TEXT, STANCE_SOURCE_URL, "launch rehearsal stance", "2026-03-18", SEED_USER_ID);
    stance = { id: result.lastInsertRowid as number };
  }

  let voteEvent = db.prepare("SELECT id FROM vote_events WHERE title = ? LIMIT 1").get(VOTE_TITLE) as { id: number } | undefined;
  if (!voteEvent) {
    const result = db
      .prepare(
        "INSERT INTO vote_events (country_code, institution_name, issue, title, source_url, source_note, event_date, created_by) VALUES ('FI', 'Eduskunta', ?, ?, ?, ?, ?, ?)"
      )
      .run("Economy", VOTE_TITLE, VOTE_SOURCE_URL, "launch rehearsal vote", "2026-03-18", SEED_USER_ID);
    voteEvent = { id: result.lastInsertRowid as number };
  }

  const voteRecord = db
    .prepare("SELECT id FROM politician_vote_records WHERE vote_event_id = ? AND politician_id = ? LIMIT 1")
    .get(voteEvent.id, politician.id) as { id: number } | undefined;
  if (!voteRecord) {
    db.prepare(
      "INSERT INTO politician_vote_records (vote_event_id, politician_id, vote_value, source_note, created_by) VALUES (?, ?, 'for', ?, ?)"
    ).run(voteEvent.id, politician.id, "launch rehearsal vote record", SEED_USER_ID);
  }

  const voteLink = db
    .prepare("SELECT id FROM canonical_promise_vote_links WHERE canonical_promise_id = ? AND vote_event_id = ? LIMIT 1")
    .get(canonicalPromise.id, voteEvent.id) as { id: number } | undefined;
  if (!voteLink) {
    db.prepare(
      "INSERT INTO canonical_promise_vote_links (canonical_promise_id, vote_event_id, aligned_vote_value, comparison_note, created_by) VALUES (?, ?, 'for', ?, ?)"
    ).run(canonicalPromise.id, voteEvent.id, "launch rehearsal vote link", SEED_USER_ID);
  }

  const fulfillment = db
    .prepare("SELECT id FROM promise_fulfillment_assessments WHERE canonical_promise_id = ? LIMIT 1")
    .get(canonicalPromise.id) as { id: number } | undefined;
  if (!fulfillment) {
    db.prepare(
      "INSERT INTO promise_fulfillment_assessments (canonical_promise_id, status, summary, source_url, source_note, evidence_date, created_by) VALUES (?, 'fulfilled', ?, ?, ?, ?, ?)"
    ).run(
      canonicalPromise.id,
      "Launch rehearsal fulfillment",
      FULFILLMENT_SOURCE_URL,
      "launch rehearsal fulfillment",
      "2026-03-18",
      SEED_USER_ID
    );
  }

  const alignment = db
    .prepare("SELECT id FROM party_alignment_assessments WHERE canonical_promise_id = ? AND party_stance_id = ? LIMIT 1")
    .get(canonicalPromise.id, stance.id) as { id: number } | undefined;
  if (!alignment) {
    db.prepare(
      "INSERT INTO party_alignment_assessments (canonical_promise_id, party_stance_id, status, reason, created_by) VALUES (?, ?, 'aligned', ?, ?)"
    ).run(canonicalPromise.id, stance.id, "launch rehearsal alignment", SEED_USER_ID);
  }

  db.prepare(
    "INSERT OR REPLACE INTO contributor_reputation (user_id, merged_claims, score, updated_at) VALUES (?, 1, 2, datetime('now'))"
  ).run(SEED_USER_ID);

  db.prepare(
    "INSERT OR REPLACE INTO notification_preferences (user_id, in_app_enabled, email_enabled, review_updates_enabled, moderator_assignments_enabled, role_updates_enabled, updated_at) VALUES (?, 1, 0, 1, 1, 1, datetime('now'))"
  ).run(SEED_ADMIN_ID);

  const notification = db
    .prepare("SELECT id FROM notifications WHERE user_id = ? AND notification_type = ? LIMIT 1")
    .get(SEED_ADMIN_ID, "launch_rehearsal") as { id: number } | undefined;
  if (!notification) {
    const notificationId = db
      .prepare(
        "INSERT INTO notifications (user_id, notification_type, title, body, related_path) VALUES (?, ?, ?, ?, ?)"
      )
      .run(SEED_ADMIN_ID, "launch_rehearsal", "Launch rehearsal notification", "Seeded notification for post-launch proof.", "/notifications")
      .lastInsertRowid as number;
    db.prepare(
      "INSERT INTO notification_deliveries (notification_id, channel, delivery_state, updated_at) VALUES (?, 'inapp', 'delivered', datetime('now'))"
    ).run(notificationId);
  }

  const ingestRun = db
    .prepare("SELECT id FROM ingest_runs WHERE source_key = ? LIMIT 1")
    .get("launch-seed-ingest") as { id: number } | undefined;
  let ingestRunId = ingestRun?.id;
  if (!ingestRunId) {
    ingestRunId = db
      .prepare(
        "INSERT INTO ingest_runs (source_family, source_key, source_url, triggered_by, status, fetched_count, staged_count, applied_count) VALUES (?, ?, ?, ?, 'staged', 1, 1, 0)"
      )
      .run("party_stance_pages", "launch-seed-ingest", "https://example.fi/launch-seed-ingest", SEED_ADMIN_ID).lastInsertRowid as number;
  }
  const rawRecord = db
    .prepare("SELECT id FROM ingest_raw_records WHERE source_key = ? LIMIT 1")
    .get("launch-seed-ingest") as { id: number } | undefined;
  let rawRecordId = rawRecord?.id;
  if (!rawRecordId) {
    rawRecordId = db
      .prepare(
        "INSERT INTO ingest_raw_records (run_id, source_family, source_key, record_type, source_record_key, source_url, payload_json, payload_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        ingestRunId,
        "party_stance_pages",
        "launch-seed-ingest",
        "party_stance_page",
        "launch-seed-record",
        "https://example.fi/launch-seed-ingest",
        JSON.stringify({ title: "Seeded ingest item" }),
        "launch-seed-hash"
      ).lastInsertRowid as number;
  }
  const stageItem = db
    .prepare("SELECT id FROM ingest_stage_items WHERE source_key = ? AND dedupe_key = ? LIMIT 1")
    .get("launch-seed-ingest", "party_stance:https://example.fi/launch-seed-ingest") as { id: number } | undefined;
  if (!stageItem) {
    db.prepare(
      "INSERT INTO ingest_stage_items (run_id, raw_record_id, stage_type, source_key, dedupe_key, normalized_json, status) VALUES (?, ?, 'party_stance', ?, ?, ?, 'pending')"
    ).run(
      ingestRunId,
      rawRecordId,
      "launch-seed-ingest",
      "party_stance:https://example.fi/launch-seed-ingest",
      JSON.stringify({
        partyId: PARTY_ID,
        issue: "Economy",
        stanceText: "Seeded import stage item",
        sourceUrl: "https://example.fi/launch-seed-ingest",
        sourceNote: "launch rehearsal ingest",
        dateSaid: "2026-03-18"
      })
    );
  }

  return {
    partyId: PARTY_ID,
    politicianId: politician.id,
    statementId: statement.id,
    canonicalPromiseId: canonicalPromise.id,
    claimId: claim.id,
    partyStanceId: stance.id,
    voteEventId: voteEvent.id
  };
};

export const readLaunchCoverage = (db: Database.Database): LaunchCoverageSnapshot => {
  const row = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM parties WHERE deleted_at IS NULL) AS parties,
        (SELECT COUNT(*) FROM politicians WHERE deleted_at IS NULL) AS politicians,
        (SELECT COUNT(*) FROM canonical_promises WHERE deleted_at IS NULL AND public_status = 'public') AS publicPromises,
        (SELECT COUNT(*) FROM promise_claims WHERE status = 'pending') AS pendingClaims,
        (SELECT COUNT(*) FROM party_stances) AS stances,
        (SELECT COUNT(*) FROM vote_events) AS voteEvents,
        (SELECT COUNT(*) FROM promise_fulfillment_assessments) AS fulfillment,
        (SELECT COUNT(*) FROM party_alignment_assessments) AS alignments,
        (SELECT COUNT(*) FROM notifications) AS notifications,
        (SELECT COUNT(*) FROM contributor_reputation) AS reputationRows,
        (SELECT COUNT(*) FROM ingest_runs) AS ingestRuns,
        (SELECT COUNT(*) FROM ingest_stage_items WHERE status = 'pending') AS ingestPending`
    )
    .get() as LaunchCoverageSnapshot;
  return row;
};

export const assertLaunchCoverage = (snapshot: LaunchCoverageSnapshot): void => {
  const required: Array<keyof LaunchCoverageSnapshot> = [
    "parties",
    "politicians",
    "publicPromises",
    "pendingClaims",
    "stances",
    "voteEvents",
    "fulfillment",
    "alignments",
    "notifications",
    "reputationRows",
    "ingestRuns",
    "ingestPending"
  ];
  for (const key of required) {
    if ((snapshot[key] ?? 0) < 1) {
      throw new Error(`${key} expected >= 1, got ${snapshot[key] ?? 0}`);
    }
  }
};

const withLaunchDatabase = <T>(dbPath: string, work: (db: Database.Database) => T): T => {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  try {
    return work(db);
  } finally {
    db.close();
  }
};

const runCli = (mode: string, dbPath: string): void => {
  applyMigrations();

  if (mode === "seed") {
    const output = withLaunchDatabase(dbPath, (db) => {
      seedLaunchRehearsalData(db);
      const coverage = readLaunchCoverage(db);
      assertLaunchCoverage(coverage);
      return { ok: true, dbPath, coverage };
    });
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  if (mode === "coverage") {
    const output = withLaunchDatabase(dbPath, (db) => {
      const coverage = readLaunchCoverage(db);
      assertLaunchCoverage(coverage);
      return { ok: true, dbPath, coverage };
    });
    console.log(JSON.stringify(output, null, 2));
    return;
  }

  throw new Error(`Unknown mode: ${mode}`);
};

const isDirectExecution = (): boolean => {
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(entry).href;
};

if (isDirectExecution()) {
  runCli(process.argv[2] ?? "coverage", process.env.DB_PATH ?? DEFAULT_DB_PATH);
}
