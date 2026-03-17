/* Finland-first home page with politician search, party discovery, and trust framing. */

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
          <p className="eyebrow">Finnish political accountability</p>
          <h1>What did they promise, and what does the public record show?</h1>
          <p className="lede">
            Search Finnish politicians by name, party, office, or issue. Read the promises, open the evidence, and see clearly where the record is still incomplete.
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
              ? `Exact match found for ${exactPartyMatch.party.shortName}. Search will open that party page directly.`
              : "Search politicians first, or enter a party name such as SDP or Kokoomus."}
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
              <p className="mono-inline">Browse by party</p>
              <div className="shortcut-row" role="group" aria-label="Browse by party">
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
            <li>Each promise starts with a public statement and a source you can inspect.</li>
            <li>Politician records and party records are shown separately so the gaps stay visible.</li>
            <li>When evidence is missing, PNYX says so directly instead of guessing.</li>
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
          <h2>Political parties</h2>
          <p className="data-note">Open party pages to see the current public context, key gaps, and linked politicians.</p>
        </div>

        <div className="cards-grid cards-grid-3">
          {featuredParties.map((entry) => (
            <article key={entry.party.id} className="card stack-xs card-interactive">
              <span className="placeholder-badge mono-inline">Party profile</span>
              <h3>{entry.party.name}</h3>
              <p className="meta-line mono-inline">{entry.party.shortName}</p>
              <p>{entry.party.contextLine}</p>
              <Link className="button button-link" to={`/parties/${entry.party.id}`}>
                View party profile
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="panel-grid">
        <article className="card stack-sm">
          <h2>What you can track here</h2>
          <ul className="placeholder-list">
            <li>Promises tied to public statements and source material.</li>
            <li>Politician profiles that show activity, evidence, and open questions.</li>
            <li>Party pages that make missing context visible instead of hiding it.</li>
          </ul>
        </article>

        <article className="card stack-sm">
          <h2>How to read the unknowns</h2>
          <ul className="placeholder-list">
            <li>Unknown means the evidence has not been connected or assessed yet.</li>
            <li>Party stance is not treated as the same thing as an individual politician promise.</li>
            <li>Methodology explains how sources, evidence, and missing data are handled.</li>
          </ul>
        </article>
      </section>

      <section className="card stack-sm">
        <div className="section-header">
          <div className="stack-xs">
            <h2>Methodology and unknown-data rules</h2>
            <p className="lede">
              Read how PNYX handles promises, evidence, party context, and unknowns before drawing conclusions from any profile.
            </p>
          </div>
          <Link className="button button-secondary" to="/methodology">
            Read methodology
          </Link>
        </div>
      </section>
    </div>
  );
};
