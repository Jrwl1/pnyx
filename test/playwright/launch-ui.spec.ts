import os from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import { expect, test } from "@playwright/test";
import { readLaunchCoverage, resetLaunchRehearsalData, seedLaunchRehearsalData, type LaunchRehearsalSeed } from "../helpers/launch-rehearsal.js";

const dbPath = process.env.PLAYWRIGHT_UI_DB_PATH ?? path.join(os.tmpdir(), "pnyx-playwright-ui.db");
const frontendBase = process.env.PLAYWRIGHT_UI_FRONTEND ?? "http://127.0.0.1:4312";
let seededIds: LaunchRehearsalSeed | null = null;

const seedBaseData = (): void => {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  resetLaunchRehearsalData(db);
  seededIds = seedLaunchRehearsalData(db);
  expect(readLaunchCoverage(db)).toMatchObject({
    parties: 1,
    politicians: 1,
    publicPromises: 1,
    pendingClaims: 1
  });

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
  if (!seededIds) {
    throw new Error("Launch rehearsal data was not seeded");
  }

  await page.goto(`${frontendBase}/`);
  await expect(page.getByRole("heading", { name: "What did they promise, and what does the public record show?" })).toBeVisible();

  await page.goto(`${frontendBase}/politicians`);
  await expect(page.getByRole("heading", { name: "Finnish politician directory" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Launch Rehearsal Politician", exact: true })).toBeVisible();

  await page.goto(`${frontendBase}/politicians/${seededIds.politicianId}`);
  await expect(page.getByRole("heading", { name: "Launch Rehearsal Politician" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Promises", exact: true })).toHaveAttribute("aria-selected", "true");

  await page.goto(`${frontendBase}/parties`);
  await expect(page.getByRole("heading", { name: "Browse Finnish political parties on PNYX." })).toBeVisible();
  await expect(page.getByText("Launch Rehearsal Party", { exact: true })).toBeVisible();

  await page.goto(`${frontendBase}/parties/${seededIds.partyId}`);
  await expect(page.getByRole("heading", { name: "Launch Rehearsal Party" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Current member politicians" })).toBeVisible();

  await page.goto(`${frontendBase}/promises/${seededIds.statementId}`);
  await expect(page.getByRole("heading", { name: "Launch rehearsal canonical promise" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fulfillment verdict" })).toBeVisible();

  await page.goto(`${frontendBase}/claims/${seededIds.claimId}`);
  await expect(page.getByRole("heading", { name: "Restore your session by email" })).toBeVisible();

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

  await page.goto(`${frontendBase}/contribute/statements/new?politicianId=${seededIds?.politicianId ?? 0}`);
  await page.getByLabel("Source URL").fill("https://example.fi/ui-statement");
  await page.getByLabel("Date said").fill("2026-03-18");
  await page.getByLabel("Quoted statement").fill("UI contributor statement");
  await page.getByRole("button", { name: "Submit statement" }).click();
  await expect(page.getByRole("heading", { name: "Statement submitted" })).toBeVisible();

  await page.goto(`${frontendBase}/contribute/promises/new?politicianId=${seededIds?.politicianId ?? 0}`);
  await page.getByLabel("Source URL").fill("https://example.fi/ui-claim");
  await page.getByLabel("Date said").fill("2026-03-18");
  await page.getByLabel("Claim text").fill("UI contributor claim");
  await page.getByRole("button", { name: "Check duplicates first" }).click();
  await page.getByRole("button", { name: "Submit claim" }).click();
  await expect(page.getByRole("heading", { name: "Claim queued" })).toBeVisible();
});

test("loads protected moderator and editorial routes under an admin session", async ({ page }) => {
  await signInViaUi(page, "admin@launch.test", "/ops/records");

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
