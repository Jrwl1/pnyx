/* WHAT IT DO? Provides a moderator-only proposal queue with filters, metrics, and claim/review tooling. */

import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { useAuth } from "../context/AuthContext";
import {
  claimPoliticianProposal,
  grantUserRole,
  getPoliticianProposalDuplicateAssist,
  getPoliticianProposalMetrics,
  listPoliticianProposals,
  releasePoliticianProposal,
  reviewPoliticianProposal
} from "../lib/api";
import { formatDateTime, formatIdentityLine } from "../lib/format";
import type { ProposalAgeBucket, ProposalDuplicateAssist, ProposalQueueMetrics, ProposalQueueResponse, ProposalStatus } from "../types";

const rejectCodes = ["insufficient_evidence", "invalid_identity", "not_public_figure", "out_of_scope"] as const;
const duplicateCodes = ["duplicate_canonical", "duplicate_pending", "already_tracked"] as const;

const readStatus = (value: string | null): ProposalStatus | "all" => {
  return value === "approved" || value === "rejected" || value === "duplicate" || value === "pending" ? value : "pending";
};

const readAgeBucket = (value: string | null): ProposalAgeBucket | "" => {
  return value === "lt1h" || value === "1to24h" || value === "gt24h" ? value : "";
};

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

const describeCandidate = (candidate: { office: string | null; region: string | null; matchOn?: string[]; score?: number }): string => {
  const identity = formatIdentityLine(candidate.office, candidate.region);
  const matchOn = candidate.matchOn?.length ? ` | Match ${candidate.matchOn.join(", ")}` : "";
  const score = candidate.score != null ? ` | Score ${candidate.score}` : "";
  return `${identity}${matchOn}${score}`;
};

