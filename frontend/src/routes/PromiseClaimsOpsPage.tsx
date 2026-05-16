/* WHAT IT DO? Provides a moderator claim queue for merge, canonize, and reject decisions on promise-source claims. */

import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { useAuth } from "../context/AuthContext";
import {
  claimPromiseClaim,
  getAbuseMetrics,
  getPromiseClaimMetrics,
  getPromiseClaimById,
  getPromiseClaimDuplicateAssist,
  listCanonicalPromises,
  listClaimEquivalenceSignals,
  listPromiseClaimAudits,
  listPromiseClaims,
  releasePromiseClaim,
  reviewPromiseClaim
} from "../lib/api";
import { formatDateTime } from "../lib/format";
import type { PromiseClaimRecord } from "../types";

const readInt = (value: string | null, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

const withParams = (searchParams: URLSearchParams, updates: Record<string, string | null>): URLSearchParams => {
  const next = new URLSearchParams(searchParams);
  for (const [key, value] of Object.entries(updates)) {
    if (!value) {
      next.delete(key);
    } else {
      next.set(key, value);
    }
  }
  return next;
};

export const PromiseClaimsOpsPage = (): ReactElement => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { session } = useAuth();
  const selectedId = Number(searchParams.get("claimId"));
  const status = (searchParams.get("status") ?? "pending").toLowerCase();
  const assignee = searchParams.get("assignee") ?? "";
  const priority = searchParams.get("priority") ?? "";
  const page = readInt(searchParams.get("page"), 1);
  const [claims, setClaims] = useState<PromiseClaimRecord[]>([]);
  const [queuePage, setQueuePage] = useState<number>(1);
  const [queuePageSize, setQueuePageSize] = useState<number>(20);
  const [queueTotal, setQueueTotal] = useState<number>(0);
  const [metrics, setMetrics] = useState<Awaited<ReturnType<typeof getPromiseClaimMetrics>> | null>(null);
  const [abuseMetrics, setAbuseMetrics] = useState<Awaited<ReturnType<typeof getAbuseMetrics>> | null>(null);
  const [selectedClaim, setSelectedClaim] = useState<PromiseClaimRecord | null>(null);
  const [canonicalOptions, setCanonicalOptions] = useState<Awaited<ReturnType<typeof listCanonicalPromises>>>([]);
  const [assist, setAssist] = useState<Awaited<ReturnType<typeof getPromiseClaimDuplicateAssist>> | null>(null);
  const [signals, setSignals] = useState<Awaited<ReturnType<typeof listClaimEquivalenceSignals>>["items"]>([]);
  const [audits, setAudits] = useState<Awaited<ReturnType<typeof listPromiseClaimAudits>>["items"]>([]);
  const [decision, setDecision] = useState<"merge" | "canonize" | "reject">("merge");
  const [reason, setReason] = useState<string>("");
  const [reasonCode, setReasonCode] = useState<string>("same_promise");
  const [linkedCanonicalPromiseId, setLinkedCanonicalPromiseId] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadClaims = async (): Promise<void> => {
    if (!session) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status && status !== "pending") {
        params.set("status", status);
      }
      if (assignee) {
        params.set("assignee", assignee);
      }
      if (priority === "high_risk" || priority === "trusted") {
        params.set("priority", priority);
      }
      params.set("page", String(page));
      params.set("pageSize", "20");

      const [response, metricsResponse, abuseResponse] = await Promise.all([
        listPromiseClaims(session.token, `?${params.toString()}`),
        getPromiseClaimMetrics(session.token),
        getAbuseMetrics(session.token)
      ]);
      setClaims(response.items);
      setQueuePage(response.page);
      setQueuePageSize(response.pageSize);
      setQueueTotal(response.total);
      setMetrics(metricsResponse);
      setAbuseMetrics(abuseResponse);
    } catch (err) {
      setError((err as Error).message || "Unable to load promise claim queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadClaims();
  }, [assignee, page, priority, session, status]);

  useEffect(() => {
    if (!session || !Number.isFinite(selectedId) || selectedId <= 0) {
      setSelectedClaim(null);
      return;
    }
    let cancelled = false;
    const loadDetail = async (): Promise<void> => {
      try {
        const [claimResponse, assistResponse, signalResponse, auditResponse, canonicalList] = await Promise.all([
          getPromiseClaimById(session.token, selectedId),
          getPromiseClaimDuplicateAssist(session.token, selectedId),
          listClaimEquivalenceSignals(session.token, selectedId),
          listPromiseClaimAudits(session.token, selectedId),
          listCanonicalPromises(undefined, session.token)
        ]);
        if (!cancelled) {
          setSelectedClaim(claimResponse.claim);
          setAssist(assistResponse);
          setSignals(signalResponse.items);
          setAudits(auditResponse.items);
          setCanonicalOptions(canonicalList);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || "Unable to load claim detail.");
        }
      }
    };
    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedId, session]);

  const runRefresh = async (): Promise<void> => {
    await loadClaims();
    if (session && selectedId) {
      const detail = await getPromiseClaimById(session.token, selectedId);
      setSelectedClaim(detail.claim);
      setAssist(await getPromiseClaimDuplicateAssist(session.token, selectedId));
      setSignals((await listClaimEquivalenceSignals(session.token, selectedId)).items);
      setAudits((await listPromiseClaimAudits(session.token, selectedId)).items);
    }
  };

  const onClaim = async (): Promise<void> => {
    if (!session || !selectedClaim) {
      return;
    }
    await claimPromiseClaim(session.token, selectedClaim.id, selectedClaim.reviewVersion);
    await runRefresh();
  };

  const onRelease = async (): Promise<void> => {
    if (!session || !selectedClaim) {
      return;
    }
    await releasePromiseClaim(session.token, selectedClaim.id, selectedClaim.reviewVersion);
    await runRefresh();
  };

  const onReview = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!session || !selectedClaim) {
      return;
    }
    await reviewPromiseClaim(session.token, selectedClaim.id, {
      decision,
      reason: reason || undefined,
      reasonCode: reasonCode || undefined,
      linkedCanonicalPromiseId: decision === "merge" && linkedCanonicalPromiseId ? Number(linkedCanonicalPromiseId) : undefined,
      publicStatus: decision === "canonize" ? "public" : undefined,
      expectedVersion: selectedClaim.reviewVersion
    });
    await runRefresh();
  };

  const canonicalOptionList = useMemo(() => canonicalOptions.map((promise) => ({ id: promise.id, label: promise.promiseText })), [canonicalOptions]);

  if (!session) {
    return <LoadingState label="Restoring moderator session..." />;
  }

  if (loading) {
    return <LoadingState label="Loading promise claim queue..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void loadClaims()} />;
  }

  return (
    <div className="stack-lg">
      <section className="record-hero">
        <div className="record-hero-main">
          <p className="eyebrow">Claim moderation lens</p>
          <h1>Promise claim queue</h1>
          <p className="lede">
            Merge, canonize, or reject contributor promise claims after checking duplicate context, equivalence signals, and source evidence.
          </p>
          <div className="card-link-row">
            <Link to="/ops">Proposal queue</Link>
            <Link to="/ops/records">Editorial records</Link>
            <Link to="/contribute/promises/new">Contributor claim form</Link>
          </div>
        </div>
        <aside className="record-facts" aria-label="Claim moderation context">
          <div>
            <span>Pending backlog</span>
            <strong>{metrics?.pending.total ?? 0}</strong>
          </div>
          <div>
            <span>High risk</span>
            <strong>{metrics?.priority.highRisk ?? 0}</strong>
          </div>
          <div>
            <span>Shared blocks</span>
            <strong>{abuseMetrics?.rateLimit?.login?.blocked ?? 0}</strong>
          </div>
          <div>
            <span>Role</span>
            <strong>{session.role}</strong>
          </div>
        </aside>
      </section>

      {metrics ? (
        <section className="cards-grid cards-grid-3" aria-label="Claim queue metrics">
          <article className="card stack-xs">
            <h2>Pending backlog</h2>
            <p className="score-value">{metrics.pending.total}</p>
            <p className="meta-line">Assigned {metrics.pending.assigned} · Unassigned {metrics.pending.unassigned}</p>
          </article>
          <article className="card stack-xs">
            <h2>Canonized</h2>
            <p className="score-value">{metrics.statuses.canonized}</p>
            <p className="meta-line">Merged {metrics.statuses.merged} · Rejected {metrics.statuses.rejected}</p>
          </article>
          <article className="card stack-xs">
            <h2>Risk and abuse</h2>
            <p className="score-value">{metrics.priority.highRisk}</p>
            <p className="meta-line">
              High-risk pending claims. Shared abuse blocks: login {abuseMetrics?.rateLimit?.login?.blocked ?? 0} · proposal submit {abuseMetrics?.rateLimit?.["politician-proposal"]?.blocked ?? 0} · proposal review {abuseMetrics?.rateLimit?.["proposal-review"]?.blocked ?? 0}
            </p>
          </article>
        </section>
      ) : null}

      <section className="directory-controls stack-sm">
        <div className="controls-grid">
          <label className="field-group" htmlFor="claim-status-filter">
            <span>Status</span>
            <select id="claim-status-filter" className="select-input" value={status} onChange={(event) => setSearchParams(withParams(searchParams, { status: event.target.value === "pending" ? null : event.target.value, page: "1" }))}>
              <option value="pending">Pending</option>
              <option value="merged">Merged</option>
              <option value="canonized">Canonized</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <label className="field-group" htmlFor="claim-assignee-filter">
            <span>Assignee</span>
            <select id="claim-assignee-filter" className="select-input" value={assignee} onChange={(event) => setSearchParams(withParams(searchParams, { assignee: event.target.value || null, page: "1" }))}>
              <option value="">Anyone</option>
              <option value="me">Assigned to me</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </label>
          <label className="field-group" htmlFor="claim-priority-filter">
            <span>Priority</span>
            <select id="claim-priority-filter" className="select-input" value={priority} onChange={(event) => setSearchParams(withParams(searchParams, { priority: event.target.value || null, page: "1" }))}>
              <option value="">All contributors</option>
              <option value="high_risk">High-risk first</option>
              <option value="trusted">Trusted history</option>
            </select>
          </label>
        </div>
        <p className="data-note">Showing {claims.length} claims on page {queuePage}. Filters map directly to the queue API.</p>
      </section>

      <section className="cards-grid cards-grid-1">
        {claims.map((claim) => (
          <article key={claim.id} className="card stack-sm">
            <div className="section-header">
              <div className="stack-xs">
                <h2>{claim.claimText}</h2>
                <p className="meta-line">{claim.sourceUrl}</p>
              </div>
              <button className={selectedClaim?.id === claim.id ? "button button-primary" : "button button-secondary"} type="button" onClick={() => setSearchParams(withParams(searchParams, { claimId: String(claim.id) }))}>
                {selectedClaim?.id === claim.id ? "Selected" : "Open"}
              </button>
            </div>
            <p className="meta-line">Status {claim.status} · Submitted by {claim.submittedBy}</p>
            <p className="meta-line">
              Reputation {claim.submittedByReputation.score} · Risk {claim.submittedByReputation.riskLevel}
              {claim.submittedByReputation.riskFlags.length > 0 ? ` · ${claim.submittedByReputation.riskFlags.join(", ")}` : ""}
            </p>
            {claim.submittedByReputation.riskLevel === "high" ? (
              <p className="meta-line">High-priority review recommended due to contributor history.</p>
            ) : null}
          </article>
        ))}
      </section>

      <div className="card-link-row">
        <button className="button button-secondary" type="button" disabled={queuePage <= 1} onClick={() => setSearchParams(withParams(searchParams, { page: String(Math.max(1, page - 1)) }))}>
          Previous
        </button>
        <button
          className="button button-secondary"
          type="button"
          disabled={queuePage * queuePageSize >= queueTotal}
          onClick={() => setSearchParams(withParams(searchParams, { page: String(page + 1) }))}
        >
          Next
        </button>
      </div>

      {selectedClaim ? (
        <section className="split-grid">
          <article className="card stack-sm">
            <h2>Selected claim #{selectedClaim.id}</h2>
            <p className="meta-line">Source: {selectedClaim.sourceUrl}</p>
            <p className="meta-line">
              Reputation {selectedClaim.submittedByReputation.score} · Risk {selectedClaim.submittedByReputation.riskLevel}
            </p>
            {selectedClaim.submittedByReputation.riskFlags.length > 0 ? (
              <p className="meta-line">Risk flags: {selectedClaim.submittedByReputation.riskFlags.join(", ")}</p>
            ) : (
              <p className="meta-line">No elevated contributor risk flags are currently derived for this claim.</p>
            )}
            {selectedClaim.submittedByReputation.riskLevel === "high" ? (
              <p className="meta-line">Priority review: high-risk contributor history.</p>
            ) : null}
            <div className="card-link-row">
              <button className="button button-secondary" type="button" onClick={() => void onClaim()}>
                Claim
              </button>
              <button className="button button-secondary" type="button" onClick={() => void onRelease()}>
                Release
              </button>
            </div>
            <form className="stack-sm" onSubmit={(event) => void onReview(event)}>
              <label className="field-group" htmlFor="claim-review-decision">
                <span>Decision</span>
                <select id="claim-review-decision" className="select-input" value={decision} onChange={(event) => setDecision(event.target.value as "merge" | "canonize" | "reject")}>
                  <option value="merge">Merge into canonical promise</option>
                  <option value="canonize">Canonize as new promise</option>
                  <option value="reject">Reject</option>
                </select>
              </label>
              {decision === "merge" ? (
                <label className="field-group" htmlFor="claim-review-target">
                  <span>Canonical promise target</span>
                  <select id="claim-review-target" className="select-input" value={linkedCanonicalPromiseId} onChange={(event) => setLinkedCanonicalPromiseId(event.target.value)} required>
                    <option value="">Choose a canonical promise</option>
                    {canonicalOptionList.map((option) => (
                      <option key={option.id} value={String(option.id)}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="field-group" htmlFor="claim-review-reason">
                <span>Reason note</span>
                <textarea id="claim-review-reason" className="text-input" value={reason} onChange={(event) => setReason(event.target.value)} rows={4} />
              </label>
              <label className="field-group" htmlFor="claim-review-reason-code">
                <span>Reason code</span>
                <input id="claim-review-reason-code" className="text-input" type="text" value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} />
              </label>
              <button className="button button-primary" type="submit">
                Apply moderation decision
              </button>
            </form>
          </article>

          <article className="card stack-sm">
            <h2>Equivalence and duplicate assist</h2>
            {assist ? (
              <div className="stack-sm">
                <p className="meta-line">Canonical matches {assist.canonicalMatches.length} · Pending claim matches {assist.pendingClaimMatches.length}</p>
                <p className="meta-line">Signals recorded {signals.length}</p>
              </div>
            ) : (
              <p className="meta-line">No duplicate assist loaded.</p>
            )}
            <h3>Audit history</h3>
            {audits.length === 0 ? (
              <p className="meta-line">No audit rows yet.</p>
            ) : (
              <ul className="timeline-list">
                {audits.map((audit) => (
                  <li key={audit.id} className="timeline-item">
                    <p>{audit.action}</p>
                    <p className="meta-line">{audit.actorId} · {formatDateTime(audit.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </section>
      ) : null}
    </div>
  );
};
