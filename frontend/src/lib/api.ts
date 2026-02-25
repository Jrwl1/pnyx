/* WHAT IT DO? Wraps backend fetch calls for politicians, statements, statement detail, and revision history. */

import type { Politician, StatementDetail, StatementRevision, StatementSummary } from "../types";

const API_BASE = (import.meta.env.VITE_API_BASE ?? "/api").replace(/\/$/, "");

const readErrorMessage = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as { error?: string };
    if (payload?.error) {
      return payload.error;
    }
  } catch {
    // Ignore malformed JSON and fall back to status message.
  }

  return response.statusText || "Request failed";
};

const fetchJson = async <T>(path: string): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(`${response.status} ${message}`);
  }

  return (await response.json()) as T;
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
