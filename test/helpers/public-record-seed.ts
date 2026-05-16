import crypto from "node:crypto";
import { pathToFileURL } from "node:url";

import Database from "better-sqlite3";
import { applyMigrations } from "../../src/db/migrate.js";

const DEFAULT_DB_PATH = "data/pnyx.db";
const SEED_USER_ID = "public-record-seed";
const SEED_ADMIN_ID = "public-record-admin";
const SEED_ADMIN_EMAIL = "public-record-admin@pnyx.local";
const AS_OF_DATE = "2026-05-16";

type PartySeed = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  websiteUrl: string;
  aliases: string[];
};

type PoliticianSeed = {
  key: string;
  name: string;
  partyId: string;
  office: string;
  region: string;
  roleTitle: string;
  startDate: string;
  externalId: string;
  profileSourceUrl: string;
  profileSourceNote: string;
};

type PositionSeed = {
  key: string;
  partyId: string;
  politicianKey: string;
  issue: string;
  claimText: string;
  sourceUrl: string;
  sourceNote: string;
  dateSaid: string;
  whyItMatters: string;
};

type CoverageSnapshot = {
  parties: number;
  politicians: number;
  currentMemberships: number;
  publicPromises: number;
  acceptedSources: number;
  stances: number;
  unknownFulfillment: number;
  readinessRows: number;
  ingestPending: number;
};

const parties: PartySeed[] = [
  {
    id: "kok",
    name: "National Coalition Party",
    shortName: "KOK",
    description:
      "Finnish centre-right party. This seed uses official party and government sources for identity and policy records.",
    websiteUrl: "https://www.kokoomus.fi/?lang=en",
    aliases: ["Kokoomus", "Kansallinen Kokoomus"]
  },
  {
    id: "ps",
    name: "Finns Party",
    shortName: "PS",
    description:
      "Finnish parliamentary party. This seed keeps party positions separate from individual promise records.",
    websiteUrl: "https://www.perussuomalaiset.fi/kielisivu/in-english/",
    aliases: ["Perussuomalaiset"]
  },
  {
    id: "sdp",
    name: "Social Democratic Party of Finland",
    shortName: "SDP",
    description:
      "Finnish social democratic party. This seed records platform positions with source links and unknown fulfillment status.",
    websiteUrl: "https://www.sdp.fi/en/",
    aliases: ["Suomen Sosialidemokraattinen Puolue"]
  },
  {
    id: "vas",
    name: "Left Alliance",
    shortName: "VAS",
    description:
      "Finnish left-wing party. This seed uses party platform material as stance evidence, not as fulfillment evidence.",
    websiteUrl: "https://vasemmisto.fi/frontpage/",
    aliases: ["Vasemmistoliitto"]
  },
  {
    id: "vihr",
    name: "Green League",
    shortName: "VIHR",
    description:
      "Finnish green party. This seed records climate-related platform material as source-backed public context.",
    websiteUrl: "https://www.greens.fi/",
    aliases: ["Vihreat", "Vihrea liitto"]
  },
  {
    id: "kesk",
    name: "Centre Party of Finland",
    shortName: "KESK",
    description:
      "Finnish centre party. This seed records official party material as public context while keeping fulfillment assessment separate.",
    websiteUrl: "https://keskusta.fi/",
    aliases: ["Keskusta", "Suomen Keskusta"]
  },
  {
    id: "rkp",
    name: "Swedish People's Party of Finland",
    shortName: "RKP",
    description:
      "Finnish parliamentary party. This seed records RKP policy positions with source links and clearly marked unknown outcomes.",
    websiteUrl: "https://sfp.fi/en/",
    aliases: ["SFP", "Ruotsalainen kansanpuolue", "Svenska folkpartiet"]
  },
  {
    id: "kd",
    name: "Christian Democrats in Finland",
    shortName: "KD",
    description:
      "Finnish parliamentary party. This seed uses official party and government sources for identity and public-position records.",
    websiteUrl: "https://www.kd.fi/",
    aliases: ["Kristillisdemokraatit", "Suomen Kristillisdemokraatit"]
  }
];

