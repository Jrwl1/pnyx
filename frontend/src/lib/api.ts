/* WHAT IT DO? Wraps backend fetch calls for auth, politicians, statements, statement detail, and revision history. */

import type {
  AbuseMetrics,
  ActivityFeedItem,
  EmailCodeRequestInput,
  EmailCodeRequestResponse,
  EmailCodeVerifyInput,
  EmailCodeVerifyResponse,
  BackendPartyDetailResponse,
  BackendPartyStance,
  BackendPartyMembersResponse,
  BackendPartySummary,
  ClaimEquivalenceSignal,
  ClaimEquivalenceSignalInput,
  CanonicalPromiseDetailResponse,
  CanonicalPromiseSummary,
  Politician,
  PromiseClaimAudit,
  PromiseClaimDuplicateAssist,
  PromiseClaimListResponse,
  PromiseClaimQueueMetrics,
  PromiseClaimRecord,
  PromiseClaimReviewInput,
  PromiseClaimSubmissionInput,
  PromiseClaimSubmissionResult,
  PoliticianTrustSummaryResponse,
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
  RoleGrantInput,
  RoleGrantResult,
  SearchResultItem,
  StatementDetail,
  StatementSubmissionInput,
  StatementSubmissionResult,
  StatementRevision,
  StatementSummary,
  LaunchCoverageSummary,
  NotificationPreferences,
  NotificationRecord,
  VoteEventRecord,
  VoteEventSummary,
  VoteSubmissionResult,
  VoteValue
} from "../types";

const API_BASE = (import.meta.env.VITE_API_BASE ?? import.meta.env.VITE_BACKEND_URL ?? "/api").replace(/\/$/, "");

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

export const requestEmailLoginCode = async (input: EmailCodeRequestInput): Promise<EmailCodeRequestResponse> => {
  return fetchJson<EmailCodeRequestResponse>("/auth/request-code", {
    method: "POST",
    body: input
  });
};

