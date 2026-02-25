/* WHAT IT DO? Implements the V3 home page with politician search, issue shortcuts, and discoverability cards. */

import { useMemo, useState, type FormEvent, type ReactElement } from "react";
import { useNavigate } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { buildDirectoryRows, ISSUE_OPTIONS } from "../lib/domain";
import { formatIdentityLine } from "../lib/format";
import { usePublicData } from "../context/PublicDataContext";

export const HomePage = (): ReactElement => {
  const navigate = useNavigate();
  const { politicians, statements, loading, error, refresh } = usePublicData();
  const [query, setQuery] = useState<string>("");

  const rankedRows = useMemo(() => {
    return buildDirectoryRows(politicians, statements)
      .sort((a, b) => {
        if (b.promiseStats.total !== a.promiseStats.total) {
          return b.promiseStats.total - a.promiseStats.total;
        }

        return a.politician.name.localeCompare(b.politician.name);
      })
      .slice(0, 6);
  }, [politicians, statements]);

  const onSearchSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }

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
          <p className="eyebrow">Citizen-first accountability</p>
          <h1>Track public promises against evidence and voting outcomes.</h1>
          <p className="lede">
            Search any public figure, review promise history, and see where fulfillment and voting-record data is still missing.
          </p>

          <form className="search-form" onSubmit={onSearchSubmit}>
            <label className="sr-only" htmlFor="home-search">
              Search politician, office, or state
            </label>
            <input
              id="home-search"
              className="text-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search politician, office, or state"
            />
            <button className="button button-primary" type="submit">
              Search
            </button>
          </form>

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

        <aside className="col-span-4 stack-sm info-panel" aria-label="How this works">
          <h2>How this works</h2>
          <ul>
            <li>Promises are tracked as sourced public statements.</li>
            <li>Voting record alignment is shown when roll-call evidence exists.</li>
            <li>Fulfillment status stays Unknown until enough evidence is published.</li>
          </ul>
        </aside>
      </section>

      <section className="stack-sm">
        <div className="section-header">
          <h2>Most viewed politicians</h2>
          <p className="data-note">Most viewed data is not yet available; currently showing most documented profiles.</p>
        </div>

        <div className="cards-grid cards-grid-3">
          {rankedRows.length === 0 ? (
            <article className="card">
              <h3>No politician profiles yet</h3>
              <p>Start by adding public statements and evidence records in the backend workflow.</p>
            </article>
          ) : (
            rankedRows.map((row) => (
              <article key={row.politician.id} className="card card-interactive">
                <h3>{row.politician.name}</h3>
                <p className="meta-line">{formatIdentityLine(row.politician.office, row.politician.region)}</p>
                <p>
                  <strong>{row.promiseStats.total}</strong> promises tracked
                </p>
                <p className="meta-line">Unknown fulfillment: {row.promiseStats.unknown}</p>
                <button
                  className="button button-link"
                  type="button"
                  onClick={() => navigate(`/politicians/${row.politician.id}`)}
                >
                  Open profile
                </button>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
};
