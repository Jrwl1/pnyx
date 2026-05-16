/* Politician profile with scorecards, required tabs, and promise-level accountability fields. */

import { useEffect, useMemo, useState, type KeyboardEvent, type ReactElement } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { DiscussionPanel } from "../components/DiscussionPanel";
import { ErrorState, LoadingState } from "../components/PageState";
import { PageMeta } from "../components/PageMeta";
import { PageReadinessPanel } from "../components/PageReadinessPanel";
import { StatusChip } from "../components/StatusChip";
import { useAuth } from "../context/AuthContext";
import { usePublicData } from "../context/PublicDataContext";
import { getPoliticianTrustSummary } from "../lib/api";
import { findPartyShellForPolitician, getPartyAffiliationLabel, getTerritoryLabel } from "../lib/domain";
import { formatDate, formatDateTime, formatIdentityLine } from "../lib/format";
import type { PartyLineStatus, PoliticianTrustSummary as PoliticianTrustSummaryType } from "../types";

type ProfileTab = "promises" | "votes" | "evidence";

const PROFILE_TABS: ProfileTab[] = ["promises", "votes", "evidence"];
const PROFILE_TAB_LABELS: Record<ProfileTab, string> = {
  promises: "Promises",
  votes: "Voting record vs promises",
  evidence: "Evidence timeline"
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
  pending: "Pending review",
  verified: "Verified",
  disputed: "Disputed",
  rejected: "Rejected"
};

const formatReviewStatus = (value: string): string => {
  return REVIEW_STATUS_LABELS[value.toLowerCase()] ?? value.replace(/_/g, " ");
};

const buildSignInRedirectLink = (target: string): string => {
  const params = new URLSearchParams({ redirect: target });
  return `/sign-in?${params.toString()}`;
};

const formatPercent = (value: number | null | undefined): string => {
  return value == null ? "Unknown" : `${value}%`;
};

const getTabPanelId = (tab: ProfileTab): string => `profile-panel-${tab}`;

const getTabId = (tab: ProfileTab): string => `profile-tab-${tab}`;

const renderPartyLineBadge = (status: PartyLineStatus): ReactElement => {
  if (status === "aligned") {
    return (
      <span className="status-chip" data-status="aligned" aria-label="Party line: Aligned with party line">
        Aligned with party line
      </span>
    );
  }
  if (status === "broke_party_line") {
    return (
      <span className="status-chip" data-status="contradicted" aria-label="Party line: Broke party line">
        Broke party line
      </span>
    );
  }
  return <StatusChip status="unknown" prefix="Party line" />;
};

