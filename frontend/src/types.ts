/* Shared frontend types for politicians, promises, evidence, party pages, and derived accountability states. */

export type FulfillmentStatus = "fulfilled" | "broken" | "in_progress" | "unknown";
export type AlignmentStatus = "aligned" | "contradicted" | "mixed" | "unknown";
export type PartyLineStatus = "aligned" | "broke_party_line" | "unknown";
export type PlaceholderState = "placeholder";

export interface Politician {
  id: number;
  name: string;
  region: string | null;
  constituency?: string | null;
  office: string | null;
  partyId?: string | null;
  partyName?: string | null;
  partyShortName?: string | null;
  externalId: string | null;
  verified: number;
  createdAt: string;
}

export interface StatementSummary {
  id: number;
  politicianId: number;
  sourceUrl: string;
  body: string;
  dateSaid: string;
  verificationStatus: string;
  authorId: string;
  createdAt: string;
}

export interface StatementDetail extends StatementSummary {
  updatedAt: string;
  aggregate: {
    support: number;
    oppose: number;
  };
  revisionCount: number;
  revisionHistoryUrl: string;
}

export interface StatementRevision {
  id: number;
  statementId: number;
  actorId: string;
  changeType: string;
  fromValue: string | null;
  toValue: string | null;
  reason: string | null;
  createdAt: string;
}

export interface PromiseRecord {
  id: number;
  politicianId: number;
  promiseText: string;
  datePromised: string;
  fulfillmentStatus: FulfillmentStatus;
  fulfillmentSummary: string;
  voteAlignment: AlignmentStatus;
  evidenceCount: number;
}

export interface PromiseStats {
  total: number;
  fulfilled: number;
  broken: number;
  inProgress: number;
  unknown: number;
}

export interface AlignmentStats {
  aligned: number;
  contradicted: number;
  mixed: number;
  unknown: number;
}

export interface DirectoryRow {
  politician: Politician;
  promises: PromiseRecord[];
  promiseStats: PromiseStats;
  alignmentStats: AlignmentStats;
  lastUpdated: string | null;
  issueTags: string[];
}

export interface PartyRecord {
  id: string;
  name: string;
  shortName: string;
  contextLine: string;
  dataState: PlaceholderState;
}

export interface PartyStanceRecord {
  id: string;
  partyId: string;
  issue: string | null;
  stanceText: string;
  sourceUrl: string | null;
  dateSaid: string | null;
  dataState: PlaceholderState;
}

export interface PartyMemberRecord {
  politicianId: number | null;
  name: string;
  office: string | null;
  region: string | null;
  partyLineStatus: PartyLineStatus;
  dataState: PlaceholderState;
}

export interface PartyProfileShell {
  party: PartyRecord;
  officialStancesTracked: number | null;
  membersOnPnyx: number | null;
  partyLineSummary: PartyLineStatus;
  notes: string[];
  stances: PartyStanceRecord[];
  members: PartyMemberRecord[];
}

export interface LatestPromiseFeedItem {
  promise: PromiseRecord;
  politician: Politician | null;
  linkedParty: PartyRecord | null;
  publishedAt: string;
}

export interface PartyDiscoveryCard {
  party: PartyRecord;
  linkedPoliticians: number;
  promisesTracked: number;
  latestActivity: string | null;
}

export const PARTY_ROUTE_SHELLS: PartyProfileShell[] = [
  {
    party: {
      id: "sdp",
      name: "Social Democratic Party of Finland",
      shortName: "SDP",
      contextLine: "Party page with public context today, while stance, membership, and party-line records are still being connected.",
      dataState: "placeholder"
    },
    officialStancesTracked: null,
    membersOnPnyx: null,
    partyLineSummary: "unknown",
    notes: [
      "Public party context is available on this page now.",
      "Official party stance records have not been connected yet.",
      "Member-to-party links are not available on this page yet."
    ],
    stances: [],
    members: []
  },
  {
    party: {
      id: "kok",
      name: "National Coalition Party",
      shortName: "KOK",
      contextLine: "Party page with public context today, while stance, membership, and party-line records are still being connected.",
      dataState: "placeholder"
    },
    officialStancesTracked: null,
    membersOnPnyx: null,
    partyLineSummary: "unknown",
    notes: [
      "Public party context is available on this page now.",
      "Official party stance records have not been connected yet.",
      "Member-to-party links are not available on this page yet."
    ],
    stances: [],
    members: []
  },
  {
    party: {
      id: "kesk",
      name: "Centre Party of Finland",
      shortName: "KESK",
      contextLine: "Party page with public context today, while stance, membership, and party-line records are still being connected.",
      dataState: "placeholder"
    },
    officialStancesTracked: null,
    membersOnPnyx: null,
    partyLineSummary: "unknown",
    notes: [
      "Public party context is available on this page now.",
      "Official party stance records have not been connected yet.",
      "Member-to-party links are not available on this page yet."
    ],
    stances: [],
    members: []
  },
  {
    party: {
      id: "ps",
      name: "Finns Party",
      shortName: "PS",
      contextLine: "Party page with public context today, while stance, membership, and party-line records are still being connected.",
      dataState: "placeholder"
    },
    officialStancesTracked: null,
    membersOnPnyx: null,
    partyLineSummary: "unknown",
    notes: [
      "Public party context is available on this page now.",
      "Official party stance records have not been connected yet.",
      "Member-to-party links are not available on this page yet."
    ],
    stances: [],
    members: []
  },
  {
    party: {
      id: "vihr",
      name: "Green League",
      shortName: "VIHR",
      contextLine: "Party page with public context today, while stance, membership, and party-line records are still being connected.",
      dataState: "placeholder"
    },
    officialStancesTracked: null,
    membersOnPnyx: null,
    partyLineSummary: "unknown",
    notes: [
      "Public party context is available on this page now.",
      "Official party stance records have not been connected yet.",
      "Member-to-party links are not available on this page yet."
    ],
    stances: [],
    members: []
  },
  {
    party: {
      id: "vas",
      name: "Left Alliance",
      shortName: "VAS",
      contextLine: "Party page with public context today, while stance, membership, and party-line records are still being connected.",
      dataState: "placeholder"
    },
    officialStancesTracked: null,
    membersOnPnyx: null,
    partyLineSummary: "unknown",
    notes: [
      "Public party context is available on this page now.",
      "Official party stance records have not been connected yet.",
      "Member-to-party links are not available on this page yet."
    ],
    stances: [],
    members: []
  }
];

export const getPartyRouteShell = (id: string | undefined): PartyProfileShell | null => {
  if (!id) {
    return null;
  }

  return PARTY_ROUTE_SHELLS.find((entry) => entry.party.id === id) ?? null;
};
