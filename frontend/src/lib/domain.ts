/* Maps API payloads to V3 accountability records with explicit unknown-state handling and directory helpers. */

import type {
  AlignmentStats,
  BackendPartySummary,
  DirectoryRow,
  LatestPromiseFeedItem,
  PartyDiscoveryCard,
  PartyRecord,
  PartyProfileShell,
  Politician,
  PromiseRecord,
  PromiseStats,
  StatementSummary
} from "../types";
import { getPartyRouteShell, PARTY_ROUTE_SHELLS } from "../types";
import { DATA_NOT_AVAILABLE, formatIdentityLine, normalizeForSearch } from "./format";

export const ISSUE_OPTIONS = [
  "Public finances",
  "Employment",
  "Healthcare and care",
  "Climate and energy",
  "Education",
  "Welfare and social security",
  "Research and innovation",
  "Environment",
  "Mental health",
  "Work incentives",
  "Security and preparedness"
] as const;

const ISSUE_KEYWORDS: Record<(typeof ISSUE_OPTIONS)[number], string[]> = {
  "Public finances": ["public finances", "fiscal", "debt", "budget", "tax", "taxation", "adjustment", "welfare state"],
  Employment: ["employment", "jobs", "work", "labour", "labor", "worker", "unemployment"],
  "Healthcare and care": ["health", "hospital", "care", "clinic", "nurse", "doctor", "social care", "wellbeing"],
  "Climate and energy": ["climate", "emission", "energy", "renewable", "environment", "nature", "electricity"],
  Education: ["school", "education", "teacher", "student", "university", "curriculum", "learning", "vocational"],
  "Welfare and social security": ["welfare", "social security", "basic income", "benefit", "vulnerable"],
  "Research and innovation": ["research", "innovation", "rdi", "development", "competence"],
  Environment: ["environment", "nature", "biodiversity", "archipelago", "baltic sea", "eutrophication"],
  "Mental health": ["mental health", "therapy", "wellbeing", "timely services"],
  "Work incentives": ["work incentives", "work should pay", "entrepreneurship", "mobility costs"],
  "Security and preparedness": ["security", "defence", "defense", "nato", "border", "police", "emergency", "military", "preparedness"]
};

export const SORT_OPTIONS = {
  mostPromises: "most_promises",
  fulfillmentRate: "fulfillment_rate",
  recentlyUpdated: "recently_updated"
} as const;

export type DirectorySort = (typeof SORT_OPTIONS)[keyof typeof SORT_OPTIONS];
export interface SearchSuggestion {
  key: string;
  label: string;
  description: string;
  target: string;
}

const fallbackPartyRecords = PARTY_ROUTE_SHELLS.map((entry) => entry.party);

export const toPartyRecord = (party: BackendPartySummary): PartyRecord => {
  return {
    id: party.id,
    name: party.name,
    shortName: party.shortName,
    contextLine:
      party.description ??
      "Party page with backend-backed identity and membership counts, while stance and party-line records are still being connected.",
    dataState: "live"
  };
};

export const toPromiseRecord = (statement: StatementSummary): PromiseRecord => {
  const recordType = statement.canonicalPromiseId ? "canonical" : "legacy";
  return {
    id: statement.id,
    politicianId: statement.politicianId,
    promiseText: statement.canonicalPromiseText ?? statement.body,
    datePromised: statement.dateSaid,
    fulfillmentStatus: "unknown",
    fulfillmentSummary: DATA_NOT_AVAILABLE,
    voteAlignment: "unknown",
    evidenceCount: statement.acceptedSourceCount > 0 ? statement.acceptedSourceCount : statement.sourceUrl ? 1 : 0,
    canonicalPromiseId: statement.canonicalPromiseId,
    recordType
  };
};

export const getTerritoryLabel = (politician: Politician): string | null => {
  const constituency = politician.constituency?.trim();
  if (constituency) {
    return constituency;
  }

  const region = politician.region?.trim();
  return region || null;
};

export const getPartyAffiliationLabel = (politician: Politician): string => {
  const shortName = politician.partyShortName?.trim();
  const name = politician.partyName?.trim();

  if (shortName && name && normalizeForSearch(shortName) !== normalizeForSearch(name)) {
    return `${shortName} - ${name}`;
  }

  return shortName || name || DATA_NOT_AVAILABLE;
};

export const hasPartyAffiliationData = (politicians: Politician[]): boolean => {
  return politicians.some((politician) => Boolean(politician.partyId || politician.partyName || politician.partyShortName));
};