export const PoliticianProfilePage = (): ReactElement => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { session } = useAuth();
  const { politicians, statements, loading, error, refresh } = usePublicData();
  const [trustSummary, setTrustSummary] = useState<PoliticianTrustSummaryType | null>(null);
  const [trustLoading, setTrustLoading] = useState<boolean>(true);
  const [trustError, setTrustError] = useState<string | null>(null);

  const politicianId = Number(id);
  const selectedTab = (searchParams.get("tab") as ProfileTab) ?? "promises";
  const activeTab: ProfileTab = PROFILE_TABS.includes(selectedTab) ? selectedTab : "promises";

  useEffect(() => {
    if (!Number.isFinite(politicianId)) {
      setTrustLoading(false);
      return;
    }

    let cancelled = false;
    const loadTrustSummary = async (): Promise<void> => {
      setTrustLoading(true);
      setTrustError(null);
      try {
        const response = await getPoliticianTrustSummary(politicianId, session?.token);
        if (!cancelled) {
          setTrustSummary(response.trustSummary);
        }
      } catch (err) {
        if (!cancelled) {
          setTrustError((err as Error).message || "Unable to load trust summary.");
        }
      } finally {
        if (!cancelled) {
          setTrustLoading(false);
        }
      }
    };

    void loadTrustSummary();

    return () => {
      cancelled = true;
    };
  }, [politicianId, session?.token]);

  const politician = useMemo(() => politicians.find((entry) => entry.id === politicianId), [politicianId, politicians]);
  const linkedPartyShell = useMemo(() => findPartyShellForPolitician(politician), [politician]);
  const rawSubmissionHistory = useMemo(() => {
    return statements.filter((statement) => statement.politicianId === politicianId && !statement.canonicalPromiseId);
  }, [politicianId, statements]);

  const totalPromises = trustSummary?.fulfillmentCounts.total ?? 0;
  const unknownCount = trustSummary?.fulfillmentCounts.unknown ?? 0;
  const statementContributionTarget = session
    ? `/contribute/statements/new?politicianId=${politicianId}`
    : buildSignInRedirectLink(`/contribute/statements/new?politicianId=${politicianId}`);

  const onTabChange = (tab: ProfileTab): void => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next);
  };

  const focusTab = (tab: ProfileTab): void => {
    onTabChange(tab);
    window.requestAnimationFrame(() => {
      document.getElementById(getTabId(tab))?.focus();
    });
  };

  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, tab: ProfileTab): void => {
    const currentIndex = PROFILE_TABS.indexOf(tab);
    if (currentIndex === -1) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTab(PROFILE_TABS[(currentIndex + 1) % PROFILE_TABS.length]);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTab(PROFILE_TABS[(currentIndex - 1 + PROFILE_TABS.length) % PROFILE_TABS.length]);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(PROFILE_TABS[0]);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(PROFILE_TABS[PROFILE_TABS.length - 1]);
    }
  };

  if (!Number.isFinite(politicianId)) {
    return (
      <>
        <PageMeta
          title="Politician profile | PNYX"
          description="Browse politician profiles, promises, vote alignment, and party context on PNYX."
          path="/politicians"
        />
        <section className="page-state page-state-error" role="alert">
          <h1>Invalid politician id</h1>
          <p>The requested profile id is not a valid number.</p>
        </section>
      </>
    );
  }

  if (loading || trustLoading) {
    return (
      <>
        <PageMeta
          title="Loading politician | PNYX"
          description="Browse politician profiles, promises, vote alignment, and party context on PNYX."
          path={`/politicians/${politicianId}`}
        />
        <LoadingState label="Loading politician profile..." />
      </>
    );
  }

  if (error || trustError) {
    return (
      <>
        <PageMeta
          title="Politician profile unavailable | PNYX"
          description="Browse politician profiles, promises, vote alignment, and party context on PNYX."
          path={`/politicians/${politicianId}`}
        />
        <ErrorState message={error ?? trustError ?? "Unable to load politician profile."} onRetry={() => void refresh()} />
      </>
    );
  }

  if (!politician) {
    return (
      <>
        <PageMeta
          title="Politician not found | PNYX"
          description="Browse politician profiles, promises, vote alignment, and party context on PNYX."
          path={`/politicians/${politicianId}`}
        />
        <section className="page-state page-state-error" role="alert">
          <h1>Politician not found</h1>
          <p>We could not find a profile for id {politicianId}.</p>
        </section>
      </>
    );
  }

  return (
    <div className="stack-lg">
      <PageMeta
        title={`${politician.name} | PNYX`}
        description={`Browse promises, vote alignment, and party context for ${politician.name} on PNYX.`}
        path={`/politicians/${politicianId}`}
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
            <Link className="breadcrumb-link" to="/politicians">
              Politicians
            </Link>
            <span className="breadcrumb-separator" aria-hidden="true">
              /
            </span>
            <span className="breadcrumb-current" aria-current="page">
              {politician.name}
            </span>
          </nav>
          <p className="eyebrow">Public person record</p>
          <h1>{politician.name}</h1>
          <p className="lede">{formatIdentityLine(politician.office, getTerritoryLabel(politician))}</p>
          <p className="meta-line">
            Party:{" "}
            {linkedPartyShell ? (
              <Link className="party-badge" to={`/parties/${linkedPartyShell.party.id}`}>
                {getPartyAffiliationLabel(politician)}
              </Link>
            ) : (
              getPartyAffiliationLabel(politician)
            )}
          </p>
          <p className="meta-line mono-inline">Profile source: {politician.externalId ?? "Not connected yet"}</p>
          <div className="card-link-row">
            <Link className="button button-link" to="/politicians">
              Back to directory
            </Link>
            <Link className="button button-secondary" to={statementContributionTarget}>
              {session ? "Submit sourced statement" : "Sign in to submit a source"}
            </Link>
          </div>
        </div>

        <aside className="record-facts" aria-label="Profile record summary">
          <div>
            <span>Tracked promises</span>
            <strong>{totalPromises}</strong>
          </div>
          <div>
            <span>Unknown outcomes</span>
            <strong>{unknownCount}</strong>
          </div>
          <div>
            <span>Vote comparisons</span>
            <strong>{trustSummary?.voteAlignmentCounts.aligned ?? 0} known</strong>
          </div>
          <div>
            <span>Party line</span>
            <strong>{formatPercent(trustSummary?.partyLinePercentages ? 100 - trustSummary.partyLinePercentages.unknown : null)}</strong>
          </div>
        </aside>
      </section>

      {politician.readiness ? (
        <PageReadinessPanel readiness={politician.readiness} contributionHref={statementContributionTarget} />
      ) : null}

      <section className="record-summary-grid" aria-label="Promise and alignment summary">
        <article className="card scorecard">
          <h2>Total promises tracked</h2>
          <p className="score-value">{totalPromises}</p>
        </article>
        <article className="card scorecard">
          <h2>Fulfilled</h2>
          <p className="score-value">{trustSummary?.fulfillmentCounts.fulfilled ?? 0}</p>
        </article>
        <article className="card scorecard">
          <h2>Broken</h2>
          <p className="score-value">{trustSummary?.fulfillmentCounts.broken ?? 0}</p>
        </article>
        <article className="card scorecard">
          <h2>In progress</h2>
          <p className="score-value">{trustSummary?.fulfillmentCounts.inProgress ?? 0}</p>
        </article>
        <article className="card scorecard">
          <h2>Unknown</h2>
          <p className="score-value">{unknownCount}</p>
        </article>
        <article className="card scorecard">
          <h2>Vote alignment summary</h2>
          <p className="score-value">
            A {trustSummary?.voteAlignmentCounts.aligned ?? 0} / C {trustSummary?.voteAlignmentCounts.contradicted ?? 0}
          </p>
          <p className="meta-line">
            Mixed {trustSummary?.voteAlignmentCounts.mixed ?? 0} / Unknown {trustSummary?.voteAlignmentCounts.unknown ?? 0} · known record{" "}
            {formatPercent(
              trustSummary?.voteAlignmentPercentages
                ? 100 - trustSummary.voteAlignmentPercentages.unknown
                : null
            )}
          </p>
        </article>
      </section>

      <section className="split-grid" aria-label="Party context">
        <article className="card stack-sm">
          <h2>Party affiliation</h2>
          <p>
            {linkedPartyShell ? (
              <Link className="party-badge" to={`/parties/${linkedPartyShell.party.id}`}>
                {getPartyAffiliationLabel(politician)}
              </Link>
            ) : (
              getPartyAffiliationLabel(politician)
            )}
          </p>
          <p className="meta-line">
            {linkedPartyShell ? "Backend-backed party identity is connected for this politician." : "No party affiliation is listed in the current record."}
          </p>
        </article>

        <article className="card stack-sm">
          <h2>Party-line alignment</h2>
          <p className="meta-line">
            Counts first: A {trustSummary?.partyLineCounts.aligned ?? 0} / Break {trustSummary?.partyLineCounts.brokePartyLine ?? 0} / U{" "}
            {trustSummary?.partyLineCounts.unknown ?? 0}
          </p>
          <p className="meta-line">
            Known party-line record:{" "}
            {formatPercent(
              trustSummary?.partyLinePercentages ? 100 - trustSummary.partyLinePercentages.unknown : null
            )}
          </p>
          <p className="meta-line">Read methodology for how party records and politician records are compared.</p>
        </article>
      </section>

      <section className="card stack-sm" aria-label="Profile tabs">
        <div className="tabs" role="tablist" aria-label="Politician profile tabs">
          {PROFILE_TABS.map((tab) => (
            <button
              key={tab}
              id={getTabId(tab)}
              className={activeTab === tab ? "tab active" : "tab"}
              role="tab"
              aria-controls={getTabPanelId(tab)}
              aria-selected={activeTab === tab}
              onClick={() => onTabChange(tab)}
              onKeyDown={(event) => onTabKeyDown(event, tab)}
              tabIndex={activeTab === tab ? 0 : -1}
              type="button"
            >
              {PROFILE_TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div
          id={getTabPanelId("promises")}
          className="tab-panel-motion"
          role="tabpanel"
          aria-labelledby={getTabId("promises")}
          hidden={activeTab !== "promises"}
        >
            <p className="data-note">
              Canonical promises are listed first when they exist. Raw statement submissions stay visible separately so public readers can distinguish the canon from submission history.
            </p>

            <div className="table-wrapper desktop-only">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Promise statement</th>
                    <th scope="col">Date promised</th>
                    <th scope="col">Current fulfillment status</th>
                    <th scope="col">Vote alignment status</th>
                    <th scope="col">Party-line status</th>
                    <th scope="col">Evidence count</th>
                    <th scope="col">Link to detail</th>
                  </tr>
                </thead>
                <tbody>
                  {(trustSummary?.promises ?? []).map((promise) => {
                    const detailId = promise.statementId;
                    return (
                      <tr key={`canonical-${promise.canonicalPromiseId}`}>
                        <td>{promise.promiseText}</td>
                        <td>{formatDate(promise.datePromised)}</td>
                        <td>
                          <StatusChip status={promise.fulfillmentStatus} prefix="Fulfillment" />
                        </td>
                        <td>
                          <StatusChip status={promise.voteAlignment} prefix="Vote alignment" />
                        </td>
                        <td>{renderPartyLineBadge(promise.partyLineStatus)}</td>
                        <td>{promise.acceptedSourceCount}</td>
                        <td>{detailId ? <Link to={`/promises/${detailId}`}>Open promise</Link> : <span className="meta-line">No compatible detail route</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="cards-grid cards-grid-1 mobile-only">
              {(trustSummary?.promises ?? []).map((promise) => {
                const detailId = promise.statementId;
                return (
                  <article key={`canonical-${promise.canonicalPromiseId}`} className="card stack-xs">
                    <h3>{promise.promiseText}</h3>
                    <p className="meta-line">Date promised: {formatDate(promise.datePromised)}</p>
                    <p className="meta-line">
                      Fulfillment: <StatusChip status={promise.fulfillmentStatus} prefix="Fulfillment" />
                    </p>
                    <p className="meta-line">
                      Vote alignment: <StatusChip status={promise.voteAlignment} prefix="Vote alignment" />
                    </p>
                    <p>Evidence count: {promise.acceptedSourceCount}</p>
                    {renderPartyLineBadge(promise.partyLineStatus)}
                    {detailId ? <Link to={`/promises/${detailId}`}>Open promise detail</Link> : <p className="meta-line">No compatible detail route.</p>}
                  </article>
                );
              })}
            </div>

            <article className="card stack-sm">
              <h2>Raw submission history</h2>
              {rawSubmissionHistory.length === 0 ? (
                <p className="meta-line">No extra raw submissions are linked to this politician beyond the current canonical surfaces.</p>
              ) : (
                <ul className="timeline-list">
                  {rawSubmissionHistory.map((statement) => (
                    <li key={statement.id} className="timeline-item">
                      <p className="mono-inline">{formatDate(statement.createdAt)}</p>
                      <p>{statement.body}</p>
                      <p className="meta-line">Verification: {formatReviewStatus(statement.verificationStatus)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </article>
        </div>

        <div
          id={getTabPanelId("votes")}
          className="tab-panel-motion"
          role="tabpanel"
          aria-labelledby={getTabId("votes")}
          hidden={activeTab !== "votes"}
        >
          <div className="stack-sm">
            <p className="data-note">Vote alignment now comes from mapped vote events and the politician's recorded vote on those linked events.</p>
            <div className="cards-grid cards-grid-1">
              {(trustSummary?.promises ?? []).map((promise) => (
                <article key={promise.canonicalPromiseId} className="card stack-xs">
                  <h3>{promise.promiseText}</h3>
                  <p className="meta-line">Promised on {formatDate(promise.datePromised)}</p>
                  <StatusChip status={promise.voteAlignment} prefix="Vote alignment" />
                  <p className="meta-line">Mapped vote events: {promise.voteComparisonCount}</p>
                  <p className="meta-line">Latest evidence date: {formatDateTime(promise.latestEvidenceDate)}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div
          id={getTabPanelId("evidence")}
          className="tab-panel-motion"
          role="tabpanel"
          aria-labelledby={getTabId("evidence")}
          hidden={activeTab !== "evidence"}
        >
          <div className="record-list" role="list" aria-label="Evidence timeline">
            {statements
              .filter((statement) => statement.politicianId === politician.id)
              .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
              .map((statement) => (
                <article key={statement.id} className="record-row" role="listitem">
                  <div className="record-row-main">
                    <p className="mono-inline">{formatDateTime(statement.createdAt)}</p>
                    <h3>{statement.body}</h3>
                    <p className="meta-line">
                      Source: <a href={statement.sourceUrl}>{statement.sourceUrl}</a>
                    </p>
                  </div>
                  <div className="record-row-side">
                    <span>{formatReviewStatus(statement.verificationStatus)}</span>
                    <Link to={`/promises/${statement.id}`}>Open record</Link>
                  </div>
                </article>
              ))}
          </div>
        </div>
      </section>

      <DiscussionPanel
        entityKind="politician"
        entityId={politicianId}
        currentPath={`/politicians/${politicianId}`}
        session={session}
      />
    </div>
  );
};