const politicians: PoliticianSeed[] = [
  {
    key: "orpo",
    name: "Petteri Orpo",
    partyId: "kok",
    office: "Prime Minister of Finland; Member of Parliament",
    region: "Electoral District of Varsinais-Suomi",
    roleTitle: "Prime Minister; MP",
    startDate: "2023-06-20",
    externalId: "https://www.eduskunta.fi/en/members-and-parliamentary-bodies/members-of-parliament/947",
    profileSourceUrl: "https://valtioneuvosto.fi/en/ministers/-/min/orpo/prime-minister",
    profileSourceNote: "Official Finnish Government minister profile; checked 2026-05-16."
  },
  {
    key: "purra",
    name: "Riikka Purra",
    partyId: "ps",
    office: "Minister of Finance; Member of Parliament",
    region: "Electoral District of Uusimaa",
    roleTitle: "Minister of Finance; MP",
    startDate: "2023-06-20",
    externalId: "https://www.eduskunta.fi/en/members-and-parliamentary-bodies/members-of-parliament/1392",
    profileSourceUrl: "https://valtioneuvosto.fi/en/ministers/-/min/orpo/valtiovarainministeri",
    profileSourceNote: "Official Finnish Government minister profile; checked 2026-05-16."
  },
  {
    key: "lindtman",
    name: "Antti Lindtman",
    partyId: "sdp",
    office: "Chair of the Social Democratic Party; Member of Parliament",
    region: "Electoral District of Uusimaa",
    roleTitle: "Party chair; MP",
    startDate: "2023-09-01",
    externalId: "https://www.eduskunta.fi/en/members-and-parliamentary-bodies/members-of-parliament/1147",
    profileSourceUrl: "https://www.sdp.fi/tutustu/sdp-eduskunnassa/",
    profileSourceNote: "Official party parliamentary group and Parliament profile sources; checked 2026-05-16."
  },
  {
    key: "andersson",
    name: "Li Andersson",
    partyId: "vas",
    office: "Member of the European Parliament",
    region: "European Parliament; Finland",
    roleTitle: "MEP",
    startDate: "2024-07-16",
    externalId: "https://www.europarl.europa.eu/meps/en/256805/LI_ANDERSSON/home",
    profileSourceUrl: "https://www.europarl.europa.eu/meps/en/256805/LI_ANDERSSON/home",
    profileSourceNote: "Official European Parliament profile; checked 2026-05-16."
  },
  {
    key: "ohisalo",
    name: "Maria Ohisalo",
    partyId: "vihr",
    office: "Member of the European Parliament",
    region: "European Parliament; Finland",
    roleTitle: "MEP",
    startDate: "2024-07-16",
    externalId: "https://www.europarl.europa.eu/meps/en/198076/MARIA_OHISALO/home",
    profileSourceUrl: "https://www.europarl.europa.eu/meps/en/198076/MARIA_OHISALO/home",
    profileSourceNote: "Official European Parliament profile; checked 2026-05-16."
  },
  {
    key: "kaikkonen",
    name: "Antti Kaikkonen",
    partyId: "kesk",
    office: "Chair of the Centre Party of Finland; Member of Parliament",
    region: "Electoral District of Uusimaa",
    roleTitle: "Party chair; MP",
    startDate: "2024-06-15",
    externalId: "https://www.eduskunta.fi/en/members-and-parliamentary-bodies/members-of-parliament/916",
    profileSourceUrl: "https://keskusta.fi/ajankohtaista/uutiset/puheenjohtaja-antti-kaikkonen-ydinasepolitiikasta-pattitilanteeseen-kannattaa-etsia-ratkaisu/",
    profileSourceNote: "Official Centre Party source identifies Kaikkonen as party chair; checked 2026-05-16."
  },
  {
    key: "adlercreutz",
    name: "Anders Adlercreutz",
    partyId: "rkp",
    office: "Minister of Education; Chair of the Swedish People's Party of Finland; Member of Parliament",
    region: "Electoral District of Uusimaa",
    roleTitle: "Minister of Education; party chair; MP",
    startDate: "2024-07-05",
    externalId: "https://www.eduskunta.fi/en/members-and-parliamentary-bodies/members-of-parliament/1311",
    profileSourceUrl: "https://sfp.fi/fi/yhteystiedot/henkil%C3%B6/anders-adlercreutz/",
    profileSourceNote: "Official RKP profile source identifies Adlercreutz as party chair and education minister; checked 2026-05-16."
  },
  {
    key: "essayah",
    name: "Sari Essayah",
    partyId: "kd",
    office: "Minister of Agriculture and Forestry; Chair of Christian Democrats in Finland; Member of Parliament",
    region: "Electoral District of Savo-Karelia",
    roleTitle: "Minister of Agriculture and Forestry; party chair; MP",
    startDate: "2023-06-20",
    externalId: "https://www.eduskunta.fi/en/members-and-parliamentary-bodies/members-of-parliament/1306",
    profileSourceUrl: "https://valtioneuvosto.fi/en/ministers/-/min/orpo/maa-ja-metsatalousministeri",
    profileSourceNote: "Official Finnish Government minister profile and party-role sources; checked 2026-05-16."
  }
];

