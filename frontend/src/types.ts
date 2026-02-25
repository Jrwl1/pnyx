/* WHAT IT DO? Defines shared frontend types for politicians, promises, evidence, and derived accountability states. */

export type FulfillmentStatus = "fulfilled" | "broken" | "in_progress" | "unknown";
export type AlignmentStatus = "aligned" | "contradicted" | "mixed" | "unknown";

export interface Politician {
  id: number;
  name: string;
  region: string | null;
  office: string | null;
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
