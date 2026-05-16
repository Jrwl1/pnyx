/* Finland-first home page focused on search, real records, and visible gaps. */

import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { PageMeta } from "../components/PageMeta";
import { useAuth } from "../context/AuthContext";
import { usePublicData } from "../context/PublicDataContext";
import { listActivityFeed, listParties, searchSite } from "../lib/api";
import {
  buildDirectoryRows,
  buildLatestPromiseFeed,
  findPartyShellByQuery,
  getTerritoryLabel,
  ISSUE_OPTIONS,
  toPartyRecord
} from "../lib/domain";
import { formatDate, formatDateTime, formatIdentityLine } from "../lib/format";
import type { ActivityFeedItem, BackendPartySummary, Politician, SearchResultItem } from "../types";

const truncate = (value: string, maxLength = 170): string => {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength).trimEnd()}...`;
};

const buildSignInRedirectLink = (target: string): string => {
  const params = new URLSearchParams({ redirect: target });
  return `/sign-in?${params.toString()}`;
};

const getCompactPartyLabel = (politician: Politician): string => {
  return politician.partyShortName?.trim() || politician.partyName?.trim() || "Party not recorded";
};

export const HomePage = (): ReactElement => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { politicians, statements, loading, error, refresh } = usePublicData();
  const [query, setQuery] = useState<string>("");
  const [parties, setParties] = useState<BackendPartySummary[]>([]);
  const [activity, setActivity] = useState<ActivityFeedItem[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchResultItem[]>([]);
  const [partyLoading, setPartyLoading] = useState<boolean>(true);
  const [partyError, setPartyError] = useState<string | null>(null);
  const [activityError, setActivityError] = useState<string | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    const loadActivity = async (): Promise<void> => {
      try {
        const items = await listActivityFeed("?limit=3");
        if (!cancelled) {
          setActivity(items);
          setActivityError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setActivity([]);
          setActivityError((err as Error).message || "Unable to load activity.");
        }
      }
    };

    void loadActivity();
    return () => {
      cancelled = true;
    };
  }, []);

  const latestPromises = useMemo(() => buildLatestPromiseFeed(politicians, statements, 3), [politicians, statements]);
  const heroPromises = useMemo(() => latestPromises.slice(0, 2), [latestPromises]);
  const partyRecords = useMemo(() => parties.map(toPartyRecord), [parties]);
  const exactPartyMatch = useMemo(() => findPartyShellByQuery(query, partyRecords), [partyRecords, query]);
  const featuredRows = useMemo(() => {
    return buildDirectoryRows(politicians, statements)
      .sort((left, right) => {
        if (right.promiseStats.total !== left.promiseStats.total) {
          return right.promiseStats.total - left.promiseStats.total;
        }
        return left.politician.name.localeCompare(right.politician.name);
      })
      .slice(0, 4);
  }, [politicians, statements]);
  const featuredParties = useMemo(() => {
    return [...parties]
      .sort((left, right) => {
        const stanceDelta = (right.officialStanceCount ?? 0) - (left.officialStanceCount ?? 0);
        if (stanceDelta !== 0) {
          return stanceDelta;
        }
        return left.name.localeCompare(right.name);
      })
      .slice(0, 6);
  }, [parties]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    let cancelled = false;
    const loadSuggestions = async (): Promise<void> => {
      try {
        const items = await searchSite(trimmedQuery);
        if (!cancelled) {
          setSearchSuggestions(items.slice(0, 6));
        }
      } catch {
        if (!cancelled) {
          setSearchSuggestions([]);
        }
      }
    };

    void loadSuggestions();
    return () => {
      cancelled = true;
    };
  }, [query]);

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

    const params = new URLSearchParams({ q: trimmedQuery });
    navigate(`/politicians?${params.toString()}`);
  };

  if (loading || partyLoading) {
    return <LoadingState />;
  }

  if (error || partyError) {
    return <ErrorState message={error ?? partyError ?? "Unable to load data."} onRetry={() => { void refresh(); void loadParties(); }} />;
  }

  return (
    <div className="stack-xl">
      <PageMeta
        title="PNYX | Finnish political accountability"
        description="Search Finnish politicians, parties, promises, and source-backed public evidence."
        path="/"
      />

      <section className="record-hero">
        <div className="record-hero-main">
          <h1>Finnish political promises and evidence.</h1>
          <p className="lede">
            Search a politician, party, issue, or promise. PNYX shows the public claim, its source, related party positions and votes, editorial assessments, and missing evidence.
          </p>
          <form className="search-form" onSubmit={onSearchSubmit}>
            <label className="sr-only" htmlFor="home-search">
              Search politician, party, promise, or issue
            </label>
            <input
              id="home-search"
              className="text-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Petteri Orpo, SDP, climate, employment..."
            />
            <button className="button button-primary" type="submit">
              Search
            </button>
          </form>

          {searchSuggestions.length > 0 ? (
            <div className="search-suggestions" role="listbox" aria-label="Search suggestions">
              {searchSuggestions.map((suggestion) => (
                <button key={suggestion.key} className="search-suggestion" type="button" onClick={() => navigate(suggestion.target)}>
                  <strong>{suggestion.label}</strong>
                  <span>{suggestion.description}</span>
                </button>
              ))}
            </div>
          ) : null}

          <p className="data-note">
            {exactPartyMatch ? `Exact party match: ${exactPartyMatch.party.shortName}.` : "Try a politician, party short name, or issue."}
          </p>

          <div className="hero-record-list" aria-label="Latest promise records">
            <div className="section-header">
              <h2>Latest records</h2>
              <Link to="/promises">Browse all</Link>
            </div>
            {heroPromises.length === 0 ? (
              <p className="meta-line">No promise records available.</p>
            ) : (
              heroPromises.map((entry) => (
                <Link key={entry.promise.id} className="mini-record" to={`/promises/${entry.promise.id}`}>
                  <span>{entry.promise.recordType === "canonical" ? "Reviewed public record" : "Submitted record"}</span>
                  <strong>{truncate(entry.promise.promiseText, 115)}</strong>
                  <span>
                    {entry.politician ? entry.politician.name : "Politician record not available"}, {formatDate(entry.publishedAt)}, {entry.promise.evidenceCount} sources
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        <aside className="hero-directory-list" aria-label="People and parties">
          <div className="hero-directory-section">
            <div className="section-header">
              <h2>People</h2>
              <Link to="/politicians">Open directory</Link>
            </div>
            <div className="record-list">
              {featuredRows.slice(0, 2).map((row) => (
                <Link key={row.politician.id} className="mini-record" to={`/politicians/${row.politician.id}`}>
                  <strong>{row.politician.name}</strong>
                  <span className="hero-person-office">{formatIdentityLine(row.politician.office, getTerritoryLabel(row.politician))}</span>
                  <span>{getCompactPartyLabel(row.politician)}, {row.promiseStats.total} tracked</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="hero-directory-section">
            <div className="section-header">
              <h2>Parties</h2>
              <Link to="/parties">Open parties</Link>
            </div>
            <div className="party-token-grid hero-party-grid">
              {featuredParties.slice(0, 4).map((party) => (
                <Link key={party.id} className="party-token" to={`/parties/${party.id}`}>
                  <strong>{party.shortName}</strong>
                  <span>{party.officialStanceCount ?? 0} positions</span>
                </Link>
              ))}
            </div>
          </div>
        </aside>

      </section>

      <section className="contribution-strip" aria-label="Contribute evidence">
        <div className="stack-xs">
          <h2>Submit evidence for review</h2>
          <p>Add a public source for a promise, party position, correction, or missing statement.</p>
        </div>
        <div className="card-link-row">
          <Link className="button button-secondary" to={session ? "/contribute/promises/new" : buildSignInRedirectLink("/contribute/promises/new")}>
            Submit source
          </Link>
          <Link className="button button-link" to="/methodology">
            Methodology
          </Link>
        </div>
      </section>

      <section className="question-panel">
        <div className="section-header">
          <h2>Recent public changes</h2>
          <p className="data-note">Canonical and ingest activity from the current accountability graph.</p>
        </div>
        {activityError ? (
          <p className="meta-line">{activityError}</p>
        ) : activity.length === 0 ? (
          <p className="meta-line">No public activity is available yet.</p>
        ) : (
          <ul className="timeline-list">
            {activity.map((item) => (
              <li key={item.id} className="timeline-item">
                <p>{item.title}</p>
                <p className="meta-line">{item.actorId}, {formatDateTime(item.createdAt)}</p>
                <p className="meta-line">{item.description}</p>
                <Link to={item.target}>Open record</Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="question-panel">
        <div className="section-header">
          <h2>Browse by issue</h2>
          <p className="data-note">Issue labels are public navigation aids, not editorial verdicts.</p>
        </div>
        <div className="issue-filter-row" role="group" aria-label="Issue filters">
          {ISSUE_OPTIONS.map((issue) => (
            <button key={issue} className="issue-chip" type="button" onClick={() => navigate(`/promises?issue=${encodeURIComponent(issue)}`)}>
              {issue}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