const positions: PositionSeed[] = [
  {
    key: "kok-public-finances-government",
    partyId: "kok",
    politicianKey: "orpo",
    issue: "Public finances",
    claimText:
      "Prime Minister Petteri Orpo's Government set a target to strengthen public finances by EUR 6 billion during the 2023-2027 parliamentary term, with a longer-term goal of balancing public finances and turning the debt ratio downward.",
    sourceUrl: "https://julkaisut.valtioneuvosto.fi/server/api/core/bitstreams/a89b334b-2f1e-4b41-bd97-ff91a7449a7a/content",
    sourceNote: "Official government programme, published 2023-06-20.",
    dateSaid: "2023-06-20",
    whyItMatters: "Central benchmark for judging the current government's fiscal policy."
  },
  {
    key: "kok-employment-platform",
    partyId: "kok",
    politicianKey: "orpo",
    issue: "Employment",
    claimText:
      "Kokoomus said it would raise Finland's employment rate to 80 percent by 2030 and that its measures would bring 100,000 Finns into employment during the next parliamentary term.",
    sourceUrl: "https://www.kokoomus.fi/kokoomuksen-eduskuntavaaliohjelma-2023/",
    sourceNote: "Official 2023 parliamentary election programme.",
    dateSaid: "2023-03-01",
    whyItMatters: "Employment targets affect taxation, social security, and public finances."
  },
  {
    key: "ps-climate-2050",
    partyId: "ps",
    politicianKey: "purra",
    issue: "Climate and energy",
    claimText:
      "Perussuomalaiset proposed moving Finland's 2035 carbon-neutrality target to 2050 as part of its Sinivalkoinen siirtyma energy and climate programme.",
    sourceUrl: "https://www.perussuomalaiset.fi/wp-content/uploads/2023/02/Sinivalkoinensiirtyma_2023.pdf",
    sourceNote: "Official party policy programme.",
    dateSaid: "2023-02-01",
    whyItMatters: "The target year is a clear dividing line in Finnish climate policy."
  },
  {
    key: "ps-work-incentives",
    partyId: "ps",
    politicianKey: "purra",
    issue: "Work incentives",
    claimText:
      "Perussuomalaiset said work and entrepreneurship should pay better and framed tax and benefit policy around stronger work incentives.",
    sourceUrl: "https://www.perussuomalaiset.fi/wp-content/uploads/2023/02/PS_eduskuntavaaliohjelma_2023.pdf",
    sourceNote: "Official 2023 parliamentary election programme.",
    dateSaid: "2023-02-01",
    whyItMatters: "Work incentives are a recurring point of comparison in economic and social-security debates."
  },
  {
    key: "sdp-fiscal-welfare",
    partyId: "sdp",
    politicianKey: "lindtman",
    issue: "Public finances and welfare",
    claimText:
      "SDP said fiscal adjustment should be carried out over the long term in a way that safeguards the welfare state and protects people in vulnerable positions.",
    sourceUrl: "https://www.sdp.fi/eduskuntavaalit-2023/vaaliohjelma/kaiken-pohjana-on-kestava-talous/talouden-vahvistaminen-vaatii-arvovalintoja/",
    sourceNote: "Official 2023 parliamentary election programme.",
    dateSaid: "2023-03-01",
    whyItMatters: "Shows the fiscal-policy tradeoff SDP emphasizes between debt reduction and welfare-state protection."
  },
  {
    key: "sdp-education",
    partyId: "sdp",
    politicianKey: "lindtman",
    issue: "Education",
    claimText:
      "SDP framed education, competence, and research investment as part of Finland's long-term growth and welfare foundation.",
    sourceUrl: "https://www.sdp.fi/eduskuntavaalit-2023/vaaliohjelma/",
    sourceNote: "Official 2023 parliamentary election programme.",
    dateSaid: "2023-03-01",
    whyItMatters: "Education investment is a useful public comparison point across party platforms."
  },
  {
    key: "vas-basic-income",
    partyId: "vas",
    politicianKey: "andersson",
    issue: "Social security",
    claimText:
      "Vasemmistoliitto set a goal of gradually moving toward an unconditional basic income and aligning social-security reforms with that goal.",
    sourceUrl: "https://vasemmisto.fi/eduskuntavaalit-2023/eduskuntavaaliohjelma/",
    sourceNote: "Official 2023 parliamentary election programme.",
    dateSaid: "2023-03-01",
    whyItMatters: "Basic income is a distinctive position for comparing social-security models."
  },
  {
    key: "vas-care-services",
    partyId: "vas",
    politicianKey: "andersson",
    issue: "Healthcare and care",
    claimText:
      "Vasemmistoliitto said social and health services should be strengthened so people receive care according to need rather than ability to pay.",
    sourceUrl: "https://vasemmisto.fi/eduskuntavaalit-2023/eduskuntavaaliohjelma/",
    sourceNote: "Official 2023 parliamentary election programme.",
    dateSaid: "2023-03-01",
    whyItMatters: "Care access is a concrete public-service question visible to ordinary readers."
  },
  {
    key: "vihr-carbon-neutral-2035",
    partyId: "vihr",
    politicianKey: "ohisalo",
    issue: "Climate",
    claimText:
      "Vihreat said Finland should achieve carbon neutrality no later than 2035 and decide the measures needed to reach that goal.",
    sourceUrl: "https://www.vihreat.fi/eduskuntavaaliohjelma-2023/",
    sourceNote: "Official 2023 parliamentary election programme.",
    dateSaid: "2023-03-01",
    whyItMatters: "A measurable climate-policy stance for comparing parties on emissions targets."
  },
  {
    key: "vihr-biodiversity",
    partyId: "vihr",
    politicianKey: "ohisalo",
    issue: "Environment",
    claimText:
      "Vihreat said Finland should halt biodiversity loss and strengthen protection of nature alongside climate action.",
    sourceUrl: "https://www.vihreat.fi/eduskuntavaaliohjelma-2023/",
    sourceNote: "Official 2023 parliamentary election programme.",
    dateSaid: "2023-03-01",
    whyItMatters: "Biodiversity gives the environmental record a second issue beyond emissions."
  },
  {
    key: "kesk-mental-health",
    partyId: "kesk",
    politicianKey: "kaikkonen",
    issue: "Mental health",
    claimText:
      "Keskusta said better mental health should become a new national major project, with timely services and changes in working life as part of the response.",
    sourceUrl: "https://keskusta.fi/ajankohtaista/uutiset/keskusta-paremmasta-mielenterveydesta-uusi-kansallinen-suurhanke/",
    sourceNote: "Official Centre Party programme announcement.",
    dateSaid: "2022-06-14",
    whyItMatters: "Mental-health access is a visible public-service issue beyond fiscal and climate debates."
  },
  {
    key: "rkp-rdi-4-percent",
    partyId: "rkp",
    politicianKey: "adlercreutz",
    issue: "Research and innovation",
    claimText:
      "RKP said Finland should invest 4 percent of GDP in research, development and innovation, with the public share at least 1.3 percent of GDP.",
    sourceUrl: "https://sfp.fi/fi/politiikka/paatokset-ja-poliittiset-ohjelmat/rkpn-eduskuntavaaliohjelma-2023/",
    sourceNote: "Official 2023 parliamentary election programme.",
    dateSaid: "2023-03-01",
    whyItMatters: "RDI spending is tied to growth, universities, and long-term competitiveness."
  },
  {
    key: "rkp-baltic-sea",
    partyId: "rkp",
    politicianKey: "adlercreutz",
    issue: "Environment",
    claimText:
      "RKP said Finland should work to reduce Baltic Sea eutrophication and improve the Archipelago Sea so its catchment area can be removed from HELCOM's hotspot list.",
    sourceUrl: "https://sfp.fi/fi/politiikka/paatokset-ja-poliittiset-ohjelmat/rkpn-eduskuntavaaliohjelma-2023/",
    sourceNote: "Official 2023 parliamentary election programme.",
    dateSaid: "2023-03-01",
    whyItMatters: "This is a geographically specific environmental position relevant to coastal constituencies and Finnish-EU water policy."
  },
  {
    key: "kd-work-incentives",
    partyId: "kd",
    politicianKey: "essayah",
    issue: "Work incentives",
    claimText:
      "Kristillisdemokraatit said work should always pay and called for lighter taxation, lower mobility costs, and reforms to labour markets and social security.",
    sourceUrl: "https://www.kd.fi/eduskuntavaaliohjelma-2023/",
    sourceNote: "Official 2023 parliamentary election programme.",
    dateSaid: "2023-03-01",
    whyItMatters: "This stance connects tax policy, labour supply, and social-security design."
  }
];

