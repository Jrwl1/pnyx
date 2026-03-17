/* Finland-first party profile page backed by canonical party detail and membership reads. */

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { StatusChip } from "../components/StatusChip";
import { getPartyById, getPartyMembers } from "../lib/api";
import { formatDate, formatDateTime, formatIdentityLine } from "../lib/format";
import type { BackendPartyAlias, BackendPartyMember, BackendPartySummary } from "../types";

const formatUnknownCount = (value: number | null): string => {
  return value === null ? "Unknown" : String(value);
};

export const PartyProfilePage = (): ReactElement => {
  const { id } = useParams();
  const [party, setParty] = useState<BackendPartySummary | null>(null);
  const [aliases, setAliases] = useState<BackendPartyAlias[]>([]);
  const [members, setMembers] = useState<BackendPartyMember[]>([]);
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
        const [partyDetail, memberResponse] = await Promise.all([getPartyById(id), getPartyMembers(id, true)]);
        if (!cancelled) {
          setParty(partyDetail.party);
          setAliases(partyDetail.aliases);
          setMembers(memberResponse.items);
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
    return <LoadingState label="Loading party profile..." />;
  }

  if (error || !party) {
    return <ErrorState message={error ?? "Party page not found."} />;
  }

  return (
    <div className="stack-lg">
      <section className="hero-panel stack-sm">
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
        <p className="eyebrow">Party profile</p>
        <h1>{party.name}</h1>
        <span className="party-badge">{party.shortName}</span>
        <p className="lede">
          {party.description ??
            "Canonical party identity is now connected. Official stances and party-line comparisons still stay unknown until those source-backed records are added."}
        </p>
        <div className="card-link-row">
          <Link className="button button-link" to="/parties">
            Back to party directory
          </Link>
          {party.websiteUrl ? (
            <a className="button button-secondary" href={party.websiteUrl}>
              Open party website
            </a>
          ) : null}
        </div>
      </section>

      <section className="scorecards-grid" aria-label="Party summary cards">
        <article className="card scorecard">
          <h2>Aliases tracked</h2>
          <p className="score-value">{aliases.length}</p>
          <p className="meta-line">Alternative names and abbreviations for search and identity matching.</p>
        </article>
        <article className="card scorecard">
          <h2>Members on PNYX</h2>
          <p className="score-value">{party.currentMemberCount}</p>
          <p className="meta-line">Current memberships connected to politician profiles.</p>
        </article>
        <article className="card scorecard">
          <h2>Party-line summary</h2>
          <p className="score-value">Unknown</p>
          <p className="meta-line">No party-line summary is shown until the supporting records are connected.</p>
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
        <StatusChip status="unknown" prefix="Party-line alignment context" />
        <p>PNYX keeps politician promises, party stances, and party-line comparisons separate.</p>
        <p className="meta-line">
          This page now uses canonical party identity and membership data, but it still avoids inventing stance or alignment conclusions.
        </p>
        <div className="card-link-row">
          <Link to="/politicians">Browse politicians</Link>
          <Link to="/methodology">Read methodology</Link>
        </div>
      </section>
    </div>
  );
};