export const verifyEmailLoginCode = async (input: EmailCodeVerifyInput): Promise<EmailCodeVerifyResponse> => {
  return fetchJson<EmailCodeVerifyResponse>("/auth/verify-code", {
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

export const grantUserRole = async (token: string, input: RoleGrantInput): Promise<RoleGrantResult> => {
  return fetchJson<RoleGrantResult>("/auth/role-grants", {
    method: "POST",
    token,
    body: input
  });
};

export const getNotificationPreferences = async (token: string): Promise<NotificationPreferences> => {
  return fetchJson<NotificationPreferences>("/me/notification-preferences", { token });
};

export const updateNotificationPreferences = async (
  token: string,
  input: Partial<{
    inAppEnabled: boolean;
    emailEnabled: boolean;
    reviewUpdatesEnabled: boolean;
    moderatorAssignmentsEnabled: boolean;
    roleUpdatesEnabled: boolean;
  }>
): Promise<NotificationPreferences> => {
  return fetchJson<NotificationPreferences>("/me/notification-preferences", {
    method: "PATCH",
    token,
    body: input
  });
};

export const listNotifications = async (
  token: string,
  options?: { unreadOnly?: boolean }
): Promise<{ items: NotificationRecord[]; page: number; pageSize: number; total: number }> => {
  const params = new URLSearchParams();
  if (options?.unreadOnly) {
    params.set("status", "unread");
  }
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return fetchJson<{ items: NotificationRecord[]; page: number; pageSize: number; total: number }>(
    `/me/notifications${suffix}`,
    { token }
  );
};

export const markNotificationRead = async (token: string, notificationId: number): Promise<{ ok: true }> => {
  return fetchJson<{ ok: true }>(`/me/notifications/${notificationId}/read`, {
    method: "POST",
    token
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

export const searchSite = async (query: string): Promise<SearchResultItem[]> => {
  const response = await fetchJson<{ items: SearchResultItem[] }>(`/search?q=${encodeURIComponent(query)}`);
  return response.items;
};

export const listActivityFeed = async (query = ""): Promise<ActivityFeedItem[]> => {
  const response = await fetchJson<{ items: ActivityFeedItem[] }>(`/activity${query}`);
  return response.items;
};

export const listParties = async (): Promise<BackendPartySummary[]> => {
  const response = await fetchJson<{ items: BackendPartySummary[] }>("/parties");
  return response.items;
};

export const getPartyById = async (id: string): Promise<BackendPartyDetailResponse> => {
  return fetchJson<BackendPartyDetailResponse>(`/parties/${id}`);
};

export const getPartyMembers = async (id: string, includeHistorical = false): Promise<BackendPartyMembersResponse> => {
  const suffix = includeHistorical ? "?includeHistorical=1" : "";
  return fetchJson<BackendPartyMembersResponse>(`/parties/${id}/members${suffix}`);
};

export const getPartyStances = async (id: string): Promise<BackendPartyStance[]> => {
  const response = await fetchJson<{ items: BackendPartyStance[] }>(`/parties/${id}/stances`);
  return response.items;
};

export const createParty = async (
  token: string,
  input: {
    id: string;
    name: string;
    shortName: string;
    countryCode?: string;
    description?: string;
    websiteUrl?: string;
  }
): Promise<{ id: string }> => {
  return fetchJson<{ id: string }>("/parties", {
    method: "POST",
    token,
    body: input
  });
};

export const createPartyAlias = async (
  token: string,
  partyId: string,
  input: {
    alias: string;
    sourceNote?: string;
  }
): Promise<{ id: number; partyId: string }> => {
  return fetchJson<{ id: number; partyId: string }>(`/parties/${partyId}/aliases`, {
    method: "POST",
    token,
    body: input
  });
};

export const createPartyMembership = async (
  token: string,
  input: {
    politicianId: number;
    partyId: string;
    roleTitle?: string;
    startDate?: string;
    endDate?: string;
    sourceNote?: string;
  }
): Promise<{ id: number }> => {
  return fetchJson<{ id: number }>("/party-memberships", {
    method: "POST",
    token,
    body: input
  });
};

export const updatePartyMembership = async (
  token: string,
  membershipId: number,
  input: {
    partyId?: string;
    roleTitle?: string;
    startDate?: string | null;
    endDate?: string | null;
    sourceNote?: string;
  }
): Promise<{ ok: true }> => {
  return fetchJson<{ ok: true }>(`/party-memberships/${membershipId}`, {
    method: "PATCH",
    token,
    body: input
  });
};

export const createPartyStance = async (
  token: string,
  input: {
    partyId: string;
    issue?: string;
    stanceText: string;
    sourceUrl: string;
    sourceNote?: string;
    dateSaid: string;
  }
): Promise<{ id: number; partyId: string }> => {
  return fetchJson<{ id: number; partyId: string }>("/party-stances", {
    method: "POST",
    token,
    body: input
  });
};

export const listVoteEvents = async (politicianId?: number): Promise<VoteEventSummary[]> => {
  const suffix = politicianId ? `?politicianId=${politicianId}` : "";
  const response = await fetchJson<{ items: VoteEventSummary[] }>(`/vote-events${suffix}`);
  return response.items;
};

export const getVoteEventById = async (id: number): Promise<{ event: VoteEventSummary; records: VoteEventRecord[] }> => {
  return fetchJson<{ event: VoteEventSummary; records: VoteEventRecord[] }>(`/vote-events/${id}`);
};

export const createVoteEvent = async (
  token: string,
  input: {
    externalKey?: string;
    countryCode?: string;
    institutionName?: string;
    issue?: string;
    title: string;
    sourceUrl: string;
    sourceNote?: string;
    eventDate: string;
  }
): Promise<{ id: number }> => {
  return fetchJson<{ id: number }>("/vote-events", {
    method: "POST",
    token,
    body: input
  });
};

export const createVoteEventRecord = async (
  token: string,
  voteEventId: number,
  input: {
    politicianId: number;
    voteValue: "for" | "against" | "abstain" | "absent";
    sourceNote?: string;
  }
): Promise<{ id: number; voteEventId: number; politicianId: number }> => {
  return fetchJson<{ id: number; voteEventId: number; politicianId: number }>(`/vote-events/${voteEventId}/records`, {
    method: "POST",
    token,
    body: input
  });
};

export const createFulfillmentAssessment = async (
  token: string,
  canonicalPromiseId: number,
  input: {
    status: "fulfilled" | "broken" | "in_progress" | "unknown";
    summary: string;
    sourceUrl: string;
    sourceNote?: string;
    evidenceDate: string;
  }
): Promise<{ id: number; canonicalPromiseId: number }> => {
  return fetchJson<{ id: number; canonicalPromiseId: number }>(`/canonical-promises/${canonicalPromiseId}/fulfillment-assessments`, {
    method: "POST",
    token,
    body: input
  });
};

export const createPartyAlignment = async (
  token: string,
  canonicalPromiseId: number,
  input: {
    partyStanceId: number;
    status: "aligned" | "broke_party_line";
    reason?: string;
  }
): Promise<{ id: number; canonicalPromiseId: number; partyStanceId: number }> => {
  return fetchJson<{ id: number; canonicalPromiseId: number; partyStanceId: number }>(`/canonical-promises/${canonicalPromiseId}/party-alignments`, {
    method: "POST",
    token,
    body: input
  });
};

export const getLaunchCoverage = async (token: string): Promise<LaunchCoverageSummary> => {
  return fetchJson<LaunchCoverageSummary>("/ops/launch-coverage", { token });
};

export const getPoliticianTrustSummary = async (id: number, token?: string): Promise<PoliticianTrustSummaryResponse> => {
  return fetchJson<PoliticianTrustSummaryResponse>(`/politicians/${id}/trust-summary`, { token });
};

export const listCanonicalPromises = async (politicianId?: number, token?: string): Promise<CanonicalPromiseSummary[]> => {
  const suffix = politicianId ? `?politicianId=${politicianId}` : "";
  const response = await fetchJson<{ items: CanonicalPromiseSummary[] }>(`/canonical-promises${suffix}`, { token });
  return response.items;
};

export const createCanonicalPromise = async (
  token: string,
  input: {
    politicianId: number;
    promiseText: string;
    publicStatus: "draft" | "public";
    primaryStatementId?: number;
    acceptedSources?: Array<{ sourceUrl: string; sourceNote?: string; statementId?: number }>;
  }
): Promise<{ id: number }> => {
  return fetchJson<{ id: number }>("/canonical-promises", {
    method: "POST",
    token,
    body: input
  });
};

export const getCanonicalPromiseById = async (id: number, token?: string): Promise<CanonicalPromiseDetailResponse> => {
  return fetchJson<CanonicalPromiseDetailResponse>(`/canonical-promises/${id}`, { token });
};

export const submitPromiseClaim = async (token: string, input: PromiseClaimSubmissionInput): Promise<PromiseClaimSubmissionResult> => {
  return fetchJson<PromiseClaimSubmissionResult>("/promise-claims", {
    method: "POST",
    token,
    body: input
  });
};

export const previewPromiseClaimDuplicateAssist = async (
  token: string,
  input: Pick<PromiseClaimSubmissionInput, "politicianId" | "claimText" | "sourceUrl">
): Promise<PromiseClaimDuplicateAssist> => {
  return fetchJson<PromiseClaimDuplicateAssist>("/promise-claims/duplicate-assist-preview", {
    method: "POST",
    token,
    body: input
  });
};

export const listPromiseClaims = async (token: string, query = ""): Promise<PromiseClaimListResponse> => {
  return fetchJson<PromiseClaimListResponse>(`/promise-claims${query}`, { token });
};

export const getPromiseClaimMetrics = async (token: string): Promise<PromiseClaimQueueMetrics> => {
  return fetchJson<PromiseClaimQueueMetrics>("/promise-claims/metrics", { token });
};

export const getPromiseClaimById = async (token: string, id: number): Promise<{ claim: PromiseClaimRecord }> => {
  return fetchJson<{ claim: PromiseClaimRecord }>(`/promise-claims/${id}`, { token });
};

export const getPromiseClaimDuplicateAssist = async (token: string, id: number): Promise<PromiseClaimDuplicateAssist> => {
  return fetchJson<PromiseClaimDuplicateAssist>(`/promise-claims/${id}/duplicate-assist`, { token });
};

export const listClaimEquivalenceSignals = async (token: string, id: number): Promise<{ items: ClaimEquivalenceSignal[] }> => {
  return fetchJson<{ items: ClaimEquivalenceSignal[] }>(`/promise-claims/${id}/equivalence-signals`, { token });
};

export const submitClaimEquivalenceSignal = async (
  token: string,
  id: number,
  input: ClaimEquivalenceSignalInput
): Promise<{ ok: boolean; id: number }> => {
  return fetchJson<{ ok: boolean; id: number }>(`/promise-claims/${id}/equivalence-signals`, {
    method: "POST",
    token,
    body: input
  });
};

export const claimPromiseClaim = async (token: string, id: number, expectedVersion: number): Promise<{ ok: boolean; assigneeId: string; reviewVersion: number }> => {
  return fetchJson<{ ok: boolean; assigneeId: string; reviewVersion: number }>(`/promise-claims/${id}/claim`, {
    method: "POST",
    token,
    body: { expectedVersion }
  });
};

export const releasePromiseClaim = async (token: string, id: number, expectedVersion: number): Promise<{ ok: boolean; reviewVersion: number }> => {
  return fetchJson<{ ok: boolean; reviewVersion: number }>(`/promise-claims/${id}/release`, {
    method: "POST",
    token,
    body: { expectedVersion }
  });
};

export const reviewPromiseClaim = async (token: string, id: number, input: PromiseClaimReviewInput): Promise<{ ok: boolean; status: string; canonicalPromiseId: number | null; reviewVersion: number }> => {
  return fetchJson<{ ok: boolean; status: string; canonicalPromiseId: number | null; reviewVersion: number }>(`/promise-claims/${id}/review`, {
    method: "PATCH",
    token,
    body: input
  });
};

export const listPromiseClaimAudits = async (token: string, id: number): Promise<{ items: PromiseClaimAudit[] }> => {
  return fetchJson<{ items: PromiseClaimAudit[] }>(`/promise-claims/${id}/audits`, { token });
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
  if (filters.priority) {
    params.set("priority", filters.priority);
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

export const getAbuseMetrics = async (token: string): Promise<AbuseMetrics> => {
  return fetchJson<AbuseMetrics>("/abuse/metrics", { token });
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