const hash = (value: string): string => crypto.createHash("sha256").update(value).digest("hex");

const normalize = (value: string): string => value.trim().toLowerCase().replace(/\s+/g, " ");

const ensureCurrentReadinessSchema = (db: Database.Database): void => {
  const columns = db.prepare("PRAGMA table_info(page_readiness)").all() as Array<{ name: string }>;
  if (columns.length === 0 || columns.some((column) => column.name === "source_count")) {
    return;
  }

  db.exec(`
    ALTER TABLE page_readiness RENAME TO page_readiness_legacy_public_seed;

    CREATE TABLE page_readiness (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_kind TEXT NOT NULL CHECK(entity_kind IN ('politician', 'party', 'canonical_promise')),
      entity_id TEXT NOT NULL,
      readiness_state TEXT NOT NULL CHECK(readiness_state IN ('ready', 'thin_but_honest', 'not_ready')),
      freshness_checked_at TEXT,
      source_count INTEGER NOT NULL DEFAULT 0 CHECK(source_count >= 0),
      provenance_summary TEXT NOT NULL,
      missing_data_json TEXT NOT NULL DEFAULT '[]',
      reviewed_by TEXT NOT NULL,
      reviewed_at TEXT NOT NULL DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(entity_kind, entity_id)
    );

    INSERT OR IGNORE INTO page_readiness (
      entity_kind,
      entity_id,
      readiness_state,
      freshness_checked_at,
      source_count,
      provenance_summary,
      missing_data_json,
      reviewed_by,
      reviewed_at,
      created_at,
      updated_at
    )
    SELECT
      entity_kind,
      entity_id,
      readiness_state,
      freshness_checked_at,
      0,
      'Migrated from the earlier local page-readiness draft schema.',
      missing_reasons_json,
      updated_by,
      COALESCE(last_reviewed_at, updated_at),
      created_at,
      updated_at
    FROM page_readiness_legacy_public_seed;

    DROP TABLE page_readiness_legacy_public_seed;

    CREATE INDEX IF NOT EXISTS idx_page_readiness_entity
    ON page_readiness(entity_kind, entity_id);

    CREATE INDEX IF NOT EXISTS idx_page_readiness_state
    ON page_readiness(entity_kind, readiness_state, updated_at DESC);
  `);
};

