/* WHAT IT DO? Implements the Finland-first home page with politician-first search, party shortcuts, and explicit unknown-state trust framing. */

import { useMemo, useState, type FormEvent, type ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { buildDirectoryRows, findPartyShellByQuery, getPartyAffiliationLabel, getTerritoryLabel, ISSUE_OPTIONS } from "../lib/domain";
import { formatDateTime, formatIdentityLine } from "../lib/format";
import { usePublicData } from "../context/PublicDataContext";
import { PARTY_ROUTE_SHELLS } from "../types";

export const HomePage = (): ReactElement => {
  const navigate = useNavigate();
  const { politicians, statements, loading, error, refresh } = usePublicData();
  const [query, setQuery] = useState<string>("");

  const featuredRows = useMemo(() => {
    return buildDirectoryRows(politicians, statements)
      .sort((a, b) => {
        const rightDate = b.lastUpdated ? new Date(b.lastUpdated).getTime() : 0;
        const leftDate = a.lastUpdated ? new Date(a.lastUpdated).getTime() : 0;
        if (rightDate !== leftDate) {
          return rightDate - leftDate;
        }

        if (b.promiseStats.total !== a.promiseStats.total) {
          return b.promiseStats.total - a.promiseStats.total;
        }

        return a.politician.name.localeCompare(b.politician.name);
      })
      .slice(0, 6);
  }, [politicians, statements]);

  const featuredParties = useMemo(() => PARTY_ROUTE_SHELLS.slice(0, 4), []);
  const exactPartyMatch = useMemo(() => findPartyShellByQuery(query), [query]);

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      navigate("/politicians");
      return;
    }

    const partyMatch = findPartyShellByQuery(trimmedQuery);
    if (partyMatch) {
      navigate(`/parties/${partyMatch.party.id}`);
      return;
    }

    const params = new URLSearchParams();
    params.set("q", trimmedQuery);

    navigate(`/politicians${params.toString() ? `?${params.toString()}` : ""}`);
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  return (
    <div className="stack-xl">
      <section className="hero-panel grid-12">
        <div className="col-span-8 stack-md">
          <p className="eyebrow">Finland-first public discovery</p>
          <h1>Find a Finnish politician first, then open the party context around the same public record.</h1>
          <p className="lede">
            PNYX tracks sourced promises, makes party-context gaps explicit, and keeps unknown accountability data visible instead of implying certainty the backend does not have yet.
          </p>

          <form className="search-form" onSubmit={onSearchSubmit}>
            <label className="sr-only" htmlFor="home-search">
              Search politician, party, office, or constituency
            </label>
            <input
              id="home-search"
              className="text-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search politician, party, office, or constituency"
            />
            <button className="button button-primary" type="submit">
              Search
            </button>
          </form>

          <p className="data-note">
            {exactPartyMatch
              ? `Exact match found for ${exactPartyMatch.party.shortName}. Search will open that frontend-local party shell until canonical party search ships.`
              : "Politician search remains the primary action. Exact placeholder party names also open the new party shells."}
          </p>

          <div className="shortcut-cluster">
            <div className="stack-xs">
              <p className="mono-inline">Quick issue filters</p>
              <div className="issue-filter-row" role="group" aria-label="Quick issue filters">
                {ISSUE_OPTIONS.map((issue) => (
                  <button
                    key={issue}
                    className="issue-chip"
                    type="button"
                    onClick={() => navigate(`/politicians?issue=${encodeURIComponent(issue)}`)}
                  >
                    {issue}
                  </button>
                ))}
              </div>
            </div>

            <div className="stack-xs">
              <p className="mono-inline">Party shortcuts</p>
              <div className="shortcut-row" role="group" aria-label="Party shortcuts">
                {featuredParties.map((entry) => (
                  <Link key={entry.party.id} className="shortcut-link" to={`/parties/${entry.party.id}`}>
                    {entry.party.shortName}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="col-span-4 stack-sm info-panel" aria-label="How this works">
          <h2>How this works</h2>
          <ul>
            <li>Promises are tracked as sourced public statements.</li>
            <li>Party stance and politician stance stay separate, even when one side is still unknown.</li>
            <li>Unknown data is shown as a transparency rule, not hidden as if it were complete.</li>
          </ul>
        </aside>
      </section>

      <section className="stack-sm">
        <div className="section-header">
          <h2>Recently documented politicians</h2>
          <p className="data-note">Ordered by latest statement activity, then promise coverage.</p>
        </div>

        <div className="cards-grid cards-grid-3">
          {featuredRows.length === 0 ? (
            <article className="card">
              <h3>No politician profiles yet</h3>
              <p>Start by adding public statements and evidence records in the backend workflow.</p>
            </article>
          ) : (
            featuredRows.map((row) => (
              <article key={row.politician.id} className="card card-interactive">
                <h3>{row.politician.name}</h3>
                <p className="meta-line">{formatIdentityLine(row.politician.office, getTerritoryLabel(row.politician))}</p>
                <p className="meta-line">Party affiliation: {getPartyAffiliationLabel(row.politician)}</p>
                <p>
                  <strong>{row.promiseStats.total}</strong> promises tracked
                </p>
                <p className="meta-line">Last documented activity: {formatDateTime(row.lastUpdated)}</p>
                <Link className="button button-link" to={`/politicians/${row.politician.id}`}>
                  Open profile
                </Link>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="stack-sm">
        <div className="section-header">
          <h2>Featured party route shells</h2>
          <p className="data-note">Frontend-local placeholders keep party discovery visible while canonical party APIs are still pending.</p>
        </div>

        <div className="cards-grid cards-grid-3">
          {featuredParties.map((entry) => (
            <article key={entry.party.id} className="card stack-xs card-interactive">
              <span className="placeholder-badge mono-inline">Party shortcut</span>
              <h3>{entry.party.name}</h3>
              <p className="meta-line mono-inline">{entry.party.shortName}</p>
              <p>{entry.party.contextLine}</p>
              <Link className="button button-link" to={`/parties/${entry.party.id}`}>
                Open party shell
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="panel-grid">
        <article className="card stack-sm">
          <h2>What PNYX is</h2>
          <ul className="placeholder-list">
            <li>A public accountability surface grounded in sourced statements.</li>
            <li>A place to compare politician promise tracking with party-context gaps shown clearly.</li>
            <li>A product that keeps Unknown states visible until better evidence exists.</li>
          </ul>
        </article>

        <article className="card stack-sm">
          <h2>What PNYX is not</h2>
          <ul className="placeholder-list">
            <li>Not a leaderboard built around popularity or engagement metrics.</li>
            <li>Not a substitute for canonical party, membership, or vote-mapping APIs that do not exist yet.</li>
            <li>Not a place where party stance is treated as identical to an individual politician stance.</li>
          </ul>
        </article>
      </section>

      <section className="card stack-sm">
        <div className="section-header">
          <div className="stack-xs">
            <h2>Methodology and unknown-data rules</h2>
            <p className="lede">
              Read how PNYX separates promise fulfillment, vote alignment, party stance, and explicit unknown states before drawing conclusions from any profile.
            </p>
          </div>
          <Link className="button button-secondary" to="/methodology">
            Open methodology
          </Link>
        </div>
      </section>
    </div>
  );
};
