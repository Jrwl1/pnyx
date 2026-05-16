/* Promise detail with claim, fulfillment, alignment, evidence, revisions, and confidence blocks. */

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { DiscussionPanel } from "../components/DiscussionPanel";
import { ErrorState, LoadingState } from "../components/PageState";
import { PageMeta } from "../components/PageMeta";
import { PageReadinessPanel } from "../components/PageReadinessPanel";
import { StatusChip } from "../components/StatusChip";
import { useAuth } from "../context/AuthContext";
import { usePublicData } from "../context/PublicDataContext";
import { castStatementVote, getCanonicalPromiseById, getStatementById, getStatementRevisions } from "../lib/api";
import { findPartyShellForPolitician, getPartyAffiliationLabel, getTerritoryLabel, toPromiseRecord } from "../lib/domain";
import { formatDate, formatDateTime, formatIdentityLine } from "../lib/format";
import type { PartyLineStatus, StatementDetail, StatementRevision, VoteValue } from "../types";

const buildSignInRedirectLink = (promiseId: number): string => {
  const params = new URLSearchParams({ redirect: `/promises/${promiseId}` });
  return `/sign-in?${params.toString()}`;
};

const renderPartyLineBadge = (status: PartyLineStatus): ReactElement => {
  if (status === "aligned") {
    return (
      <span className="status-chip" data-status="aligned" aria-label="Party stance comparison: Aligned with party line">
        Aligned with party line
      </span>
    );
  }
  if (status === "broke_party_line") {
    return (
      <span className="status-chip" data-status="contradicted" aria-label="Party stance comparison: Broke party line">
        Broke party line
      </span>
    );
  }
  return <StatusChip status="unknown" prefix="Party stance comparison" />;
};