export const findPartyShellByQuery = (query: string, partyRecords: PartyRecord[] = fallbackPartyRecords): PartyProfileShell | null => {
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) {
    return null;
  }

  const match =
    partyRecords.find((entry) => {
      return [entry.name, entry.shortName]
        .map((value) => normalizeForSearch(value))
        .some((candidate) => candidate === normalizedQuery);
    }) ?? null;

  if (!match) {
    return null;
  }

  return {
    party: match,
    officialStancesTracked: null,
    membersOnPnyx: null,
    partyLineSummary: "unknown",
    notes: [
      "Party identity is now backed by backend reads.",
      "Official party stances have not been connected yet.",
      "Party-line comparison still stays unknown until supporting records exist."
    ],
    stances: [],
    members: []
  };
};

export const findPartyShellForPolitician = (
  politician: Politician | null | undefined,
  partyRecords: PartyRecord[] = fallbackPartyRecords
): PartyProfileShell | null => {
  if (!politician) {
    return null;
  }

  if (politician.partyId) {
    const directMatch = getPartyRouteShell(politician.partyId);
    if (directMatch) {
      return directMatch;
    }
    const dynamicMatch = partyRecords.find((entry) => entry.id === politician.partyId);
    if (dynamicMatch) {
      return {
        party: dynamicMatch,
        officialStancesTracked: null,
        membersOnPnyx: null,
        partyLineSummary: "unknown",
        notes: [],
        stances: [],
        members: []
      };
    }
  }

  if (politician.partyId && (politician.partyShortName || politician.partyName)) {
    return {
      party: {
        id: politician.partyId,
        name: politician.partyName ?? politician.partyShortName ?? politician.partyId,
        shortName: politician.partyShortName ?? politician.partyName ?? politician.partyId,
        contextLine: "Backend-backed party identity is available for this politician.",
        dataState: "live"
      },
      officialStancesTracked: null,
      membersOnPnyx: null,
      partyLineSummary: "unknown",
      notes: [],
      stances: [],
      members: []
    };
  }

  return findPartyShellByQuery(politician.partyShortName ?? politician.partyName ?? "", partyRecords);
};

export const getIssueTagsForStatement = (statement: StatementSummary): string[] => {
  const body = normalizeForSearch(statement.body);
  return ISSUE_OPTIONS.filter((issue) => ISSUE_KEYWORDS[issue].some((keyword) => body.includes(keyword)));
};

const getStatementActivityDate = (statement: StatementSummary): string => {
  return statement.dateSaid || statement.createdAt;
};

const buildPromiseStats = (promises: PromiseRecord[]): PromiseStats => {
  return promises.reduce<PromiseStats>(
    (stats, promise) => {
      stats.total += 1;

      if (promise.fulfillmentStatus === "fulfilled") {
        stats.fulfilled += 1;
      } else if (promise.fulfillmentStatus === "broken") {
        stats.broken += 1;
      } else if (promise.fulfillmentStatus === "in_progress") {
        stats.inProgress += 1;
      } else {
        stats.unknown += 1;
      }

      return stats;
    },
    {
      total: 0,
      fulfilled: 0,
      broken: 0,
      inProgress: 0,
      unknown: 0
    }
  );
};

const buildAlignmentStats = (promises: PromiseRecord[]): AlignmentStats => {
  return promises.reduce<AlignmentStats>(
    (stats, promise) => {
      if (promise.voteAlignment === "aligned") {
        stats.aligned += 1;
      } else if (promise.voteAlignment === "contradicted") {
        stats.contradicted += 1;
      } else if (promise.voteAlignment === "mixed") {
        stats.mixed += 1;
      } else {
        stats.unknown += 1;
      }

      return stats;
    },
    {
      aligned: 0,
      contradicted: 0,
      mixed: 0,
      unknown: 0
    }
  );
};

export const buildDirectoryRows = (politicians: Politician[], statements: StatementSummary[]): DirectoryRow[] => {
  const statementsByPolitician = new Map<number, StatementSummary[]>();

  for (const statement of statements) {
    const list = statementsByPolitician.get(statement.politicianId);
    if (list) {
      list.push(statement);
    } else {
      statementsByPolitician.set(statement.politicianId, [statement]);
    }
  }

  return politicians.map((politician) => {
    const politicianStatements = statementsByPolitician.get(politician.id) ?? [];
    const promises = politicianStatements.map(toPromiseRecord);
    const issueSet = new Set<string>();

    let latestDate: string | null = null;
    for (const statement of politicianStatements) {
      const candidate = getStatementActivityDate(statement);
      if (!latestDate || new Date(candidate).getTime() > new Date(latestDate).getTime()) {
        latestDate = candidate;
      }

      for (const issue of getIssueTagsForStatement(statement)) {
        issueSet.add(issue);
      }
    }

    return {
      politician,
      promises,
      promiseStats: buildPromiseStats(promises),
      alignmentStats: buildAlignmentStats(promises),
      lastUpdated: latestDate,
      issueTags: [...issueSet]
    };
  });
};

