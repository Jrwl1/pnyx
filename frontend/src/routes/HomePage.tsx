/* Finland-first home page with politician search, live promise discovery, and trust framing. */

import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { useAuth } from "../context/AuthContext";
import {
  buildDirectoryRows,
  buildHomePartyCards,
  buildLatestPromiseFeed,
  buildSearchSuggestions,
  findPartyShellByQuery,
  getPartyAffiliationLabel,
  getTerritoryLabel,
  ISSUE_OPTIONS,
  toPartyRecord
} from "../lib/domain";
import { listParties } from "../lib/api";
import { formatDate, formatIdentityLine } from "../lib/format";
import { usePublicData } from "../context/PublicDataContext";
import type { BackendPartySummary } from "../types";

const truncatePromiseText = (value: string, maxLength = 156): string => {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
};

const buildSignInRedirectLink = (target: string): string => {
  const params = new URLSearchParams({ redirect: target });
  return `/sign-in?${params.toString()}`;
};

export const HomePage = (): ReactElement => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { politicians, statements, loading, error, refresh } = usePublicData();
  const [query, setQuery] = useState<string>("");
  const [parties, setParties] = useState<BackendPartySummary[]>([]);
  const [partyLoading, setPartyLoading] = useState<boolean>(true);
  const [partyError, setPartyError] = useState<string | null>(null);

  const loadParties = async (): Promise<void> => {
    setPartyLoading(true);
    setPartyError(null);
    try {
      setParties(await listParties());
    } catch (err) {
      setPartyError((err as Error).message || "Unable to load party data.");
    } finally {
      setPartyLoading(false);
    }
  };

  useEffect(() => {
    void loadParties();
  }, []);

  const latestPromises = useMemo(() => buildLatestPromiseFeed(politicians, statements, 4), [politicians, statements]);
  const partyRecords = useMemo(() => parties.map(toPartyRecord), [parties]);

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
      .slice(0, 4);
  }, [politicians, statements]);

  const featuredParties = useMemo(() => buildHomePartyCards(politicians, statements, partyRecords).slice(0, 4), [partyRecords, politicians, statements]);
  const exactPartyMatch = useMemo(() => findPartyShellByQuery(query, partyRecords), [partyRecords, query]);
  const searchSuggestions = useMemo(() => buildSearchSuggestions(politicians, query, 6, partyRecords), [partyRecords, politicians, query]);
  const politicianProposalTarget = session ? "/contribute/politicians/new" : buildSignInRedirectLink("/contribute/politicians/new");
  const statementContributionTarget = session ? "/contribute/statements/new" : buildSignInRedirectLink("/contribute/statements/new");

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      navigate("/politicians");
      return;
    }

    const partyMatch = findPartyShellByQuery(trimmedQuery, partyRecords);
    if (partyMatch) {
      navigate(`/parties/${partyMatch.party.id}`);
      return;
    }

    const params = new URLSearchParams();
    params.set("q", trimmedQuery);

    navigate(`/politicians${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const onSuggestionSelect = (target: string): void => {
    navigate(target);
  };

  if (loading || partyLoading) {
    return <LoadingState />;
  }

  if (error || partyError) {
    return <ErrorState message={error ?? partyError ?? "Unable to load data."} onRetry={() => { void refresh(); void loadParties(); }} />;
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

          {searchSuggestions.length > 0 ? (
            <div className="search-suggestions" role="listbox" aria-label="Search suggestions">
              {searchSuggestions.map((suggestion) => (
                <button key={suggestion.key} className="search-suggestion" type="button" onClick={() => onSuggestionSelect(suggestion.target)}>
                  <strong>{suggestion.label}</strong>
                  <span>{suggestion.description}</span>
                </button>
              ))}
            </div>
          ) : null}

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
                {featuredParties.length === 0 ? (
                  <span className="data-note">No canonical parties connected yet.</span>
                ) : (
                  featuredParties.map((entry) => (
                    <Link key={entry.party.id} className="shortcut-link" to={`/parties/${entry.party.id}`}>
                      {entry.party.shortName}
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="col-span-4 stack-sm info-panel" aria-label="How this works">
          <h2>How this works</h2>
          <div className="explainer-grid">
            <article className="explainer-step">
              <span className="explainer-step-index">1</span>
              <h3>Search</h3>
              <p>Start with a politician, party, office, or issue.</p>
            </article>
            <article className="explainer-step">
              <span className="explainer-step-index">2</span>
              <h3>Open the record</h3>
              <p>Read the original promise and the linked public evidence.</p>
            </article>
            <article className="explainer-step">
              <span className="explainer-step-index">3</span>
              <h3>Check the gaps</h3>
              <p>Unknowns stay visible until the missing context is connected.</p>
            </article>
          </div>
        </aside>
      </section>

      <section className="stack-sm">
        <div className="section-header">
          <div className="stack-xs">
            <h2>Latest documented promises</h2>
            <p className="data-note">Recent promise records from the current public dataset, with linked politician context.</p>
          </div>
          <Link className="button button-secondary" to="/politicians">
            Browse all politicians
          </Link>
        </div>

        <div className="cards-grid cards-grid-2 promise-feed-grid">
          {latestPromises.length === 0 ? (
            <article className="card">
              <h3>No promise records yet</h3>
              <p>Promise entries will appear here as public statements are added to the dataset.</p>
            </article>
          ) : (
            latestPromises.map((entry) => (
              <article key={entry.promise.id} className="card promise-feed-card">
                <p className="mono-inline">{entry.promise.recordType === "canonical" ? "Canonical promise" : "Raw submission"}</p>
                <div className="claim-block claim-block-compact">
                  <h3>
                    <Link to={`/promises/${entry.promise.id}`}>{truncatePromiseText(entry.promise.promiseText)}</Link>
                  </h3>
                </div>
                <p className="meta-line">
                  {entry.politician ? (
                    <>
                      <Link to={`/politicians/${entry.politician.id}`}>{entry.politician.name}</Link>
                      {" \u00b7 "}
                      {entry.linkedParty ? (
                        <Link className="party-badge" to={`/parties/${entry.linkedParty.id}`}>
                          {entry.linkedParty.shortName}
                        </Link>
                      ) : (
                        getPartyAffiliationLabel(entry.politician)
                      )}
                      {" \u00b7 "}
                      {getTerritoryLabel(entry.politician) ?? "Region not provided"}
                    </>
                  ) : (
                    <>Politician record not available</>
                  )}
                </p>
                <div className="stat-strip" aria-label="Promise summary">
                  <span className="stat-pill">Promised {formatDate(entry.publishedAt)}</span>
                  <span className="stat-pill">Evidence {entry.promise.evidenceCount}</span>
                  <span className="stat-pill">{entry.promise.recordType === "canonical" ? "Canonical public" : "Legacy submission"}</span>
                  <span className="stat-pill">Status Unknown</span>
                </div>
                <div className="card-link-row">
                  <Link className="button button-link" to={`/promises/${entry.promise.id}`}>
                    View promise
                  </Link>
                  {entry.politician ? (
                    <Link className="button button-link" to={`/politicians/${entry.politician.id}`}>
                      View politician
                    </Link>
                  ) : null}
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="panel-grid">
        <article className="card stack-sm">
          <div className="section-header">
            <div className="stack-xs">
              <h2>Politicians to start with</h2>
              <p className="data-note">A denser view of the most recently updated profiles.</p>
            </div>
            <Link className="button button-link" to="/politicians">
              Open directory
            </Link>
          </div>

          <div className="cards-grid cards-grid-2">
            {featuredRows.length === 0 ? (
              <article className="card">
                <h3>No politician profiles yet</h3>
                <p>Profiles will appear here as public statements are connected to politicians.</p>
              </article>
            ) : (
              featuredRows.map((row) => (
                <article key={row.politician.id} className="card discovery-card">
                  <div className="stack-xs">
                    <h3>{row.politician.name}</h3>
                    <p className="meta-line">{formatIdentityLine(row.politician.office, getTerritoryLabel(row.politician))}</p>
                  </div>
                  <div className="stat-strip" aria-label={`${row.politician.name} summary`}>
                    <span className="party-badge">{getPartyAffiliationLabel(row.politician)}</span>
                    <span className="stat-pill">{row.promiseStats.total} promises</span>
                    <span className="stat-pill">Updated {formatDate(row.lastUpdated)}</span>
                  </div>
                  <div className="card-link-row">
                    <Link className="button button-link" to={`/politicians/${row.politician.id}`}>
                      Open profile
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </article>

        <article className="card stack-sm">
          <div className="section-header">
            <div className="stack-xs">
              <h2>Browse by party</h2>
              <p className="data-note">Party pages already show public context and make missing data visible.</p>
            </div>
            <Link className="button button-link" to="/parties">
              Open party directory
            </Link>
          </div>

          <div className="cards-grid cards-grid-2 party-discovery-grid">
            {featuredParties.length === 0 ? (
              <article className="card">
                <h3>No party records yet</h3>
                <p>Party cards will appear here once canonical party identities and memberships are populated.</p>
              </article>
            ) : (
              featuredParties.map((entry) => (
                <article key={entry.party.id} className="card discovery-card">
                  <div className="stack-xs">
                    <h3>{entry.party.name}</h3>
                    <span className="party-badge">{entry.party.shortName}</span>
                    <p>{entry.party.contextLine}</p>
                  </div>
                  <div className="stat-strip" aria-label={`${entry.party.name} summary`}>
                    <span className="stat-pill">{entry.linkedPoliticians} linked politicians</span>
                    <span className="stat-pill">{entry.promisesTracked} promises tracked</span>
                    <span className="stat-pill">Latest {formatDate(entry.latestActivity)}</span>
                  </div>
                  <div className="card-link-row">
                    <Link className="button button-link" to={`/parties/${entry.party.id}`}>
                      View party profile
                    </Link>
                  </div>
                </article>
              ))
            )}
          </div>
        </article>
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

      <section className="panel-grid">
        <article className="card stack-sm">
          <h2>Help expand the record</h2>
          <p>
            Signed-in contributors can submit missing politician profiles or add sourced statements for existing politicians without leaving the public site.
          </p>
          <div className="card-link-row">
            <Link className="button button-secondary" to={politicianProposalTarget}>
              {session ? "Submit politician proposal" : "Sign in to submit a politician proposal"}
            </Link>
            <Link className="button button-link" to={statementContributionTarget}>
              {session ? "Add statement to a politician" : "Sign in to add a statement"}
            </Link>
          </div>
        </article>

        <article className="card stack-sm">
          <h2>Contribution rules</h2>
          <ul className="placeholder-list">
            <li>Proposal submissions may require a captcha token when enforcement is active.</li>
            <li>Statement submissions must include a politician, source URL, quoted body, and the date it was said.</li>
            <li>Duplicate and rate-limit responses are shown directly from the backend so missing access or abuse limits stay visible.</li>
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