const ensureSeedUsers = (db: Database.Database): void => {
  db.prepare("INSERT OR IGNORE INTO users (id, email, role) VALUES (?, ?, 'admin')").run(SEED_ADMIN_ID, SEED_ADMIN_EMAIL);
  db.prepare("INSERT OR IGNORE INTO users (id, email, role) VALUES (?, ?, 'user')").run(SEED_USER_ID, "public-record-seed@pnyx.local");
};

const upsertParty = (db: Database.Database, party: PartySeed): void => {
  db.prepare(
    `INSERT INTO parties (id, name, short_name, country_code, description, website_url, created_by)
     VALUES (?, ?, ?, 'FI', ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       short_name = excluded.short_name,
       description = excluded.description,
       website_url = excluded.website_url,
       updated_at = datetime('now')`
  ).run(party.id, party.name, party.shortName, party.description, party.websiteUrl, SEED_USER_ID);

  for (const alias of party.aliases) {
    db.prepare("INSERT OR IGNORE INTO party_aliases (party_id, alias, source_note, created_by) VALUES (?, ?, ?, ?)").run(
      party.id,
      alias,
      "Public-record seed alias.",
      SEED_USER_ID
    );
  }
};

const upsertPolitician = (db: Database.Database, politician: PoliticianSeed): number => {
  const existing = db.prepare("SELECT id FROM politicians WHERE external_id = ? LIMIT 1").get(politician.externalId) as
    | { id: number }
    | undefined;
  if (existing) {
    db.prepare(
      "UPDATE politicians SET name = ?, region = ?, office = ?, verified = 1, updated_at = datetime('now') WHERE id = ?"
    ).run(politician.name, politician.region, politician.office, existing.id);
    return existing.id;
  }

  return db
    .prepare("INSERT INTO politicians (name, region, office, external_id, verified, created_by) VALUES (?, ?, ?, ?, 1, ?)")
    .run(politician.name, politician.region, politician.office, politician.externalId, SEED_USER_ID).lastInsertRowid as number;
};