export const OpsPage = (): ReactElement => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { session } = useAuth();
  const status = readStatus(searchParams.get("status"));
  const assignee = searchParams.get("assignee") ?? "";
  const ageBucket = readAgeBucket(searchParams.get("ageBucket"));
  const sort = searchParams.get("sort") === "asc" ? "asc" : "desc";
  const page = readInt(searchParams.get("page"), 1);
  const selectedId = readInt(searchParams.get("proposalId"), 0);

  const [queue, setQueue] = useState<ProposalQueueResponse | null>(null);
  const [metrics, setMetrics] = useState<ProposalQueueMetrics | null>(null);
  const [duplicateAssist, setDuplicateAssist] = useState<ProposalDuplicateAssist | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<boolean>(false);
  const [decision, setDecision] = useState<"approve" | "reject" | "duplicate">("approve");
  const [reason, setReason] = useState<string>("");
  const [reasonCode, setReasonCode] = useState<string>("");
  const [linkedPoliticianId, setLinkedPoliticianId] = useState<string>("");
  const [grantEmail, setGrantEmail] = useState<string>("");
  const [grantRole, setGrantRole] = useState<"user" | "moderator" | "admin">("moderator");
  const [grantPending, setGrantPending] = useState<boolean>(false);
  const [grantMessage, setGrantMessage] = useState<string | null>(null);
  const [grantError, setGrantError] = useState<string | null>(null);

  const loadQueue = async (): Promise<void> => {
    if (!session) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [queueResponse, metricsResponse] = await Promise.all([
        listPoliticianProposals(session.token, {
          status,
          assignee: assignee || undefined,
          ageBucket: ageBucket || undefined,
          sort,
          page,
          pageSize: 20
        }),
        getPoliticianProposalMetrics(session.token)
      ]);
      setQueue(queueResponse);
      setMetrics(metricsResponse);
    } catch (err) {
      setError((err as Error).message || "Unable to load moderation queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadQueue();
  }, [ageBucket, assignee, page, session, sort, status]);

  const selectedProposal = useMemo(() => queue?.items.find((item) => item.id === selectedId) ?? null, [queue, selectedId]);

  useEffect(() => {
    if (!queue) {
      return;
    }

    if (queue.items.length === 0 && searchParams.get("proposalId")) {
      setSearchParams(withParams(searchParams, { proposalId: null }), { replace: true });
      return;
    }

    if (queue.items.length > 0 && !queue.items.some((item) => item.id === selectedId)) {
      setSearchParams(withParams(searchParams, { proposalId: String(queue.items[0].id) }), { replace: true });
    }
  }, [queue, searchParams, selectedId, setSearchParams]);

  useEffect(() => {
    setDecision("approve");
    setReason("");
    setReasonCode("");
    setLinkedPoliticianId("");
    setActionError(null);
    setActionMessage(null);
  }, [selectedId]);

  useEffect(() => {
    if (!session || !selectedProposal) {
      setDuplicateAssist(null);
      return;
    }

    if (selectedProposal.status !== "pending") {
      setDuplicateAssist(null);
      return;
    }

    let isCancelled = false;
    const loadDetail = async (): Promise<void> => {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const assist = await getPoliticianProposalDuplicateAssist(session.token, selectedProposal.id);
        if (!isCancelled) {
          setDuplicateAssist(assist);
        }
      } catch (err) {
        if (!isCancelled) {
          setDetailError((err as Error).message || "Unable to load duplicate assist.");
        }
      } finally {
        if (!isCancelled) {
          setDetailLoading(false);
        }
      }
    };

    void loadDetail();
    return () => {
      isCancelled = true;
    };
  }, [selectedProposal, session]);

  const duplicateOptions = useMemo(() => {
    if (!duplicateAssist) {
      return [];
    }
    const seen = new Map<number, string>();
    for (const candidate of duplicateAssist.canonicalMatches) {
      seen.set(candidate.id, `${candidate.name} | Exact ${describeCandidate(candidate)}`);
    }
    for (const candidate of duplicateAssist.fuzzyHints.canonical) {
      if (!seen.has(candidate.id)) {
        seen.set(candidate.id, `${candidate.name} | Fuzzy ${describeCandidate(candidate)}`);
      }
    }
    return [...seen.entries()].map(([id, label]) => ({ id, label }));
  }, [duplicateAssist]);

  const canClaim = Boolean(selectedProposal && selectedProposal.status === "pending" && (!selectedProposal.assigneeId || selectedProposal.assigneeId === session?.userId));
  const canRelease = Boolean(selectedProposal && selectedProposal.status === "pending" && selectedProposal.assigneeId && (selectedProposal.assigneeId === session?.userId || session?.role === "admin"));
  const canReview = Boolean(selectedProposal && selectedProposal.status === "pending" && (!selectedProposal.assigneeId || selectedProposal.assigneeId === session?.userId || session?.role === "admin"));

  const setFilter = (key: string, value: string | null): void => {
    setSearchParams(withParams(searchParams, { [key]: value, page: "1" }));
  };

  const runAction = async (operation: () => Promise<void>, successMessage: string): Promise<void> => {
    setActionPending(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await operation();
      setActionMessage(successMessage);
      await loadQueue();
    } catch (err) {
      setActionError((err as Error).message || "Unable to complete moderator action.");
    } finally {
      setActionPending(false);
    }
  };

  const onClaim = async (): Promise<void> => {
    if (!session || !selectedProposal) {
      return;
    }
    await runAction(async () => {
      await claimPoliticianProposal(session.token, selectedProposal.id, selectedProposal.reviewVersion);
    }, `Claimed proposal #${selectedProposal.id}.`);
  };

  const onRelease = async (): Promise<void> => {
    if (!session || !selectedProposal) {
      return;
    }
    await runAction(async () => {
      await releasePoliticianProposal(session.token, selectedProposal.id, selectedProposal.reviewVersion);
    }, `Released proposal #${selectedProposal.id}.`);
  };

  const onReviewSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!session || !selectedProposal) {
      return;
    }
    await runAction(async () => {
      await reviewPoliticianProposal(session.token, selectedProposal.id, {
        decision,
        reason: reason.trim() || undefined,
        reasonCode: reasonCode || undefined,
        linkedPoliticianId: decision === "duplicate" && linkedPoliticianId ? Number(linkedPoliticianId) : undefined,
        expectedVersion: selectedProposal.reviewVersion
      });
    }, `Applied ${decision} decision to proposal #${selectedProposal.id}.`);
  };

  const onGrantRole = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!session || session.role !== "admin") {
      return;
    }

    setGrantPending(true);
    setGrantError(null);
    setGrantMessage(null);
    try {
      const response = await grantUserRole(session.token, {
        email: grantEmail,
        role: grantRole
      });
      setGrantMessage(`Updated ${response.email} to ${response.role}.`);
      setGrantEmail("");
    } catch (err) {
      setGrantError((err as Error).message || "Unable to update user role.");
    } finally {
      setGrantPending(false);
    }
  };

  if (!session) {
    return <LoadingState label="Restoring moderator session..." />;
  }

  if (loading && !queue) {
    return <LoadingState label="Loading moderation queue..." />;
  }

  if (error && !queue) {
    return <ErrorState message={error} onRetry={() => void loadQueue()} />;
  }

  return (
    <div className="stack-lg">
      <section className="hero-panel stack-sm">
        <p className="eyebrow">Moderation</p>
        <h1>Politician proposal queue</h1>
        <p className="lede">Filter the queue, claim work, review pending items, and use duplicate assist before recording a moderation decision.</p>
        <div className="card-link-row">
          <Link to="/ops/records">Open editorial record ops</Link>
          <Link to="/ops/claims">Open promise claim queue</Link>
        </div>
      </section>

      {metrics ? (
        <section className="cards-grid cards-grid-3" aria-label="Queue metrics">
          <article className="card stack-xs">
            <h2>Pending backlog</h2>
            <p className="score-value">{metrics.pending.total}</p>
            <p className="meta-line">Assigned {metrics.pending.assigned} | Unassigned {metrics.pending.unassigned}</p>
          </article>
          <article className="card stack-xs">
            <h2>Fresh</h2>
            <p className="score-value">{metrics.ageBuckets.lt1h}</p>
            <p className="meta-line">Less than 1 hour old</p>
          </article>
          <article className="card stack-xs">
            <h2>Stale</h2>
            <p className="score-value">{metrics.ageBuckets.gt24h}</p>
            <p className="meta-line">More than 24 hours old</p>
          </article>
        </section>
      ) : null}

      {session.role === "admin" ? (
        <section className="card stack-sm" aria-label="Role provisioning">
          <h2>Role provisioning</h2>
          <p className="meta-line">Grant moderator or admin access outside the public sign-in flow by updating the stored role on a registered email identity.</p>
          <form className="stack-sm" onSubmit={(event) => void onGrantRole(event)}>
            <div className="controls-grid">
              <label className="field-group" htmlFor="role-grant-email">
                <span>Email</span>
                <input
                  id="role-grant-email"
                  className="text-input"
                  type="email"
                  value={grantEmail}
                  onChange={(event) => setGrantEmail(event.target.value)}
                  placeholder="moderator@example.fi"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="field-group" htmlFor="role-grant-role">
                <span>Role</span>
                <select
                  id="role-grant-role"
                  className="select-input"
                  value={grantRole}
                  onChange={(event) => setGrantRole(event.target.value as "user" | "moderator" | "admin")}
                >
                  <option value="user">user</option>
                  <option value="moderator">moderator</option>
                  <option value="admin">admin</option>
                </select>
              </label>
            </div>
            {grantMessage ? <p className="meta-line">{grantMessage}</p> : null}
            {grantError ? (
              <p className="meta-line" role="alert">
                {grantError}
              </p>
            ) : null}
            <button className="button button-secondary" type="submit" disabled={grantPending}>
              {grantPending ? "Saving..." : "Apply role"}
            </button>
          </form>
        </section>
      ) : null}

      <section className="directory-controls stack-sm" aria-label="Queue filters">
        <div className="controls-grid">
          <label className="field-group" htmlFor="ops-status">
            <span>Status</span>
            <select id="ops-status" className="select-input" value={status} onChange={(event) => setFilter("status", event.target.value === "pending" ? null : event.target.value)}>
              <option value="pending">Pending</option>
              <option value="all">All statuses</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="duplicate">Duplicate</option>
            </select>
          </label>
          <label className="field-group" htmlFor="ops-assignee">
            <span>Assignee</span>
            <select id="ops-assignee" className="select-input" value={assignee} onChange={(event) => setFilter("assignee", event.target.value || null)}>
              <option value="">Anyone</option>
              <option value="me">Assigned to me</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </label>
          <label className="field-group" htmlFor="ops-age">
            <span>Age bucket</span>
            <select id="ops-age" className="select-input" value={ageBucket} onChange={(event) => setFilter("ageBucket", event.target.value || null)}>
              <option value="">Any age</option>
              <option value="lt1h">Less than 1 hour</option>
              <option value="1to24h">1 to 24 hours</option>
              <option value="gt24h">More than 24 hours</option>
            </select>
          </label>
          <label className="field-group" htmlFor="ops-sort">
            <span>Sort</span>
            <select id="ops-sort" className="select-input" value={sort} onChange={(event) => setFilter("sort", event.target.value)}>
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </label>
        </div>
        <p className="data-note">Signed in as {session.userId} ({session.role}). Filters map directly to the queue API.</p>
        {error ? <p className="meta-line">{error}</p> : null}
      </section>

      <section className="stack-sm">
        <div className="section-header">
          <div className="stack-xs">
            <h2>Queue listing</h2>
            <p className="meta-line">Showing {queue?.items.length ?? 0} proposals on page {queue?.page ?? page}.</p>
          </div>
          <div className="card-link-row">
            <button className="button button-secondary" type="button" disabled={!queue || queue.page <= 1} onClick={() => setSearchParams(withParams(searchParams, { page: String(Math.max(1, page - 1)) }))}>
              Previous
            </button>
            <button className="button button-secondary" type="button" disabled={!queue || queue.page * queue.pageSize >= queue.total} onClick={() => setSearchParams(withParams(searchParams, { page: String(page + 1) }))}>
              Next
            </button>
          </div>
        </div>
        {!queue || queue.items.length === 0 ? (
          <article className="card stack-sm">
            <h3>No proposals match the current filters</h3>
            <p>Change the queue filters to inspect a different part of the moderation backlog.</p>
          </article>
        ) : (
          <div className="cards-grid cards-grid-1">
            {queue.items.map((item) => (
              <article key={item.id} className="card stack-sm">
                <div className="section-header">
                  <div className="stack-xs">
                    <h3>{item.name}</h3>
                    <p className="meta-line">{formatIdentityLine(item.office, item.region)}</p>
                  </div>
                  <button className={selectedProposal?.id === item.id ? "button button-primary" : "button button-secondary"} type="button" onClick={() => setSearchParams(withParams(searchParams, { proposalId: String(item.id) }))}>
                    {selectedProposal?.id === item.id ? "Selected" : "Open"}
                  </button>
                </div>
                <div className="stat-strip">
                  <span className="stat-pill">Status {item.status}</span>
                  <span className="stat-pill">Submitted by {item.submittedBy}</span>
                  <span className="stat-pill">Assignee {item.assigneeId ?? "Unassigned"}</span>
                  <span className="stat-pill">Version {item.reviewVersion}</span>
                </div>
                <p className="meta-line">Created {formatDateTime(item.createdAt)}</p>
                {item.sourceNote ? <p>Source note: {item.sourceNote}</p> : null}
              </article>
            ))}
          </div>
        )}
      </section>

      {selectedProposal ? (
        <section className="split-grid">
          <article className="card stack-sm">
            <div className="section-header">
              <div className="stack-xs">
                <h2>Selected proposal #{selectedProposal.id}</h2>
                <p className="meta-line">{selectedProposal.name} | {formatIdentityLine(selectedProposal.office, selectedProposal.region)}</p>
              </div>
              <div className="card-link-row">
                <button className="button button-secondary" type="button" disabled={!canClaim || actionPending} onClick={() => void onClaim()}>
                  Claim
                </button>
                <button className="button button-secondary" type="button" disabled={!canRelease || actionPending} onClick={() => void onRelease()}>
                  Release
                </button>
              </div>
            </div>
            <p className="meta-line">Submitted by {selectedProposal.submittedBy} | Assignee {selectedProposal.assigneeId ?? "Unassigned"} | Created {formatDateTime(selectedProposal.createdAt)}</p>
            {selectedProposal.assigneeId && selectedProposal.assigneeId !== session.userId && session.role !== "admin" ? (
              <p className="meta-line">Another moderator currently holds this claim, so review actions are disabled for your session.</p>
            ) : null}
            {actionMessage ? <p className="meta-line">{actionMessage}</p> : null}
            {actionError ? <p className="meta-line" role="alert">{actionError}</p> : null}
            {selectedProposal.status !== "pending" ? (
              <p className="meta-line">This proposal is no longer pending. Review actions are hidden, but the queue metadata stays visible.</p>
            ) : (
              <form className="stack-sm" onSubmit={(event) => void onReviewSubmit(event)}>
                <label className="field-group" htmlFor="ops-decision">
                  <span>Decision</span>
                  <select id="ops-decision" className="select-input" value={decision} onChange={(event) => setDecision(event.target.value as "approve" | "reject" | "duplicate")} disabled={!canReview || actionPending}>
                    <option value="approve">Approve</option>
                    <option value="reject">Reject</option>
                    <option value="duplicate">Mark duplicate</option>
                  </select>
                </label>
                {decision === "reject" ? (
                  <label className="field-group" htmlFor="ops-reject-code">
                    <span>Reject reason code</span>
                    <select id="ops-reject-code" className="select-input" value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} disabled={!canReview || actionPending} required>
                      <option value="">Choose a code</option>
                      {rejectCodes.map((code) => <option key={code} value={code}>{code}</option>)}
                    </select>
                  </label>
                ) : null}
                {decision === "duplicate" ? (
                  <>
                    <label className="field-group" htmlFor="ops-duplicate-code">
                      <span>Duplicate reason code</span>
                      <select id="ops-duplicate-code" className="select-input" value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} disabled={!canReview || actionPending} required>
                        <option value="">Choose a code</option>
                        {duplicateCodes.map((code) => <option key={code} value={code}>{code}</option>)}
                      </select>
                    </label>
                    <label className="field-group" htmlFor="ops-linked">
                      <span>Linked canonical politician</span>
                      <select id="ops-linked" className="select-input" value={linkedPoliticianId} onChange={(event) => setLinkedPoliticianId(event.target.value)} disabled={!canReview || actionPending}>
                        <option value="">No link</option>
                        {duplicateOptions.map((option) => <option key={option.id} value={String(option.id)}>{option.label}</option>)}
                      </select>
                    </label>
                  </>
                ) : null}
                <label className="field-group" htmlFor="ops-reason">
                  <span>Reason note</span>
                  <textarea id="ops-reason" className="text-input" value={reason} onChange={(event) => setReason(event.target.value)} rows={4} style={{ minHeight: "132px", padding: "12px" }} disabled={!canReview || actionPending} />
                </label>
                <button className="button button-primary" type="submit" disabled={!canReview || actionPending}>
                  {actionPending ? "Saving..." : "Apply decision"}
                </button>
              </form>
            )}
          </article>

          <article className="card stack-sm">
            <h2>Duplicate assist</h2>
            {detailLoading ? <p className="meta-line">Loading duplicate assist...</p> : null}
            {detailError ? <p className="meta-line" role="alert">{detailError}</p> : null}
            {selectedProposal.status !== "pending" ? (
              <p className="meta-line">Duplicate assist is only shown for pending proposals.</p>
            ) : duplicateAssist ? (
              <div className="stack-sm">
                <div>
                  <h3>Exact canonical matches</h3>
                  {duplicateAssist.canonicalMatches.length === 0 ? <p className="meta-line">No exact canonical matches.</p> : <ul className="timeline-list">{duplicateAssist.canonicalMatches.map((candidate) => <li key={`canonical-${candidate.id}`} className="timeline-item"><p>{candidate.name}</p><p className="meta-line">{describeCandidate(candidate)}</p></li>)}</ul>}
                </div>
                <div>
                  <h3>Pending proposal matches</h3>
                  {duplicateAssist.pendingProposalMatches.length === 0 ? <p className="meta-line">No exact pending matches.</p> : <ul className="timeline-list">{duplicateAssist.pendingProposalMatches.map((candidate) => <li key={`pending-${candidate.id}`} className="timeline-item"><p>{candidate.name}</p><p className="meta-line">{describeCandidate(candidate)}</p></li>)}</ul>}
                </div>
                <div>
                  <h3>Fuzzy canonical hints</h3>
                  {duplicateAssist.fuzzyHints.canonical.length === 0 ? <p className="meta-line">No fuzzy canonical hints above the current threshold.</p> : <ul className="timeline-list">{duplicateAssist.fuzzyHints.canonical.map((candidate) => <li key={`fuzzy-${candidate.id}`} className="timeline-item"><p>{candidate.name}</p><p className="meta-line">{describeCandidate(candidate)}</p></li>)}</ul>}
                </div>
              </div>
            ) : (
              <p className="meta-line">No duplicate assist data loaded yet.</p>
            )}
          </article>
        </section>
      ) : null}

      <section className="card stack-sm">
        <h2>Operator notes</h2>
        <ul className="placeholder-list">
          <li>Claim and review actions use the queue API review version to avoid stale writes.</li>
          <li>Duplicate assist remains assistive only until a moderator applies a decision.</li>
          <li>The selected proposal ID lives in the query string so queue state can be reloaded directly.</li>
        </ul>
        <Link className="button button-link" to="/">Return to public site</Link>
      </section>
    </div>
  );
};