export const PromiseDetailPage = (): ReactElement => {
  const { id } = useParams();
  const promiseId = Number(id);
  const { session } = useAuth();
  const { politicians, loading: publicDataLoading, error: publicDataError, refresh } = usePublicData();

  const [statement, setStatement] = useState<StatementDetail | null>(null);
  const [revisions, setRevisions] = useState<StatementRevision[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [votePending, setVotePending] = useState<boolean>(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [canonicalDetail, setCanonicalDetail] = useState<Awaited<ReturnType<typeof getCanonicalPromiseById>> | null>(null);

  useEffect(() => {
    if (!Number.isFinite(promiseId)) {
      setError("Invalid promise id.");
      setLoading(false);
      return;
    }

    let isCancelled = false;

    const load = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const [statementPayload, revisionPayload] = await Promise.all([
          getStatementById(promiseId, session?.token),
          getStatementRevisions(promiseId)
        ]);

        if (!isCancelled) {
          setStatement(statementPayload);
          setRevisions(revisionPayload);
          if (statementPayload.canonical) {
            setCanonicalDetail(await getCanonicalPromiseById(statementPayload.canonical.id, session?.token));
          } else {
            setCanonicalDetail(null);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          setError((err as Error).message || "Unable to load promise detail.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [promiseId, session?.token]);

  const onVote = async (value: VoteValue): Promise<void> => {
    if (!session || !statement) {
      return;
    }

    setVotePending(true);
    setVoteError(null);

    try {
      const result = await castStatementVote(session.token, statement.id, value);
      setStatement((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          aggregate: result.aggregate,
          viewerVote: result.viewerVote
        };
      });
    } catch (err) {
      setVoteError((err as Error).message || "Unable to record your vote.");
    } finally {
      setVotePending(false);
    }
  };

  const latestEvidenceDate = useMemo(() => {
    if (!statement) {
      return null;
    }

    const revisionDate = revisions.length > 0 ? revisions[revisions.length - 1].createdAt : null;
    const candidates = [statement.updatedAt, revisionDate, statement.dateSaid].filter(Boolean) as string[];

    if (candidates.length === 0) {
      return null;
    }

    return candidates.reduce((latest, current) => {
      return new Date(current).getTime() > new Date(latest).getTime() ? current : latest;
    });
  }, [revisions, statement]);

  if (loading || publicDataLoading) {
    return (
      <>
        <PageMeta
          title="Loading promise | PNYX"
          description="Browse promise detail, fulfillment, vote alignment, and evidence on PNYX."
          path={`/promises/${promiseId}`}
        />
        <LoadingState label="Loading promise detail..." />
      </>
    );
  }

  if (publicDataError) {
    return (
      <>
        <PageMeta
          title="Promise detail unavailable | PNYX"
          description="Browse promise detail, fulfillment, vote alignment, and evidence on PNYX."
          path={`/promises/${promiseId}`}
        />
        <ErrorState message={publicDataError} onRetry={() => void refresh()} />
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageMeta
          title="Promise detail unavailable | PNYX"
          description="Browse promise detail, fulfillment, vote alignment, and evidence on PNYX."
          path={`/promises/${promiseId}`}
        />
        <ErrorState message={error} />
      </>
    );
  }

  if (!statement) {
    return (
      <>
        <PageMeta
          title="Promise not found | PNYX"
          description="Browse promise detail, fulfillment, vote alignment, and evidence on PNYX."
          path={`/promises/${promiseId}`}
        />
        <ErrorState message="Promise detail not found." />
      </>
    );
  }

  const promiseRecord = toPromiseRecord(statement);
  const trustContext = canonicalDetail?.trustContext;
  const politician = politicians.find((entry) => entry.id === statement.politicianId);
  const linkedPartyShell = findPartyShellForPolitician(politician);
  const partyAffiliationLabel = politician ? getPartyAffiliationLabel(politician) : "Data not yet available";
  const totalSentiment = statement.aggregate.support + statement.aggregate.oppose;
  const sentimentUnits = 20;
  const supportUnits = totalSentiment > 0 ? Math.round((statement.aggregate.support / totalSentiment) * sentimentUnits) : 0;
  const opposeUnits = totalSentiment > 0 ? sentimentUnits - supportUnits : 0;
  const fulfillmentStatus = trustContext?.latestFulfillment?.status ?? promiseRecord.fulfillmentStatus;
  const fulfillmentSummary = trustContext?.latestFulfillment?.summary ?? promiseRecord.fulfillmentSummary;
  const voteAlignmentStatus = trustContext?.voteAlignmentSummary ?? promiseRecord.voteAlignment;
  const latestPartyAlignment = trustContext?.latestPartyAlignment ?? null;
  const latestAssessmentDate = trustContext?.latestFulfillment?.evidenceDate ?? latestEvidenceDate;
  const readinessContributionTarget = `/contribute/promises/new?politicianId=${statement.politicianId}`;

  return (
    <div className="stack-lg">
      <PageMeta
        title={`${promiseRecord.promiseText.slice(0, 70)}${promiseRecord.promiseText.length > 70 ? "..." : ""} | PNYX`}
        description={`Browse promise detail, fulfillment, vote alignment, and evidence for this PNYX record.`}
        path={`/promises/${promiseId}`}
      />
      <section className="record-hero">
        <div className="record-hero-main">
          <nav className="breadcrumbs" aria-label="Breadcrumb">
            <Link className="breadcrumb-link" to="/">
              Home
            </Link>
            <span className="breadcrumb-separator" aria-hidden="true">
              /
            </span>
            <Link className="breadcrumb-link" to="/promises">
              Promises
            </Link>
            {politician ? (
              <>
                <span className="breadcrumb-separator" aria-hidden="true">
                  /
                </span>
                <Link className="breadcrumb-link" to={`/politicians/${politician.id}`}>
                  {politician.name}
                </Link>
              </>
            ) : null}
          </nav>
          <p className="eyebrow">{statement.canonical ? "Reviewed promise record" : "Submitted promise record"}</p>
          <h1>{politician ? `${politician.name}: promise record` : "Promise record"}</h1>
          <p className="lede">Source-backed claim, current assessment state, and missing evidence are kept separate below.</p>
          <p className="meta-line">
            {politician ? (
              <>
                <Link to={`/politicians/${politician.id}`}>{politician.name}</Link>
                {" · "}
                {formatIdentityLine(politician.office, getTerritoryLabel(politician))}
              </>
            ) : (
              <>Linked politician record not available</>
            )}
          </p>
          <p className="meta-line">
            Party:{" "}
            {linkedPartyShell ? (
              <Link className="party-badge" to={`/parties/${linkedPartyShell.party.id}`}>
                {partyAffiliationLabel}
              </Link>
            ) : (
              partyAffiliationLabel
            )}
          </p>
          <div className="card-link-row">
            <Link className="button button-link" to={politician ? `/politicians/${politician.id}` : "/politicians"}>
              {politician ? "Back to person record" : "Back to directory"}
            </Link>
            <Link className="button button-secondary" to={`/contribute/promises/new?politicianId=${statement.politicianId}`}>
              Submit source claim
            </Link>
          </div>
        </div>

        <aside className="record-facts" aria-label="Promise record summary">
          <div>
            <span>Date</span>
            <strong>{formatDate(statement.dateSaid)}</strong>
          </div>
          <div>
            <span>Sources</span>
            <strong>{statement.canonical?.acceptedSourceCount ?? promiseRecord.evidenceCount}</strong>
          </div>
          <div>
            <span>Fulfillment</span>
            <strong>{fulfillmentStatus === "unknown" ? "Not assessed" : fulfillmentStatus}</strong>
          </div>
          <div>
            <span>Vote comparison</span>
            <strong>{voteAlignmentStatus === "unknown" ? "Missing" : voteAlignmentStatus}</strong>
          </div>
        </aside>
      </section>

      {canonicalDetail?.promise.readiness ? (
        <PageReadinessPanel readiness={canonicalDetail.promise.readiness} contributionHref={readinessContributionTarget} />
      ) : null}

      <section className="card stack-sm claim-block" aria-label="Promise claim">
        <h2>{statement.canonical ? "Canonical promise framing" : "Promise claim"}</h2>
        <p className="claim-quote">{statement.body}</p>
        <p className="meta-line">Date promised: {formatDate(statement.dateSaid)}</p>
        <p>
          Source: <a href={statement.sourceUrl}>{statement.sourceUrl}</a>
        </p>
        {statement.canonical ? (
          <p className="meta-line">Accepted sources in bundle: {statement.canonical.acceptedSourceCount}</p>
        ) : null}
      </section>

      <section className="split-grid">
        <article className="card stack-xs" aria-label="Fulfillment verdict">
          <h2>Fulfillment verdict</h2>
          <StatusChip status={fulfillmentStatus} prefix="Fulfillment verdict" />
          <p>{fulfillmentSummary}</p>
          <p className="meta-line">Latest evidence date: {formatDateTime(latestAssessmentDate)}</p>
        </article>

        <article className="card stack-xs" aria-label="Vote alignment">
          <h2>Vote alignment</h2>
          <StatusChip status={voteAlignmentStatus} prefix="Vote alignment" />
          {trustContext && trustContext.voteComparisons.length > 0 ? (
            <ul className="timeline-list">
              {trustContext.voteComparisons.map((comparison) => (
                <li key={comparison.linkId} className="timeline-item">
                  <p>{comparison.eventTitle}</p>
                  <p className="meta-line">
                    {formatDate(comparison.eventDate)} · aligned vote should be {comparison.alignedVoteValue}
                  </p>
                  <p className="meta-line">
                    Politician vote: {comparison.politicianVoteValue ?? "Not recorded"} · result {comparison.alignmentStatus}
                  </p>
                  <p className="meta-line">
                    Source: <a href={comparison.eventSourceUrl}>{comparison.eventSourceUrl}</a>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No mapped vote comparison is available for this promise yet.</p>
          )}
        </article>
      </section>

      <section className="card stack-sm" aria-label="Party stance comparison">
        <h2>Party stance comparison</h2>
        <p>
          Linked party:{" "}
          {linkedPartyShell ? <Link to={`/parties/${linkedPartyShell.party.id}`}>{partyAffiliationLabel}</Link> : partyAffiliationLabel}
        </p>
        {latestPartyAlignment ? (
          <>
            {renderPartyLineBadge(latestPartyAlignment.status)}
            <p>{latestPartyAlignment.stanceText}</p>
            <p className="meta-line">
              {latestPartyAlignment.issue ?? "General policy position"} · {formatDate(latestPartyAlignment.dateSaid)}
            </p>
            <p className="meta-line">
              Source: <a href={latestPartyAlignment.sourceUrl}>{latestPartyAlignment.sourceUrl}</a>
            </p>
            <p className="meta-line">Reason: {latestPartyAlignment.reason ?? "Not provided"}</p>
          </>
        ) : (
          <>
            <StatusChip status="unknown" prefix="Party stance comparison" />
            <p>No party stance is recorded for this promise yet.</p>
            <p className="meta-line">Read methodology for how party stances and politician promises are compared.</p>
          </>
        )}
      </section>

      <section className="question-panel" aria-label="Evidence list">
        <div className="section-header">
          <h2>Source evidence</h2>
          <p className="data-note">Accepted sources are listed separately from community sentiment and discussion.</p>
        </div>
        <div className="record-list">
          {statement.acceptedSources.length > 0 ? (
            statement.acceptedSources.map((source) => (
              <article key={source.id} className="record-row">
                <div className="record-row-main">
                  <h3>
                    <a href={source.sourceUrl}>{source.sourceNote || "Accepted source"}</a>
                  </h3>
                  <p className="meta-line">{source.sourceUrl}</p>
                </div>
                <div className="record-row-side">
                  <span>Accepted</span>
                  <span>Evidence bundle</span>
                </div>
              </article>
            ))
          ) : (
            <article className="record-row">
              <div className="record-row-main">
                <h3>
                  <a href={statement.sourceUrl}>Original statement source</a>
                </h3>
                <p className="meta-line">{statement.sourceUrl}</p>
              </div>
              <div className="record-row-side">
                <span>Submitted</span>
                <span>Awaiting accepted bundle</span>
              </div>
            </article>
          )}
        </div>
      </section>

      <section className="card stack-sm" aria-label="Revision and audit history">
        <details>
          <summary>Revision and audit history</summary>
          {revisions.length === 0 ? (
            <p className="meta-line">No revision records yet.</p>
          ) : (
            <ul className="timeline-list">
              {revisions.map((revision) => (
                <li key={revision.id} className="timeline-item">
                  <p className="mono-inline">{formatDateTime(revision.createdAt)}</p>
                  <p>
                    {revision.changeType} by {revision.actorId}
                  </p>
                  <p className="meta-line">Reason: {revision.reason ?? "Not provided"}</p>
                </li>
              ))}
            </ul>
          )}
        </details>
      </section>

      {canonicalDetail?.history && canonicalDetail.history.length > 0 ? (
        <section className="card stack-sm" aria-label="Canonical change history">
          <h2>Canonical change history</h2>
          <ul className="timeline-list">
            {canonicalDetail.history.map((entry) => (
              <li key={entry.id} className="timeline-item">
                <p>{entry.action} by {entry.actorId}</p>
                <p className="meta-line">{entry.claimText}</p>
                <p className="meta-line">Source: {entry.sourceUrl}</p>
                <p className="meta-line">Reason: {entry.reason ?? "Not provided"}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card stack-sm sentiment-card" aria-label="Community confidence">
        <h2>Community confidence</h2>
        <div className="sentiment-track" aria-hidden="true">
          {totalSentiment === 0 ? <span className="sentiment-segment sentiment-segment-empty" /> : null}
          {Array.from({ length: supportUnits }, (_, index) => (
            <span key={`support-${index}`} className="sentiment-segment sentiment-fill-support" />
          ))}
          {Array.from({ length: opposeUnits }, (_, index) => (
            <span key={`oppose-${index}`} className="sentiment-segment sentiment-fill-oppose" />
          ))}
        </div>
        <div className="sentiment-metrics" aria-label="Community sentiment totals">
          <p>
            <span className="sentiment-key sentiment-key-support" aria-hidden="true" />
            Support <strong>{statement.aggregate.support}</strong>
          </p>
          <p>
            <span className="sentiment-key sentiment-key-oppose" aria-hidden="true" />
            Oppose <strong>{statement.aggregate.oppose}</strong>
          </p>
        </div>
        <p className="data-note">
          Community confidence reflects user sentiment. It is separate from vote alignment and separate from any party stance comparison.
        </p>
        <div className="card-link-row">
          {session ? (
            <>
              <button
                className={statement.viewerVote === "support" ? "button button-primary" : "button button-secondary"}
                type="button"
                disabled={votePending}
                onClick={() => void onVote("support")}
              >
                Support
              </button>
              <button
                className={statement.viewerVote === "oppose" ? "button button-primary" : "button button-secondary"}
                type="button"
                disabled={votePending}
                onClick={() => void onVote("oppose")}
              >
                Oppose
              </button>
            </>
          ) : (
            <Link className="button button-secondary" to={buildSignInRedirectLink(promiseId)}>
              Sign in to vote
            </Link>
          )}
        </div>
        {session ? (
          <p className="meta-line">
            {statement.viewerVote ? `Your current vote: ${statement.viewerVote}.` : "You have not voted on this promise yet."}
          </p>
        ) : null}
        {votePending ? <p className="meta-line">Saving your vote...</p> : null}
        {voteError ? (
          <p className="meta-line" role="alert">
            {voteError}
          </p>
        ) : null}
      </section>

      {statement.canonical ? (
        <DiscussionPanel
          entityKind="canonical_promise"
          entityId={statement.canonical.id}
          currentPath={`/promises/${promiseId}`}
          session={session}
        />
      ) : null}
    </div>
  );
};
