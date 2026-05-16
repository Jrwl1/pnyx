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

const expectPublicMeta = async (
  page: import("@playwright/test").Page,
  input: { title: string; descriptionFragment: string; path: string }
): Promise<void> => {
  await expect(page).toHaveTitle(input.title);
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", new RegExp(input.descriptionFragment, "i"));
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", input.title);
  await expect(page.locator('meta[name="twitter:description"]')).toHaveAttribute(
    "content",
    new RegExp(input.descriptionFragment, "i")
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `${frontendBase}${input.path}`);
};

const retryPublicLoadIfNeeded = async (page: import("@playwright/test").Page): Promise<void> => {
  const errorHeading = page.getByRole("heading", { name: "Unable to load data" });
  if (await errorHeading.isVisible({ timeout: 1_500 }).catch(() => false)) {
    await page.getByRole("button", { name: "Retry" }).click();
  }
};

test.beforeEach(() => {
  seedBaseData();
});

test("loads core public routes", async ({ page }) => {
  if (!seededIds) {
    throw new Error("Launch rehearsal data was not seeded");
  }

  await page.goto(`${frontendBase}/`);
  await retryPublicLoadIfNeeded(page);
  await expect(page.getByRole("heading", { name: "Find the promise first. Then read the evidence." })).toBeVisible();
  await expectPublicMeta(page, {
    title: "PNYX | Finnish political accountability",
    descriptionFragment: "Search Finnish politicians",
    path: "/"
  });

  await page.goto(`${frontendBase}/politicians`);
  await retryPublicLoadIfNeeded(page);
  await expect(page.getByRole("heading", { name: "Finnish politician directory" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Launch Rehearsal Politician", exact: true })).toBeVisible();
  await expectPublicMeta(page, {
    title: "Politicians | PNYX",
    descriptionFragment: "documented Finnish politicians",
    path: "/politicians"
  });

  await page.goto(`${frontendBase}/politicians/${seededIds.politicianId}`);
  await retryPublicLoadIfNeeded(page);
  await expect(page.getByRole("heading", { name: "Launch Rehearsal Politician" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Page readiness" })).toBeVisible();
  await expect(page.getByText("No reviewed page readiness record yet.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Discussion" })).toBeVisible();
  const promisesTab = page.getByRole("tab", { name: "Promises", exact: true });
  const votesTab = page.getByRole("tab", { name: "Voting record vs promises" });
  const evidenceTab = page.getByRole("tab", { name: "Evidence timeline" });
  await expect(promisesTab).toHaveAttribute("aria-selected", "true");
  await expect(promisesTab).toHaveAttribute("aria-controls", "profile-panel-promises");
  await expect(votesTab).toHaveAttribute("aria-controls", "profile-panel-votes");
  await expect(evidenceTab).toHaveAttribute("aria-controls", "profile-panel-evidence");
  await expect(promisesTab).toHaveAttribute("tabindex", "0");
  await expect(votesTab).toHaveAttribute("tabindex", "-1");
  await promisesTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(votesTab).toHaveAttribute("aria-selected", "true");
  await expect(votesTab).toBeFocused();
  await page.keyboard.press("End");
  await expect(evidenceTab).toHaveAttribute("aria-selected", "true");
  await expect(evidenceTab).toBeFocused();
  await expectPublicMeta(page, {
    title: "Launch Rehearsal Politician | PNYX",
    descriptionFragment: "vote alignment",
    path: `/politicians/${seededIds.politicianId}`
  });

  await page.goto(`${frontendBase}/parties`);
  await retryPublicLoadIfNeeded(page);
  await expect(page.getByRole("heading", { name: "Browse parties by sourced positions and connected members." })).toBeVisible();
  await expect(page.getByText("Launch Rehearsal Party", { exact: true })).toBeVisible();
  await expectPublicMeta(page, {
    title: "Parties | PNYX",
    descriptionFragment: "Finnish political parties",
    path: "/parties"
  });

  await page.goto(`${frontendBase}/parties/${seededIds.partyId}`);
  await retryPublicLoadIfNeeded(page);
  await expect(page.getByRole("heading", { name: "Launch Rehearsal Party" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Page readiness" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Current member politicians" })).toBeVisible();
  await expectPublicMeta(page, {
    title: "Launch Rehearsal Party | PNYX",
    descriptionFragment: "party stances",
    path: `/parties/${seededIds.partyId}`
  });

  await page.goto(`${frontendBase}/promises`);
  await retryPublicLoadIfNeeded(page);
  await expect(page.getByRole("heading", { name: "Browse claims with sources attached." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Launch rehearsal canonical promise" })).toBeVisible();
  await expectPublicMeta(page, {
    title: "Promises | PNYX",
    descriptionFragment: "Browse documented promises",
    path: "/promises"
  });

  await page.goto(`${frontendBase}/promises/${seededIds.statementId}`);
  await retryPublicLoadIfNeeded(page);
  await expect(page.getByRole("heading", { name: "Launch Rehearsal Politician: promise record" })).toBeVisible();
  await expect(page.getByText("Launch rehearsal canonical promise", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Page readiness" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Discussion" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Fulfillment verdict" })).toBeVisible();
  await expectPublicMeta(page, {
    title: "Launch rehearsal canonical promise | PNYX",
    descriptionFragment: "promise detail",
    path: `/promises/${seededIds.statementId}`
  });

  await page.goto(`${frontendBase}/claims/${seededIds.claimId}`);
  await expect(page.getByRole("heading", { name: "Restore your session by email" })).toBeVisible();

  await page.goto(`${frontendBase}/methodology`);
  await retryPublicLoadIfNeeded(page);
  await expect(page.getByRole("heading", { name: "How PNYX reads promises, evidence, party context, and uncertainty" })).toBeVisible();
  await expectPublicMeta(page, {
    title: "Methodology | PNYX",
    descriptionFragment: "fulfillment",
    path: "/methodology"
  });
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

  await page.goto(`${frontendBase}/notifications`);
  await expect(page.getByRole("heading", { name: "Notifications and review updates" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Preferences" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Inbox" })).toBeVisible();
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
  await expect(page.getByLabel("Priority")).toBeVisible();

  await page.goto(`${frontendBase}/ops/admin`);
  await expect(page.getByRole("heading", { name: "Protected party graph and canonical promise maintenance" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create party identity" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Create canonical promise directly" })).toBeVisible();

  await page.goto(`${frontendBase}/ops/imports`);
  await expect(page.getByRole("heading", { name: "Finland-first ingest review" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Trigger supported official sources" })).toBeVisible();

  await page.goto(`${frontendBase}/ops/claims`);
  await expect(page.getByRole("heading", { name: "Promise claim queue" })).toBeVisible();
  await expect(page.getByLabel("Priority")).toBeVisible();
});