export const buildSearchText = (row: DirectoryRow): string => {
  return [
    row.politician.name,
    row.politician.office,
    getTerritoryLabel(row.politician),
    row.politician.partyName,
    row.politician.partyShortName,
    row.politician.externalId,
    ...row.issueTags
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
};

export const buildSearchSuggestions = (
  politicians: Politician[],
  query: string,
  limit = 6,
  partyRecords: PartyRecord[] = fallbackPartyRecords
): SearchSuggestion[] => {
  const normalizedQuery = normalizeForSearch(query);
  if (normalizedQuery.length < 2) {
    return [];
  }

  const partySuggestions = partyRecords
    .filter((entry) => [entry.name, entry.shortName].some((value) => normalizeForSearch(value).includes(normalizedQuery)))
    .map((entry) => ({
      key: `party-${entry.id}`,
      label: entry.name,
      description: `${entry.shortName} party page`,
      target: `/parties/${entry.id}`
    }));

  const politicianSuggestions = politicians
    .filter((politician) => {
      return [
        politician.name,
        politician.office,
        getTerritoryLabel(politician),
        politician.partyName,
        politician.partyShortName
      ]
        .filter(Boolean)
        .some((value) => normalizeForSearch(value).includes(normalizedQuery));
    })
    .map((politician) => ({
      key: `politician-${politician.id}`,
      label: politician.name,
      description: `${formatIdentityLine(politician.office, getTerritoryLabel(politician))} · ${getPartyAffiliationLabel(politician)}`,
      target: `/politicians/${politician.id}`
    }));

  return [...politicianSuggestions, ...partySuggestions].slice(0, limit);
};

export const buildLatestPromiseFeed = (
  politicians: Politician[],
  statements: StatementSummary[],
  limit = 4
): LatestPromiseFeedItem[] => {
  const politiciansById = new Map(politicians.map((politician) => [politician.id, politician]));

  return statements
    .map((statement) => {
      const politician = politiciansById.get(statement.politicianId) ?? null;
      const linkedParty = findPartyShellForPolitician(politician)?.party ?? null;

      return {
        promise: toPromiseRecord(statement),
        politician,
        linkedParty,
        publishedAt: getStatementActivityDate(statement)
      };
    })
    .sort((left, right) => new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime())
    .slice(0, limit);
};

export const buildHomePartyCards = (
  politicians: Politician[],
  statements: StatementSummary[],
  partyRecords: PartyRecord[] = fallbackPartyRecords
): PartyDiscoveryCard[] => {
  const politiciansById = new Map(politicians.map((politician) => [politician.id, politician]));
  const rollups = new Map(
    partyRecords.map((party) => [
      party.id,
      {
        linkedPoliticianIds: new Set<number>(),
        promisesTracked: 0,
        latestActivity: null as string | null
      }
    ])
  );

  for (const politician of politicians) {
    const linkedParty = findPartyShellForPolitician(politician, partyRecords);
    if (!linkedParty) {
      continue;
    }

    rollups.get(linkedParty.party.id)?.linkedPoliticianIds.add(politician.id);
  }

  for (const statement of statements) {
    const politician = politiciansById.get(statement.politicianId);
    const linkedParty = findPartyShellForPolitician(politician, partyRecords);
    if (!linkedParty) {
      continue;
    }

    const rollup = rollups.get(linkedParty.party.id);
    if (!rollup) {
      continue;
    }

    rollup.promisesTracked += 1;
    const candidate = getStatementActivityDate(statement);
    if (!rollup.latestActivity || new Date(candidate).getTime() > new Date(rollup.latestActivity).getTime()) {
      rollup.latestActivity = candidate;
    }
  }

  return partyRecords.map((party) => {
    const rollup = rollups.get(party.id);

    return {
      party,
      linkedPoliticians: rollup?.linkedPoliticianIds.size ?? 0,
      promisesTracked: rollup?.promisesTracked ?? 0,
      latestActivity: rollup?.latestActivity ?? null
    };
  }).sort((left, right) => {
    if (right.promisesTracked !== left.promisesTracked) {
      return right.promisesTracked - left.promisesTracked;
    }

    if (right.linkedPoliticians !== left.linkedPoliticians) {
      return right.linkedPoliticians - left.linkedPoliticians;
    }

    return left.party.name.localeCompare(right.party.name);
  });
};
