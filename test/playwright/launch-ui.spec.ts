import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";

const dbPath = process.env.PLAYWRIGHT_UI_DB_PATH ?? path.join(os.tmpdir(), "pnyx-playwright-ui.db");
const frontendBase = process.env.PLAYWRIGHT_UI_FRONTEND ?? "http://127.0.0.1:4312";
let seededPoliticianId = 0;

const seedBaseData = (): void => {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.prepare("DELETE FROM auth_login_codes").run();
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

  db.prepare("INSERT INTO users (id, email, role) VALUES (?, ?, 'admin')").run("ui-admin", "admin@ui.test");

  const politician = db
    .prepare("INSERT INTO politicians (name, region, office, verified, created_by) VALUES (?, ?, ?, 0, ?)")
    .run("UI Seed Politician", "Helsinki", "MP", "seed");
  const politicianId = politician.lastInsertRowid as number;
  seededPoliticianId = politicianId;

  db.prepare(
    "INSERT INTO parties (id, name, short_name, country_code, description, website_url, created_by) VALUES (?, ?, ?, 'FI', ?, ?, ?)"
  ).run("ui-party", "UI Seed Party", "UIP", "UI seed party", "https://example.fi/party", "seed");

  db.prepare(
    "INSERT INTO party_memberships (politician_id, party_id, role_title, start_date, source_note, created_by) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(politicianId, "ui-party", "Member", "2026-01-01", "seed membership", "seed");

  const statement = db
    .prepare(
      "INSERT INTO statements (politician_id, source_url, body, date_said, normalized_body_hash, statement_fingerprint, verification_status, author_id) VALUES (?, ?, ?, ?, ?, ?, 'verified', ?)"
    )
    .run(
      politicianId,
      "https://example.fi/promise",
      "UI seed promise statement",
      "2026-03-18",
      "hash-ui-seed",
      "fingerprint-ui-seed",
      "ui-admin"
    );
  const statementId = statement.lastInsertRowid as number;

  const canonical = db
    .prepare(
      "INSERT INTO canonical_promises (politician_id, promise_text, public_status, primary_statement_id, created_by) VALUES (?, ?, 'public', ?, ?)"
    )
    .run(politicianId, "UI seed promise statement", statementId, "seed");
  const canonicalPromiseId = canonical.lastInsertRowid as number;

  db.prepare(
    "INSERT INTO canonical_promise_sources (canonical_promise_id, statement_id, source_url, source_note, accepted_by) VALUES (?, ?, ?, ?, ?)"
  ).run(canonicalPromiseId, statementId, "https://example.fi/promise", "seed source", "seed");

  db.close();
};

const signInViaUi = async (page: import("@playwright/test").Page, email: string, redirectPath: string): Promise<void> => {
  await page.goto(`${frontendBase}/sign-in?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(redirectPath)}`);
  await page.getByRole("button", { name: "Send sign-in code" }).click();
  const codeText = await page.locator("text=Local delivery preview:").textContent();
  const code = codeText?.match(/(\d{6})/)?.[1];
  if (!code) {
    throw new Error("Unable to read inline auth code");
  }
  await page.getByLabel("One-time code").fill(code);
  await page.getByRole("button", { name: "Verify code and sign in" }).click();
};

test.beforeEach(() => {
  seedBaseData();
});

test("loads core public routes", async ({ page }) => {
  await page.goto(`${frontendBase}/`);
  await expect(page.getByRole("heading", { name: "What did they promise, and what does the public record show?" })).toBeVisible();

  await page.goto(`${frontendBase}/politicians`);
  await expect(page.getByRole("heading", { name: "Finnish politician directory" })).toBeVisible();

  await page.goto(`${frontendBase}/parties`);
  await expect(page.getByRole("heading", { name: "Browse Finnish political parties on PNYX." })).toBeVisible();

  await page.goto(`${frontendBase}/methodology`);
  await expect(page.getByRole("heading", { name: "How PNYX reads promises, evidence, party context, and uncertainty" })).toBeVisible();
});

test("registers, signs in, and submits contributor records", async ({ page }) => {
  const contributorEmail = `contrib-${Date.now()}@example.fi`;

  await page.goto(`${frontendBase}/register`);
  await page.getByLabel("Email").fill(contributorEmail);
  await page.getByRole("button", { name: "Register" }).click();
  await expect(page.getByRole("heading", { name: "Registration complete" })).toBeVisible();
  await page.getByRole("button", { name: "Continue to sign in" }).click();
  await page.getByRole("button", { name: "Send sign-in code" }).click();

  const codeText = await page.locator("text=Local delivery preview:").textContent();
  const code = codeText?.match(/(\d{6})/)?.[1];
  if (!code) {
    throw new Error("Unable to read registration auth code");
  }

  await page.getByLabel("One-time code").fill(code);
  await page.getByRole("button", { name: "Verify code and sign in" }).click();
  await expect(page.getByText(/Signed in as/i)).toBeVisible();

  await page.goto(`${frontendBase}/contribute/politicians/new`);
  await page.getByLabel("Name").fill(`Contributor Candidate ${Date.now()}`);
  await page.getByRole("button", { name: "Submit proposal" }).click();
  await expect(page.getByRole("heading", { name: "Proposal queued" })).toBeVisible();

  await page.goto(`${frontendBase}/contribute/statements/new?politicianId=${seededPoliticianId}`);
  await page.getByLabel("Source URL").fill("https://example.fi/ui-statement");
  await page.getByLabel("Date said").fill("2026-03-18");
  await page.getByLabel("Quoted statement").fill("UI contributor statement");
  await page.getByRole("button", { name: "Submit statement" }).click();
  await expect(page.getByRole("heading", { name: "Statement submitted" })).toBeVisible();

  await page.goto(`${frontendBase}/contribute/promises/new?politicianId=${seededPoliticianId}`);
  await page.getByLabel("Source URL").fill("https://example.fi/ui-claim");
  await page.getByLabel("Date said").fill("2026-03-18");
  await page.getByLabel("Claim text").fill("UI contributor claim");
  await page.getByRole("button", { name: "Check duplicates first" }).click();
  await page.getByRole("button", { name: "Submit claim" }).click();
  await expect(page.getByRole("heading", { name: "Claim queued" })).toBeVisible();
});

test("loads protected moderator and editorial routes under an admin session", async ({ page }) => {
  await signInViaUi(page, "admin@ui.test", "/ops/records");

  await expect(page.getByRole("heading", { name: "Launch-critical record maintenance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Party stance coverage" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Add party stance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Add vote event" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Add fulfillment assessment" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Add party-line assessment" })).toBeVisible();

  await page.goto(`${frontendBase}/ops`);
  await expect(page.getByRole("heading", { name: "Politician proposal queue" })).toBeVisible();

  await page.goto(`${frontendBase}/ops/claims`);
  await expect(page.getByRole("heading", { name: "Promise claim queue" })).toBeVisible();
});
