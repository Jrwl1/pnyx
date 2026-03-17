/* Shared frontend types for auth, politicians, promises, evidence, party pages, and derived accountability states. */

export type AuthRole = "anonymous" | "user" | "moderator" | "admin";
export type AuthenticatedRole = Exclude<AuthRole, "anonymous">;

export interface RegisterAccountInput {
  email: string;
  captchaToken?: string;
}

export interface RegisteredAccount {
  id: string;
  email: string;
  role: AuthenticatedRole;
}

export interface AuthTokenRequest {
  userId: string;
  role: AuthenticatedRole;
  secret: string;
}

export interface AuthTokenResponse {
  token: string;
}

export interface AuthSession {
  token: string;
  userId: string;
  role: AuthenticatedRole;
  expiresAt: string | null;
}

export interface PoliticianProposalInput {
  name: string;
  region?: string;
  office?: string;
  externalId?: string;
  sourceNote?: string;
  captchaToken?: string;
}

export interface PoliticianProposalRecord {
  id: number;
  status: string;
}

export interface StatementSubmissionInput {
  politicianId: number;
  sourceUrl: string;
  body: string;
  dateSaid: string;
}

export interface StatementSubmissionResult {
  id: number;
  verificationStatus: string;
}

export type VoteValue = "support" | "oppose";
export type VoteRecordValue = "for" | "against" | "abstain" | "absent";

export type FulfillmentStatus = "fulfilled" | "broken" | "in_progress" | "unknown";
export type AlignmentStatus = "aligned" | "contradicted" | "mixed" | "unknown";
export type PartyLineStatus = "aligned" | "broke_party_line" | "unknown";
export type PlaceholderState = "placeholder";
export type PartyDataState = "placeholder" | "live";

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
  trustSummary?: PoliticianTrustSummary;
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
  canonicalPromiseId: number | null;
  promiseKind: PromiseKind;
  canonicalPromiseText: string | null;
  acceptedSourceCount: number;
}

export type PromiseKind = "raw_submission" | "canonical_public" | "canonical_draft";

export interface CanonicalPromiseMetadata {
  id: number;
  promiseText: string;
  publicStatus: "draft" | "public";
  primaryStatementId: number | null;
  acceptedSourceCount: number;
}

