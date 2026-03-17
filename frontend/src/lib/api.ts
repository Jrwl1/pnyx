/* WHAT IT DO? Wraps backend fetch calls for auth, politicians, statements, statement detail, and revision history. */

import type {
  AuthTokenRequest,
  AuthTokenResponse,
  Politician,
  ProposalAuditResponse,
  ProposalClaimResult,
  ProposalDuplicateAssist,
  ProposalQueueFilters,
  ProposalQueueMetrics,
  ProposalQueueResponse,
  ProposalReleaseResult,
  ProposalReviewInput,
  ProposalReviewResult,
  PoliticianProposalInput,
  PoliticianProposalRecord,
  RegisterAccountInput,
  RegisteredAccount,
  StatementDetail,
  StatementSubmissionInput,
  StatementSubmissionResult,
  StatementRevision,
  StatementSummary,
  VoteSubmissionResult,
  VoteValue
} from "../types";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "/api").replace(/\/$/, "");

type ApiErrorPayload = {
  error?: string;
  message?: string;
  retryAfterSeconds?: number;
};

type JsonRequestOptions = {
  body?: unknown;
  method?: "GET" | "POST" | "PATCH";
  token?: string;
};

export class ApiRequestError extends Error {
  status: number;
  code?: string;
  retryAfterSeconds?: number;

  constructor(status: number, payload: ApiErrorPayload | null, fallbackMessage: string) {
    super(payload?.message ?? payload?.error ?? fallbackMessage);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = payload?.error;
    this.retryAfterSeconds = payload?.retryAfterSeconds;
  }
}

const readErrorPayload = async (response: Response): Promise<ApiErrorPayload | null> => {
  try {
    return (await response.json()) as ApiErrorPayload;
  } catch {
    return null;
  }
};

const fetchJson = async <T>(path: string, options: JsonRequestOptions = {}): Promise<T> => {
  const headers = new Headers({
    Accept: "application/json"
  });
  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const payload = await readErrorPayload(response);
    throw new ApiRequestError(response.status, payload, response.statusText || "Request failed");
  }

  return (await response.json()) as T;
};

export const requestAuthToken = async (input: AuthTokenRequest): Promise<AuthTokenResponse> => {
  return fetchJson<AuthTokenResponse>("/auth/token", {
    method: "POST",
    body: input
  });
};

export const registerAccount = async (input: RegisterAccountInput): Promise<RegisteredAccount> => {
  return fetchJson<RegisteredAccount>("/auth/register", {
    method: "POST",
    body: {
      email: input.email,
      captchaToken: input.captchaToken
    }
  });
};

export const submitPoliticianProposal = async (
  token: string,
  input: PoliticianProposalInput
): Promise<PoliticianProposalRecord> => {
  return fetchJson<PoliticianProposalRecord>("/politician-proposals", {
    method: "POST",
    token,
    body: input
  });
};

export const createStatement = async (token: string, input: StatementSubmissionInput): Promise<StatementSubmissionResult> => {
  return fetchJson<StatementSubmissionResult>("/statements", {
    method: "POST",
    token,
    body: input
  });
};

export const listPoliticians = async (): Promise<Politician[]> => {
  const response = await fetchJson<{ items: Politician[] }>("/politicians");
  return response.items;
};

export const listStatements = async (): Promise<StatementSummary[]> => {
  const response = await fetchJson<{ items: StatementSummary[] }>("/statements");
  return response.items;
};

export const getStatementById = async (id: number, token?: string): Promise<StatementDetail> => {
  return fetchJson<StatementDetail>(`/statements/${id}`, { token });
};

export const getStatementRevisions = async (id: number): Promise<StatementRevision[]> => {
  const response = await fetchJson<{ items: StatementRevision[] }>(`/statements/${id}/revisions`);
  return response.items;
};

export const castStatementVote = async (token: string, statementId: number, value: VoteValue): Promise<VoteSubmissionResult> => {
  return fetchJson<VoteSubmissionResult>(`/statements/${statementId}/votes`, {
    method: "POST",
    token,
    body: { value }
  });
};

const buildProposalQueuePath = (filters: ProposalQueueFilters = {}): string => {
  const params = new URLSearchParams();

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.assignee) {
    params.set("assignee", filters.assignee);
  }
  if (filters.ageBucket) {
    params.set("ageBucket", filters.ageBucket);
  }
  if (filters.sort) {
    params.set("sort", filters.sort);
  }
  if (filters.page) {
    params.set("page", String(filters.page));
  }
  if (filters.pageSize) {
    params.set("pageSize", String(filters.pageSize));
  }

  const query = params.toString();
  return `/politician-proposals${query ? `?${query}` : ""}`;
};

export const listPoliticianProposals = async (token: string, filters: ProposalQueueFilters = {}): Promise<ProposalQueueResponse> => {
  return fetchJson<ProposalQueueResponse>(buildProposalQueuePath(filters), { token });
};

export const getPoliticianProposalMetrics = async (token: string): Promise<ProposalQueueMetrics> => {
  return fetchJson<ProposalQueueMetrics>("/politician-proposals/metrics", { token });
};

export const claimPoliticianProposal = async (
  token: string,
  proposalId: number,
  expectedVersion: number
): Promise<ProposalClaimResult> => {
  return fetchJson<ProposalClaimResult>(`/politician-proposals/${proposalId}/claim`, {
    method: "POST",
    token,
    body: { expectedVersion }
  });
};

export const releasePoliticianProposal = async (
  token: string,
  proposalId: number,
  expectedVersion: number
): Promise<ProposalReleaseResult> => {
  return fetchJson<ProposalReleaseResult>(`/politician-proposals/${proposalId}/release`, {
    method: "POST",
    token,
    body: { expectedVersion }
  });
};

export const reviewPoliticianProposal = async (
  token: string,
  proposalId: number,
  input: ProposalReviewInput
): Promise<ProposalReviewResult> => {
  return fetchJson<ProposalReviewResult>(`/politician-proposals/${proposalId}/review`, {
    method: "PATCH",
    token,
    body: input
  });
};

export const getPoliticianProposalDuplicateAssist = async (token: string, proposalId: number): Promise<ProposalDuplicateAssist> => {
  return fetchJson<ProposalDuplicateAssist>(`/politician-proposals/${proposalId}/duplicate-assist`, { token });
};

export const getPoliticianProposalAudits = async (token: string, proposalId: number): Promise<ProposalAuditResponse> => {
  return fetchJson<ProposalAuditResponse>(`/politician-proposals/${proposalId}/audits`, { token });
};