const ensureMembership = (db: Database.Database, politicianId: number, politician: PoliticianSeed): void => {
  const existing = db
    .prepare("SELECT id FROM party_memberships WHERE politician_id = ? AND party_id = ? AND end_date IS NULL LIMIT 1")
    .get(politicianId, politician.partyId) as { id: number } | undefined;
  if (existing) {
    db.prepare(
      "UPDATE party_memberships SET role_title = ?, start_date = ?, source_note = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(politician.roleTitle, politician.startDate, politician.profileSourceNote, existing.id);
    return;
  }

  db.prepare(
    "INSERT INTO party_memberships (politician_id, party_id, role_title, start_date, source_note, created_by) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(politicianId, politician.partyId, politician.roleTitle, politician.startDate, politician.profileSourceNote, SEED_USER_ID);
};

const upsertStatementAndPromise = (
  db: Database.Database,
  position: PositionSeed,
  politicianId: number
): { statementId: number; canonicalPromiseId: number } => {
  const fingerprint = hash(`${position.key}|${politicianId}|${position.sourceUrl}|${position.dateSaid}|${normalize(position.claimText)}`);
  let statement = db.prepare("SELECT id FROM statements WHERE statement_fingerprint = ? LIMIT 1").get(fingerprint) as
    | { id: number }
    | undefined;

  if (!statement) {
    statement = {
      id: db
        .prepare(
          `INSERT INTO statements (
            politician_id, source_url, body, date_said, normalized_body_hash, statement_fingerprint, verification_status, author_id
          ) VALUES (?, ?, ?, ?, ?, ?, 'verified', ?)`
        )
        .run(politicianId, position.sourceUrl, position.claimText, position.dateSaid, hash(normalize(position.claimText)), fingerprint, SEED_ADMIN_ID)
        .lastInsertRowid as number
    };
  }

  let canonical = db
    .prepare("SELECT id FROM canonical_promises WHERE politician_id = ? AND promise_text = ? AND deleted_at IS NULL LIMIT 1")
    .get(politicianId, position.claimText) as { id: number } | undefined;
  if (!canonical) {
    canonical = {
      id: db
        .prepare(
          "INSERT INTO canonical_promises (politician_id, promise_text, public_status, primary_statement_id, created_by) VALUES (?, ?, 'public', ?, ?)"
        )
        .run(politicianId, position.claimText, statement.id, SEED_ADMIN_ID).lastInsertRowid as number
    };
  } else {
    db.prepare(
      "UPDATE canonical_promises SET public_status = 'public', primary_statement_id = COALESCE(primary_statement_id, ?), updated_at = datetime('now') WHERE id = ?"
    ).run(statement.id, canonical.id);
  }

  db.prepare(
    "INSERT OR IGNORE INTO canonical_promise_sources (canonical_promise_id, statement_id, source_url, source_note, accepted_by) VALUES (?, ?, ?, ?, ?)"
  ).run(canonical.id, statement.id, position.sourceUrl, position.sourceNote, SEED_ADMIN_ID);

  return { statementId: statement.id, canonicalPromiseId: canonical.id };
};

const upsertPartyStance = (db: Database.Database, position: PositionSeed): number => {
  const existing = db
    .prepare("SELECT id FROM party_stances WHERE party_id = ? AND stance_text = ? AND source_url = ? LIMIT 1")
    .get(position.partyId, position.claimText, position.sourceUrl) as { id: number } | undefined;
  if (existing) {
    db.prepare(
      "UPDATE party_stances SET issue = ?, source_note = ?, date_said = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(position.issue, position.sourceNote, position.dateSaid, existing.id);
    return existing.id;
  }

  return db
    .prepare(
      "INSERT INTO party_stances (party_id, issue, stance_text, source_url, source_note, date_said, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(position.partyId, position.issue, position.claimText, position.sourceUrl, position.sourceNote, position.dateSaid, SEED_USER_ID)
    .lastInsertRowid as number;
};

const ensureUnknownFulfillment = (db: Database.Database, canonicalPromiseId: number, position: PositionSeed): void => {
  const existing = db.prepare("SELECT id FROM promise_fulfillment_assessments WHERE canonical_promise_id = ? LIMIT 1").get(
    canonicalPromiseId
  ) as { id: number } | undefined;
  if (existing) {
    return;
  }

  db.prepare(
    "INSERT INTO promise_fulfillment_assessments (canonical_promise_id, status, summary, source_url, source_note, evidence_date, created_by) VALUES (?, 'unknown', ?, ?, ?, ?, ?)"
  ).run(
    canonicalPromiseId,
    `Not assessed yet. Seeded as a source-backed position only: ${position.whyItMatters}`,
    position.sourceUrl,
    "Public-record seed keeps fulfillment unknown until implementation evidence is reviewed.",
    AS_OF_DATE,
    SEED_ADMIN_ID
  );
};

const upsertReadiness = (
  db: Database.Database,
  entityKind: "politician" | "party" | "canonical_promise",
  entityId: string | number,
  sourceCount: number,
  provenanceSummary: string,
  missingDataKeys: string[]
): void => {
  db.prepare(
    `INSERT INTO page_readiness (
      entity_kind, entity_id, readiness_state, freshness_checked_at, source_count, provenance_summary, missing_data_json, reviewed_by
    ) VALUES (?, ?, 'thin_but_honest', ?, ?, ?, ?, ?)
    ON CONFLICT(entity_kind, entity_id) DO UPDATE SET
      readiness_state = excluded.readiness_state,
      freshness_checked_at = excluded.freshness_checked_at,
      source_count = excluded.source_count,
      provenance_summary = excluded.provenance_summary,
      missing_data_json = excluded.missing_data_json,
      reviewed_by = excluded.reviewed_by,
      reviewed_at = datetime('now'),
      updated_at = datetime('now')`
  ).run(entityKind, String(entityId), AS_OF_DATE, sourceCount, provenanceSummary, JSON.stringify(missingDataKeys), SEED_ADMIN_ID);
};

const ensureIngestProvenance = (db: Database.Database): void => {
  const sourceKey = "public-record-seed-2026-05-16";
  let run = db.prepare("SELECT id FROM ingest_runs WHERE source_key = ? LIMIT 1").get(sourceKey) as { id: number } | undefined;
  if (!run) {
    run = {
      id: db
        .prepare(
          "INSERT INTO ingest_runs (source_family, source_key, source_url, triggered_by, status, fetched_count, staged_count, applied_count) VALUES (?, ?, ?, ?, 'staged', ?, ?, 0)"
        )
        .run("public_record_seed", sourceKey, "https://valtioneuvosto.fi/en/governments/minister", SEED_ADMIN_ID, positions.length, 1)
        .lastInsertRowid as number
    };
  }

  let raw = db.prepare("SELECT id FROM ingest_raw_records WHERE source_key = ? LIMIT 1").get(sourceKey) as { id: number } | undefined;
  if (!raw) {
    raw = {
      id: db
        .prepare(
          "INSERT INTO ingest_raw_records (run_id, source_family, source_key, record_type, source_record_key, source_url, payload_json, payload_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        )
        .run(
          run.id,
          "public_record_seed",
          sourceKey,
          "seed_bundle",
          "public-record-seed",
          "https://valtioneuvosto.fi/en/governments/minister",
          JSON.stringify({ asOfDate: AS_OF_DATE, positions: positions.length, politicians: politicians.length }),
          hash(`${sourceKey}|${AS_OF_DATE}`)
        ).lastInsertRowid as number
    };
  }

  db.prepare(
    "INSERT OR IGNORE INTO ingest_stage_items (run_id, raw_record_id, stage_type, source_key, dedupe_key, normalized_json, status) VALUES (?, ?, 'canonical_promise', ?, ?, ?, 'pending')"
  ).run(
    run.id,
    raw.id,
    sourceKey,
    `canonical_promise:${sourceKey}`,
    JSON.stringify({
      note: "Seed provenance marker. Public records were inserted directly by the helper; this item proves ingest-stage UI has real pending provenance."
    })
  );
};

export const seedPublicRecordData = (db: Database.Database): CoverageSnapshot => {
  ensureCurrentReadinessSchema(db);
  ensureSeedUsers(db);

  for (const party of parties) {
    upsertParty(db, party);
  }

  const politicianIds = new Map<string, number>();
  for (const politician of politicians) {
    const politicianId = upsertPolitician(db, politician);
    politicianIds.set(politician.key, politicianId);
    ensureMembership(db, politicianId, politician);
    upsertReadiness(
      db,
      "politician",
      politicianId,
      2,
      `${politician.profileSourceNote} Profile identity is public, but promise coverage is intentionally limited to the current seed slice.`,
      ["promise_coverage", "vote_alignment"]
    );
  }

  const promisesByParty = new Map<string, number>();
  for (const position of positions) {
    const politicianId = politicianIds.get(position.politicianKey);
    if (!politicianId) {
      throw new Error(`Missing seeded politician for ${position.politicianKey}`);
    }

    upsertPartyStance(db, position);
    const promise = upsertStatementAndPromise(db, position, politicianId);
    ensureUnknownFulfillment(db, promise.canonicalPromiseId, position);
    upsertReadiness(
      db,
      "canonical_promise",
      promise.canonicalPromiseId,
      1,
      `${position.sourceNote} Fulfillment has not been assessed from implementation evidence.`,
      ["fulfillment_evidence", "vote_alignment"]
    );
    promisesByParty.set(position.partyId, (promisesByParty.get(position.partyId) ?? 0) + 1);
  }

  for (const party of parties) {
    upsertReadiness(
      db,
      "party",
      party.id,
      Math.max(1, promisesByParty.get(party.id) ?? 0),
      "Seeded from official party or government sources. Member and stance coverage is partial by design.",
      ["membership_coverage", "vote_alignment"]
    );
  }

  ensureIngestProvenance(db);
  return readPublicRecordCoverage(db);
};

export const readPublicRecordCoverage = (db: Database.Database): CoverageSnapshot => {
  ensureCurrentReadinessSchema(db);
  return db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM parties WHERE deleted_at IS NULL) AS parties,
        (SELECT COUNT(*) FROM politicians WHERE deleted_at IS NULL) AS politicians,
        (SELECT COUNT(*) FROM party_memberships WHERE end_date IS NULL) AS currentMemberships,
        (SELECT COUNT(*) FROM canonical_promises WHERE deleted_at IS NULL AND public_status = 'public') AS publicPromises,
        (SELECT COUNT(*) FROM canonical_promise_sources) AS acceptedSources,
        (SELECT COUNT(*) FROM party_stances) AS stances,
        (SELECT COUNT(*) FROM promise_fulfillment_assessments WHERE status = 'unknown') AS unknownFulfillment,
        (SELECT COUNT(*) FROM page_readiness) AS readinessRows,
        (SELECT COUNT(*) FROM ingest_stage_items WHERE status = 'pending') AS ingestPending`
    )
    .get() as CoverageSnapshot;
};

export const assertPublicRecordCoverage = (snapshot: CoverageSnapshot): void => {
  const minimums: CoverageSnapshot = {
    parties: 8,
    politicians: 8,
    currentMemberships: 8,
    publicPromises: 14,
    acceptedSources: 14,
    stances: 14,
    unknownFulfillment: 14,
    readinessRows: 30,
    ingestPending: 1
  };

  for (const [key, minimum] of Object.entries(minimums) as Array<[keyof CoverageSnapshot, number]>) {
    if ((snapshot[key] ?? 0) < minimum) {
      throw new Error(`${key} expected >= ${minimum}, got ${snapshot[key] ?? 0}`);
    }
  }
};

const withPublicRecordDatabase = <T>(dbPath: string, work: (db: Database.Database) => T): T => {
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

  const output = withPublicRecordDatabase(dbPath, (db) => {
    const coverage = mode === "seed" ? seedPublicRecordData(db) : readPublicRecordCoverage(db);
    assertPublicRecordCoverage(coverage);
    return { ok: true, dbPath, asOfDate: AS_OF_DATE, coverage };
  });

  if (mode !== "seed" && mode !== "coverage") {
    throw new Error(`Unknown mode: ${mode}`);
  }

  console.log(JSON.stringify(output, null, 2));
};

const isDirectExecution = (): boolean => {
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(entry).href;
};

if (isDirectExecution()) {
  runCli(process.argv[2] ?? "coverage", process.env.DB_PATH ?? DEFAULT_DB_PATH);
}
