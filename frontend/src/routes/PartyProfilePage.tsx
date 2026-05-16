/* Finland-first party profile page backed by canonical party detail and membership reads. */

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { PageMeta } from "../components/PageMeta";
import { PageReadinessPanel } from "../components/PageReadinessPanel";
import { StatusChip } from "../components/StatusChip";
import { getPartyById, getPartyMembers, getPartyStances, listActivityFeed } from "../lib/api";
import { formatDate, formatDateTime, formatIdentityLine } from "../lib/format";
import type { ActivityFeedItem, BackendPartyAlias, BackendPartyMember, BackendPartyStance, BackendPartySummary } from "../types";

const formatPercent = (value: number | null | undefined): string => {
  return value == null ? "Unknown" : `${value}%`;
};

const formatPartyLineCounts = (party: BackendPartySummary | null): string => {
  const counts = party?.trustSummary?.partyLineCounts;
  if (!counts) {
    return "Unknown";
  }
  return `A ${counts.aligned} / Break ${counts.brokePartyLine} / U ${counts.unknown}`;
};

export const PartyProfilePage = (): ReactElement => {
  const { id } = useParams();
  const [party, setParty] = useState<BackendPartySummary | null>(null);
  const [aliases, setAliases] = useState<BackendPartyAlias[]>([]);
  const [members, setMembers] = useState<BackendPartyMember[]>([]);
  const [stances, setStances] = useState<BackendPartyStance[]>([]);
  const [activity, setActivity] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Party id is required.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const [partyDetail, memberResponse, stanceItems, activityItems] = await Promise.all([
          getPartyById(id),
          getPartyMembers(id, true),
          getPartyStances(id),
          listActivityFeed(`?partyId=${id}&limit=6`)
        ]);
        if (!cancelled) {
          setParty(partyDetail.party);
          setAliases(partyDetail.aliases);
          setMembers(memberResponse.items);
          setStances(stanceItems);
          setActivity(activityItems);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || "Unable to load party profile.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const currentMembers = useMemo(() => members.filter((member) => member.current === 1), [members]);
  const historicalMembers = useMemo(() => members.filter((member) => member.current === 0), [members]);

  if (loading) {
    return (
      <>
        <PageMeta
          title="Loading party | PNYX"
          description="Browse Finnish political parties, stance coverage, and member context on PNYX."
          path={id ? `/parties/${id}` : "/parties"}
        />
        <LoadingState label="Loading party profile..." />
      </>
    );
  }

  if (error || !party) {
    return (
      <>
        <PageMeta
          title="Party profile unavailable | PNYX"
          description="Browse Finnish political parties, stance coverage, and member context on PNYX."
          path={id ? `/parties/${id}` : "/parties"}
        />
        <ErrorState message={error ?? "Party page not found."} />
      </>
    );
  }

  return (
    <div className="stack-lg">
      <PageMeta
        title={`${party.name} | PNYX`}
        description={`Browse party stances, memberships, and party-line context for ${party.name} on PNYX.`}
        path={`/parties/${party.id}`}
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
            <Link className="breadcrumb-link" to="/parties">
              Parties
            </Link>
            <span className="breadcrumb-separator" aria-hidden="true">
              /
            </span>
            <span className="breadcrumb-current" aria-current="page">
              {party.shortName}
            </span>
          </nav>
          <p className="eyebrow">Party public record</p>
          <h1>{party.name}</h1>
          <span className="party-badge">{party.shortName}</span>
          <p className="lede">
            {party.description ??
              "Party identity, official positions, member links, and party-line context are shown only where source-backed records exist."}
          </p>
          <div className="card-link-row">
            <Link className="button button-link" to="/parties">
              Back to parties
            </Link>
            {party.websiteUrl ? (
              <a className="button button-secondary" href={party.websiteUrl}>
                Official website
              </a>
            ) : null}
          </div>
        </div>

        <aside className="record-facts" aria-label="Party record summary">
          <div>
            <span>Positions</span>
            <strong>{party.officialStanceCount ?? stances.length}</strong>
          </div>
          <div>
            <span>Current members</span>
            <strong>{party.currentMemberCount}</strong>
          </div>
          <div>
            <span>Promises assessed</span>
            <strong>{party.trustSummary?.promiseCount ?? 0}</strong>
          </div>
          <div>
            <span>Known party line</span>
            <strong>{formatPercent(party.trustSummary?.partyLinePercentages ? 100 - party.trustSummary.partyLinePercentages.unknown : null)}</strong>
          </div>
        </aside>
      </section>

      {party.readiness ? (
        <PageReadinessPanel readiness={party.readiness} contributionHref="/contribute/statements/new" />
      ) : null}

      <section className="record-summary-grid" aria-label="Party summary">
        <article className="card scorecard">
          <h2>Official stances tracked</h2>
          <p className="score-value">{party.officialStanceCount ?? stances.length}</p>
          <p className="meta-line">Sourced official party positions currently connected to this profile.</p>
        </article>
        <article className="card scorecard">
          <h2>Members on PNYX</h2>
          <p className="score-value">{party.currentMemberCount}</p>
          <p className="meta-line">Current memberships connected to politician profiles.</p>
        </article>
        <article className="card scorecard">
          <h2>Promises assessed</h2>
          <p className="score-value">{party.trustSummary?.promiseCount ?? 0}</p>
          <p className="meta-line">Canonical promises from current member politicians with backend trust records.</p>
        </article>
        <article className="card scorecard">
          <h2>Party-line counts</h2>
          <p className="score-value">{formatPartyLineCounts(party)}</p>
          <p className="meta-line">
            Known party-line record:{" "}
            {formatPercent(
              party.trustSummary?.partyLinePercentages ? 100 - party.trustSummary.partyLinePercentages.unknown : null
            )}
          </p>
        </article>
      </section>

      <section className="card stack-sm" aria-label="Aliases">
        <h2>Aliases and identity coverage</h2>
        <p className="meta-line">Country code: {party.countryCode}</p>
        {aliases.length === 0 ? (
          <p>No aliases are recorded for this party yet.</p>
        ) : (
          <ul className="placeholder-list">
            {aliases.map((alias) => (
              <li key={alias.id}>
                {alias.alias}
                {alias.sourceNote ? ` (${alias.sourceNote})` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card stack-sm" aria-label="Official party stances">
        <h2>Official party stances</h2>
        {stances.length === 0 ? (
          <>
            <StatusChip status="unknown" prefix="Official party stances" />
            <p>No official party stance records are connected for this profile yet.</p>
          </>
        ) : (
          <div className="record-list">
            {stances.map((stance) => (
              <article key={stance.id} className="record-row">
                <div className="record-row-main">
                  <h3>{stance.issue ?? "General policy position"}</h3>
                  <p>{stance.stanceText}</p>
                  <p className="meta-line">
                    Source: <a href={stance.sourceUrl}>{stance.sourceUrl}</a>
                  </p>
                  {stance.sourceNote ? <p className="meta-line">{stance.sourceNote}</p> : null}
                </div>
                <div className="record-row-side">
                  <span>{formatDate(stance.dateSaid)}</span>
                  <span>Official stance</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card stack-sm" aria-label="Recent party activity">
        <h2>Recent party activity</h2>
        {activity.length === 0 ? (
          <p className="meta-line">No recent public party activity is connected yet.</p>
        ) : (
          <ul className="timeline-list">
            {activity.map((item) => (
              <li key={item.id} className="timeline-item">
                <p>{item.title}</p>
                <p className="meta-line">{item.actorId} · {formatDateTime(item.createdAt)}</p>
                <p className="meta-line">{item.description}</p>
                <Link to={item.target}>Open related record</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="split-grid">
        <article className="card stack-sm" aria-label="Current member politicians">
          <h2>Current member politicians</h2>
          {currentMembers.length === 0 ? (
            <>
              <StatusChip status="unknown" prefix="Current member politicians" />
              <p>No current member roster is connected yet.</p>
            </>
          ) : (
            <div className="cards-grid cards-grid-1">
              {currentMembers.map((member) => (
                <article key={member.membershipId} className="card stack-xs">
                  <h3>
                    <Link to={`/politicians/${member.politicianId}`}>{member.name}</Link>
                  </h3>
                  <p className="meta-line">{formatIdentityLine(member.office, member.region)}</p>
                  <p className="meta-line">Membership start: {formatDate(member.startDate)}</p>
                  {member.roleTitle ? <p>Role: {member.roleTitle}</p> : null}
                  {member.trustSummary ? (
                    <>
                      <p className="meta-line">
                        Trust counts: F {member.trustSummary.fulfillmentCounts.fulfilled} / B {member.trustSummary.fulfillmentCounts.broken} / P{" "}
                        {member.trustSummary.fulfillmentCounts.inProgress} / U {member.trustSummary.fulfillmentCounts.unknown}
                      </p>
                      <p className="meta-line">
                        Party-line: A {member.trustSummary.partyLineCounts.aligned} / Break {member.trustSummary.partyLineCounts.brokePartyLine} / U{" "}
                        {member.trustSummary.partyLineCounts.unknown}
                      </p>
                    </>
                  ) : (
                    <p className="meta-line">Trust summary not yet available for this member.</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </article>

        <article className="card stack-sm" aria-label="Historical memberships">
          <h2>Historical memberships</h2>
          {historicalMembers.length === 0 ? (
            <>
              <StatusChip status="unknown" prefix="Historical memberships" />
              <p>No historical party membership records are connected yet.</p>
            </>
          ) : (
            <ul className="timeline-list">
              {historicalMembers.map((member) => (
                <li key={member.membershipId} className="timeline-item">
                  <p>
                    <Link to={`/politicians/${member.politicianId}`}>{member.name}</Link>
                  </p>
                  <p className="meta-line">{formatIdentityLine(member.office, member.region)}</p>
                  <p className="meta-line">
                    {formatDate(member.startDate)} to {formatDate(member.endDate)}
                  </p>
                  <p className="meta-line">Updated {formatDateTime(member.updatedAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="card stack-sm" aria-label="Party-line alignment context">
        <h2>Party-line alignment context</h2>
        <p>PNYX keeps politician promises, party stances, and party-line assessments separate, then rolls the counts up from source-backed records.</p>
        <p className="meta-line">
          Fulfillment: F {party.trustSummary?.fulfillmentCounts.fulfilled ?? 0} / B {party.trustSummary?.fulfillmentCounts.broken ?? 0} / P{" "}
          {party.trustSummary?.fulfillmentCounts.inProgress ?? 0} / U {party.trustSummary?.fulfillmentCounts.unknown ?? 0}
        </p>
        <p className="meta-line">
          Vote alignment: A {party.trustSummary?.voteAlignmentCounts.aligned ?? 0} / C {party.trustSummary?.voteAlignmentCounts.contradicted ?? 0} / M{" "}
          {party.trustSummary?.voteAlignmentCounts.mixed ?? 0} / U {party.trustSummary?.voteAlignmentCounts.unknown ?? 0}
        </p>
        <p className="meta-line">
          Party line: {formatPartyLineCounts(party)}. Percentages stay secondary and are shown only after the raw counts.
        </p>
        <div className="card-link-row">
          <Link to="/politicians">Browse politicians</Link>
          <Link to="/methodology">Read methodology</Link>
        </div>
      </section>
    </div>
  );
};