export interface CanonicalPromiseSource {
  id: number;
  canonicalPromiseId: number;
  statementId: number | null;
  sourceUrl: string;
  sourceNote: string | null;
  acceptedBy: string;
  acceptedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface StatementDetail extends StatementSummary {
  updatedAt: string;
  aggregate: {
    support: number;
    oppose: number;
  };
  viewerVote: VoteValue | null;
  canonical: CanonicalPromiseMetadata | null;
  acceptedSources: CanonicalPromiseSource[];
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

export interface VoteSubmissionResult {
  ok: boolean;
  aggregate: {
    support: number;
    oppose: number;
  };
  viewerVote: VoteValue;
}

export type ProposalStatus = "pending" | "approved" | "rejected" | "duplicate";
export type ProposalAgeBucket = "lt1h" | "1to24h" | "gt24h";

export interface PoliticianProposalQueueItem {
  id: number;
  submittedBy: string;
  assigneeId: string | null;
  assignedAt: string | null;
  name: string;
  region: string | null;
  office: string | null;
  externalId: string | null;
  sourceNote: string | null;
  status: ProposalStatus;
  decisionBy: string | null;
  decisionReason: string | null;
  decisionCode: string | null;
  linkedPoliticianId: number | null;
  reviewVersion: number;
  createdAt: string;
  decidedAt: string | null;
}

export interface ProposalQueueResponse {
  items: PoliticianProposalQueueItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ProposalQueueFilters {
  status?: ProposalStatus | "all";
  assignee?: string;
  ageBucket?: ProposalAgeBucket;
  sort?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface ProposalQueueMetrics {
  pending: {
    total: number;
    assigned: number;
    unassigned: number;
  };
  ageBuckets: {
    lt1h: number;
    oneTo24h: number;
    gt24h: number;
  };
}

export interface ProposalClaimResult {
  ok: boolean;
  assigneeId: string;
  reviewVersion: number;
}

export interface ProposalReleaseResult {
  ok: boolean;
  reviewVersion: number;
}

export interface ProposalReviewInput {
  decision: "approve" | "reject" | "duplicate";
  reason?: string;
  reasonCode?: string;
  linkedPoliticianId?: number;
  expectedVersion?: number;
}

export interface ProposalReviewResult {
  ok: boolean;
  status: ProposalStatus;
  politicianId: number | null;
  reviewVersion: number;
}

export interface ProposalCandidateHint {
  id: number;
  name: string;
  region: string | null;
  office: string | null;
  externalId: string | null;
  matchOn?: string[];
  score?: number;
}

export interface ProposalDuplicateAssist {
  proposalId: number;
  canonicalMatches: ProposalCandidateHint[];
  pendingProposalMatches: ProposalCandidateHint[];
  fuzzyHints: {
    canonical: ProposalCandidateHint[];
    pendingProposals: ProposalCandidateHint[];
  };
}

export interface ProposalAuditItem {
  id: number;
  proposalId: number;
  actorId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  reasonCode: string | null;
  linkedPoliticianId: number | null;
  createdAt: string;
}

export interface ProposalAuditResponse {
  items: ProposalAuditItem[];
  page: number;
  pageSize: number;
  total: number;
}

export type PromiseClaimStatus = "pending" | "merged" | "canonized" | "rejected";

export interface PromiseClaimRecord {
  id: number;
  submittedBy: string;
  politicianId: number;
  claimText: string;
  sourceUrl: string;
  dateSaid: string;
  sourceNote: string | null;
  status: PromiseClaimStatus;
  assigneeId: string | null;
  assignedAt: string | null;
  decisionBy: string | null;
  decisionReason: string | null;
  decisionCode: string | null;
  linkedCanonicalPromiseId: number | null;
  reviewVersion: number;
  createdAt: string;
  decidedAt: string | null;
}

export interface PromiseClaimSubmissionInput {
  politicianId: number;
  claimText: string;
  sourceUrl: string;
  dateSaid: string;
  sourceNote?: string;
}

export interface PromiseClaimSubmissionResult {
  id: number;
  status: PromiseClaimStatus;
}

export interface PromiseClaimListResponse {
  items: PromiseClaimRecord[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PromiseClaimDuplicateAssist {
  canonicalMatches: Array<{
    id: number;
    politicianId: number;
    promiseText: string;
    publicStatus: "draft" | "public";
    acceptedSourceCount: number;
    matchOn: string[];
  }>;
  pendingClaimMatches: Array<{
    id: number;
    politicianId: number;
    claimText: string;
    sourceUrl: string;
    matchOn: string[];
  }>;
  fuzzyHints: {
    canonical: Array<{ id: number; politicianId: number; promiseText: string; score: number }>;
    pendingClaims: Array<{ id: number; politicianId: number; claimText: string; score: number }>;
  };
}

export interface ClaimEquivalenceSignal {
  id: number;
  claimId: number;
  actorId: string;
  targetKind: "canonical_promise" | "claim";
  targetId: number;
  relation: "same_as" | "non_match";
  reasonCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimEquivalenceSignalInput {
  targetKind: "canonical_promise" | "claim";
  targetId: number;
  relation: "same_as" | "non_match";
  reasonCode: "same_claim" | "same_promise" | "different_subject" | "different_scope";
}

export interface PromiseClaimAudit {
  id: number;
  claimId: number;
  actorId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  reason: string | null;
  reasonCode: string | null;
  linkedCanonicalPromiseId: number | null;
  createdAt: string;
}

export interface PromiseClaimReviewInput {
  decision: "merge" | "canonize" | "reject";
  reason?: string;
  reasonCode?: string;
  linkedCanonicalPromiseId?: number;
  publicStatus?: "draft" | "public";
  expectedVersion?: number;
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
  canonicalPromiseId: number | null;
  recordType: "canonical" | "legacy";
}

export interface CanonicalPromiseSummary {
  id: number;
  politicianId: number;
  promiseText: string;
  publicStatus: "draft" | "public";
  primaryStatementId: number | null;
  acceptedSourceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CanonicalPromiseDetailResponse {
  promise: CanonicalPromiseSummary;
  acceptedSources: CanonicalPromiseSource[];
  history?: CanonicalPromiseHistoryEntry[];
  trustContext?: CanonicalPromiseTrustContext;
}

export interface CanonicalPromiseHistoryEntry {
  id: number;
  action: "merged" | "canonized";
  actorId: string;
  claimId: number;
  claimText: string;
  sourceUrl: string;
  reason: string | null;
  reasonCode: string | null;
  createdAt: string;
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

export interface PartyLineStats {
  aligned: number;
  brokePartyLine: number;
  unknown: number;
}

export interface FulfillmentPercentages {
  fulfilled: number;
  broken: number;
  inProgress: number;
  unknown: number;
}

export interface VoteAlignmentPercentages {
  aligned: number;
  contradicted: number;
  mixed: number;
  unknown: number;
}

export interface PartyLinePercentages {
  aligned: number;
  brokePartyLine: number;
  unknown: number;
}

export interface PoliticianPromiseTrustRecord {
  canonicalPromiseId: number;
  statementId: number | null;
  promiseText: string;
  datePromised: string;
  acceptedSourceCount: number;
  fulfillmentStatus: FulfillmentStatus;
  fulfillmentSummary: string;
  voteAlignment: AlignmentStatus;
  voteComparisonCount: number;
  partyLineStatus: PartyLineStatus;
  latestEvidenceDate: string | null;
}

export interface PoliticianTrustSummary {
  politicianId: number;
  fulfillmentCounts: PromiseStats;
  fulfillmentPercentages: FulfillmentPercentages | null;
  voteAlignmentCounts: AlignmentStats;
  voteAlignmentPercentages: VoteAlignmentPercentages | null;
  partyLineCounts: PartyLineStats;
  partyLinePercentages: PartyLinePercentages | null;
  promises: PoliticianPromiseTrustRecord[];
}

export interface PartyTrustMemberSummary {
  politicianId: number;
  name: string;
  region: string | null;
  office: string | null;
  promiseCount: number;
  fulfillmentCounts: PromiseStats;
  voteAlignmentCounts: AlignmentStats;
  partyLineCounts: PartyLineStats;
  lastUpdatedAt: string | null;
}

export interface PartyTrustSummary {
  partyId: string;
  officialStanceCount: number;
  memberCount: number;
  promiseCount: number;
  fulfillmentCounts: PromiseStats;
  fulfillmentPercentages: FulfillmentPercentages | null;
  voteAlignmentCounts: AlignmentStats;
  voteAlignmentPercentages: VoteAlignmentPercentages | null;
  partyLineCounts: PartyLineStats;
  partyLinePercentages: PartyLinePercentages | null;
  members: PartyTrustMemberSummary[];
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
  dataState: PartyDataState;
}

export interface BackendPartySummary {
  id: string;
  name: string;
  shortName: string;
  countryCode: string;
  description: string | null;
  websiteUrl: string | null;
  aliasCount: number;
  memberCount: number;
  currentMemberCount: number;
  createdAt: string;
  updatedAt: string;
  officialStanceCount?: number;
  trustSummary?: PartyTrustSummary;
}

export interface BackendPartyAlias {
  id: number;
  partyId: string;
  alias: string;
  sourceNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendPartyMember {
  membershipId: number;
  politicianId: number;
  name: string;
  region: string | null;
  office: string | null;
  externalId: string | null;
  partyId: string;
  roleTitle: string | null;
  startDate: string | null;
  endDate: string | null;
  sourceNote: string | null;
  createdAt: string;
  updatedAt: string;
  current: number;
  trustSummary?: PartyTrustMemberSummary | null;
}

export interface BackendPartyStance {
  id: number;
  partyId: string;
  issue: string | null;
  stanceText: string;
  sourceUrl: string;
  sourceNote: string | null;
  dateSaid: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendPartyDetailResponse {
  party: BackendPartySummary;
  aliases: BackendPartyAlias[];
  membersUrl: string;
}

export interface BackendPartyMembersResponse {
  partyId: string;
  includeHistorical: boolean;
  items: BackendPartyMember[];
}

export interface PoliticianTrustSummaryResponse {
  politician: Politician;
  trustSummary: PoliticianTrustSummary;
}

export interface CanonicalPromiseVoteComparison {
  linkId: number;
  canonicalPromiseId: number;
  voteEventId: number;
  alignedVoteValue: Exclude<VoteRecordValue, "absent">;
  comparisonNote: string | null;
  createdAt: string;
  updatedAt: string;
  eventTitle: string;
  eventDate: string;
  eventSourceUrl: string;
  eventSourceNote: string | null;
  externalKey: string | null;
  countryCode: string;
  institutionName: string;
  issue: string | null;
  politicianVoteRecordId: number | null;
  politicianVoteValue: VoteRecordValue | null;
  politicianVoteSourceNote: string | null;
  alignmentStatus: Exclude<AlignmentStatus, "mixed">;
}

export interface PromiseFulfillmentAssessment {
  id: number;
  canonicalPromiseId: number;
  status: FulfillmentStatus;
  summary: string;
  sourceUrl: string;
  sourceNote: string | null;
  evidenceDate: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface PromisePartyAlignment {
  id: number;
  canonicalPromiseId: number;
  partyStanceId: number;
  status: Exclude<PartyLineStatus, "unknown">;
  reason: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  partyId: string;
  partyName: string;
  partyShortName: string;
  issue: string | null;
  stanceText: string;
  sourceUrl: string;
  sourceNote: string | null;
  dateSaid: string;
}

export interface CanonicalPromiseTrustContext {
  latestFulfillment: PromiseFulfillmentAssessment | null;
  voteAlignmentSummary: AlignmentStatus;
  voteComparisons: CanonicalPromiseVoteComparison[];
  latestPartyAlignment: PromisePartyAlignment | null;
  partyAlignments: PromisePartyAlignment[];
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
