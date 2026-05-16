import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

const requiredFiles = [
  "AGENTS.md",
  "README.md",
  "claude.md",
  "docs/index.md",
  "docs/repo/truth.md",
  "docs/product/truth.md",
  "docs/product/milestones.md",
  "docs/product/page-readiness.md",
  "docs/product/participation.md",
  "docs/architecture/index.md",
  "docs/architecture/api-and-data.md",
  "docs/architecture/decisions.md",
  "docs/frontend/workflow.md",
  "docs/quality/verification.md",
  "docs/quality/harness-checks.md",
  "docs/plans/active/M9-authority-page-standard.md",
  "docs/plans/completed/M0-M8-summary.md",
  "docs/references/openai-harness-engineering.md",
  "docs/archive/legacy-protocol/README.md",
];

const activeFiles = [
  "AGENTS.md",
  "claude.md",
  "docs/index.md",
  "docs/repo/truth.md",
  "docs/product/truth.md",
  "docs/product/milestones.md",
  "docs/product/page-readiness.md",
  "docs/product/participation.md",
  "docs/architecture/index.md",
  "docs/architecture/api-and-data.md",
  "docs/architecture/decisions.md",
  "docs/frontend/workflow.md",
  "docs/quality/verification.md",
  "docs/quality/harness-checks.md",
  "docs/plans/active/M9-authority-page-standard.md",
];

const bannedActivePatterns = [
  /run the PLAN protocol/i,
  /run the DO protocol/i,
  /run the REVIEW protocol/i,
  /Mode Router/i,
  /If that line starts with exactly/i,
  /append exactly one .*WORKLOG/i,
];

const requiredIndexLinks = [
  "docs/repo/truth.md",
  "docs/product/truth.md",
  "docs/product/milestones.md",
  "docs/architecture/index.md",
  "docs/frontend/workflow.md",
  "docs/quality/verification.md",
  "docs/plans/active/M9-authority-page-standard.md",
];

const failures = [];

for (const file of requiredFiles) {
  if (!existsSync(path.join(root, file))) {
    failures.push(`Missing required harness doc: ${file}`);
  }
}

for (const file of activeFiles) {
  const absolute = path.join(root, file);
  if (!existsSync(absolute)) continue;
  const text = readFileSync(absolute, "utf8");
  for (const pattern of bannedActivePatterns) {
    if (pattern.test(text)) {
      failures.push(`Retired protocol wording found in active doc ${file}: ${pattern}`);
    }
  }
}

const indexPath = path.join(root, "docs/index.md");
if (existsSync(indexPath)) {
  const index = readFileSync(indexPath, "utf8");
  for (const link of requiredIndexLinks) {
    if (!index.includes(link)) {
      failures.push(`docs/index.md does not link ${link}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Markdown harness check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Markdown harness check passed (${requiredFiles.length} required files).`);
