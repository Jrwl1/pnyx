/* WHAT IT DO? Wraps backend fetch calls for auth, politicians, statements, statement detail, and revision history. */

import type {
  AuthTokenRequest,
  AuthTokenResponse,
  Politician,
  PoliticianProposalInput,
  PoliticianProposalRecord,
  RegisterAccountInput,
  RegisteredAccount,
  StatementDetail,
  StatementSubmissionInput,
  StatementSubmissionResult,
  StatementRevision,
  StatementSummary
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

export const getStatementById = async (id: number): Promise<StatementDetail> => {
  return fetchJson<StatementDetail>(`/statements/${id}`);
};

export const getStatementRevisions = async (id: number): Promise<StatementRevision[]> => {
  const response = await fetchJson<{ items: StatementRevision[] }>(`/statements/${id}/revisions`);
  return response.items;
};
