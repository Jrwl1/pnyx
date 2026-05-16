/* Finland-first politician directory with public-discovery filters. */

import { useEffect, useMemo, useState, type ChangeEvent, type KeyboardEvent, type ReactElement } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { PageMeta } from "../components/PageMeta";
import {
  buildDirectoryRows,
  buildSearchText,
  getPartyAffiliationLabel,
  getTerritoryLabel,
  hasPartyAffiliationData,
  ISSUE_OPTIONS,
  SORT_OPTIONS,
  type DirectorySort
} from "../lib/domain";
import { searchSite } from "../lib/api";
import { formatDateTime, formatIdentityLine } from "../lib/format";
import { usePublicData } from "../context/PublicDataContext";
import type { SearchResultItem } from "../types";

const SORT_LABELS: Record<DirectorySort, string> = {
  most_promises: "Most promises",
  fulfillment_rate: "Fulfillment rate",
  recently_updated: "Recently updated"
};

export const PoliticiansPage = (): ReactElement => {
  const navigate = useNavigate();
  const { politicians, statements, loading, error, refresh } = usePublicData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchSuggestions, setSearchSuggestions] = useState<SearchResultItem[]>([]);

  const query = searchParams.get("q") ?? "";
  const territory = searchParams.get("territory") ?? "";
  const office = searchParams.get("office") ?? "";
  const party = searchParams.get("party") ?? "";
  const issue = searchParams.get("issue") ?? "";
  const sort = (searchParams.get("sort") as DirectorySort) ?? SORT_OPTIONS.recentlyUpdated;

  const rows = useMemo(() => buildDirectoryRows(politicians, statements), [politicians, statements]);
  const hasPartyData = useMemo(() => hasPartyAffiliationData(politicians), [politicians]);

  const territories = useMemo(() => {
    return [...new Set(rows.map((row) => getTerritoryLabel(row.politician)).filter((value): value is string => Boolean(value)))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [rows]);

  const offices = useMemo(() => {
    return [...new Set(rows.map((row) => row.politician.office).filter((value): value is string => Boolean(value)))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [rows]);

  const partyOptions = useMemo(() => {
    if (!hasPartyData) {
      return [];
    }

    return [
      ...new Map(
        politicians
          .filter((politician) => politician.partyId || politician.partyName || politician.partyShortName)
          .map((politician) => {
            const value = politician.partyId || politician.partyShortName || politician.partyName || "";
            return [
              value,
              {
                value,
                label: getPartyAffiliationLabel(politician)
              }
            ];
          })
      ).values()
    ].sort((left, right) => left.label.localeCompare(right.label));
  }, [hasPartyData, politicians]);

  const hasKnownFulfillmentData = useMemo(() => {
    return rows.some((row) => row.promiseStats.fulfilled > 0 || row.promiseStats.broken > 0 || row.promiseStats.inProgress > 0);
  }, [rows]);

  const effectiveSort =
    sort === SORT_OPTIONS.fulfillmentRate && !hasKnownFulfillmentData ? SORT_OPTIONS.recentlyUpdated : sort;

  useEffect(() => {
    if (query.trim().length < 2) {
      setSearchSuggestions([]);
      return;
    }

    let cancelled = false;
    const loadSuggestions = async (): Promise<void> => {
      try {
        const items = await searchSite(query.trim());
        if (!cancelled) {
          setSearchSuggestions(items.slice(0, 5));
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

  useEffect(() => {
    if (party && !hasPartyData) {
      const next = new URLSearchParams(searchParams);
      next.delete("party");
      setSearchParams(next, { replace: true });
    }
  }, [hasPartyData, party, searchParams, setSearchParams]);

  useEffect(() => {
    if (sort === SORT_OPTIONS.fulfillmentRate && !hasKnownFulfillmentData) {
      const next = new URLSearchParams(searchParams);
      next.set("sort", SORT_OPTIONS.recentlyUpdated);
      setSearchParams(next, { replace: true });
    }
  }, [hasKnownFulfillmentData, searchParams, setSearchParams, sort]);

  const filteredRows = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      if (loweredQuery && !buildSearchText(row).includes(loweredQuery)) {
        return false;
      }

      if (territory && getTerritoryLabel(row.politician) !== territory) {
        return false;
      }

      if (office && row.politician.office !== office) {
        return false;
      }

      if (party && hasPartyData) {
        const partyCandidates = [row.politician.partyId, row.politician.partyShortName, row.politician.partyName].filter(
          (value): value is string => Boolean(value)
        );
        if (!partyCandidates.includes(party)) {
          return false;
        }
      }

      if (issue && !row.issueTags.includes(issue)) {
        return false;
      }

      return true;
    });

    return filtered.sort((left, right) => {
      if (effectiveSort === SORT_OPTIONS.mostPromises) {
        if (right.promiseStats.total !== left.promiseStats.total) {
          return right.promiseStats.total - left.promiseStats.total;
        }
      }

      if (effectiveSort === SORT_OPTIONS.fulfillmentRate) {
        const rightRatio =
          right.promiseStats.total > 0 ? right.promiseStats.fulfilled / right.promiseStats.total : -1;
        const leftRatio =
          left.promiseStats.total > 0 ? left.promiseStats.fulfilled / left.promiseStats.total : -1;

        if (rightRatio !== leftRatio) {
          return rightRatio - leftRatio;
        }

        if (right.promiseStats.total !== left.promiseStats.total) {
          return right.promiseStats.total - left.promiseStats.total;
        }
      }

      if (effectiveSort === SORT_OPTIONS.recentlyUpdated) {
        const rightDate = right.lastUpdated ? new Date(right.lastUpdated).getTime() : 0;
        const leftDate = left.lastUpdated ? new Date(left.lastUpdated).getTime() : 0;
        if (rightDate !== leftDate) {
          return rightDate - leftDate;
        }
      }

      return left.politician.name.localeCompare(right.politician.name);
    });
  }, [effectiveSort, hasPartyData, issue, office, party, query, rows, territory]);

  const updateParam = (key: string, value: string): void => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }

    setSearchParams(next);
  };

  const onTextFilterChange = (event: ChangeEvent<HTMLInputElement>): void => {
    updateParam("q", event.target.value);
  };

  const onSelectFilterChange = (key: string) => (event: ChangeEvent<HTMLSelectElement>): void => {
    updateParam(key, event.target.value);
  };

  const openPoliticianProfile = (politicianId: number): void => {
    navigate(`/politicians/${politicianId}`);
  };

  const onRowKeyDown = (event: KeyboardEvent<HTMLElement>, politicianId: number): void => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openPoliticianProfile(politicianId);
    }
  };

  if (loading) {
    return <LoadingState label="Loading politician directory..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  const sortNotice = !hasKnownFulfillmentData ? "Fulfillment sorting will appear once assessed statuses exist." : null;

  return (
    <div className="stack-lg">
      <PageMeta
        title="Politicians | PNYX"
        description="Browse documented Finnish politicians, then filter by party, region, office, issue, and public promise context."
        path="/politicians"
      />
      <header className="page-heading">
        <h1>Politicians</h1>
        <nav className="page-heading-links" aria-label="Related public records">
          <Link to="/promises">Promises</Link>
          <Link to="/parties">Parties</Link>
          <Link to="/methodology">Methodology</Link>
        </nav>
      </header>

      <section className="directory-controls stack-sm" aria-label="Directory filters">
        <div className="controls-grid">
          <label className="field-group" htmlFor="directory-search">
            <span>Search</span>
            <input
              id="directory-search"
              className="text-input"
              type="search"
              name="q"
              value={query}
              onChange={onTextFilterChange}
              placeholder="Name, party, office, constituency, or region"
            />
            {searchSuggestions.length > 0 ? (
              <div className="search-suggestions" role="listbox" aria-label="Directory search suggestions">
                {searchSuggestions.map((suggestion) => (
                  <button key={suggestion.key} className="search-suggestion" type="button" onClick={() => navigate(suggestion.target)}>
                    <strong>{suggestion.label}</strong>
                    <span>{suggestion.description}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </label>

          <label className="field-group" htmlFor="directory-territory">
            <span>Constituency or region</span>
            <select id="directory-territory" name="territory" className="select-input" value={territory} onChange={onSelectFilterChange("territory")}>
              <option value="">All constituencies or regions</option>
              {territories.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group" htmlFor="directory-office">
            <span>Office</span>
            <select id="directory-office" name="office" className="select-input" value={office} onChange={onSelectFilterChange("office")}>
              <option value="">All offices</option>
              {offices.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group" htmlFor="directory-party">
            <span>Party</span>
            <select
              id="directory-party"
              name="party"
              className="select-input"
              value={hasPartyData ? party : ""}
              onChange={onSelectFilterChange("party")}
              aria-describedby="party-filter-note"
              disabled={!hasPartyData}
            >
              <option value="">All parties</option>
              {partyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group" htmlFor="directory-issue">
            <span>Issue</span>
            <select id="directory-issue" name="issue" className="select-input" value={issue} onChange={onSelectFilterChange("issue")}>
              <option value="">All issues</option>
              {ISSUE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group" htmlFor="directory-sort">
            <span>Sort</span>
            <select id="directory-sort" name="sort" className="select-input" value={effectiveSort} onChange={onSelectFilterChange("sort")}>
              {(Object.values(SORT_OPTIONS) as DirectorySort[]).map((option) => (
                <option key={option} value={option} disabled={option === SORT_OPTIONS.fulfillmentRate && !hasKnownFulfillmentData}>
                  {SORT_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p id="party-filter-note" className="data-note">
          {hasPartyData
            ? "Party filters use connected affiliation fields when the dataset provides them."
            : "Party filtering will appear once politician-to-party links are connected."}
        </p>
        <p className="data-note">Issue filters currently use keyword matching. Read methodology for how labels are handled.</p>
        {sortNotice ? <p className="data-note">{sortNotice}</p> : null}
      </section>

      <section className="stack-sm" aria-label="Politician listing">
        <p className="meta-line">{filteredRows.length} matching people</p>

        <div className="table-wrapper desktop-only">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Politician</th>
                <th scope="col">Office + constituency/region</th>
                <th scope="col">Party affiliation</th>
                <th scope="col">Promise counts</th>
                <th scope="col">Fulfillment ratio</th>
                <th scope="col">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr
                  key={row.politician.id}
                  className="table-row-link"
                  role="link"
                  tabIndex={0}
                  onClick={() => openPoliticianProfile(row.politician.id)}
                  onKeyDown={(event) => onRowKeyDown(event, row.politician.id)}
                >
                  <td>
                    <Link to={`/politicians/${row.politician.id}`}>{row.politician.name}</Link>
                  </td>
                  <td>{formatIdentityLine(row.politician.office, getTerritoryLabel(row.politician))}</td>
                  <td>
                    <span>{getPartyAffiliationLabel(row.politician)}</span>
                  </td>
                  <td>
                    F {row.promiseStats.fulfilled} / B {row.promiseStats.broken} / P {row.promiseStats.inProgress} / U {row.promiseStats.unknown}
                  </td>
                  <td>
                    <span aria-label="Fulfillment ratio unknown">Unknown</span>
                    <span className="meta-line">Data not yet available</span>
                  </td>
                  <td>{formatDateTime(row.lastUpdated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="cards-grid cards-grid-1 mobile-only">
          {filteredRows.map((row) => (
            <article
              key={row.politician.id}
              className="card stack-xs card-interactive card-link-surface"
              role="link"
              tabIndex={0}
              onClick={() => openPoliticianProfile(row.politician.id)}
              onKeyDown={(event) => onRowKeyDown(event, row.politician.id)}
            >
              <h2>
                <Link to={`/politicians/${row.politician.id}`}>{row.politician.name}</Link>
              </h2>
              <p className="meta-line">{formatIdentityLine(row.politician.office, getTerritoryLabel(row.politician))}</p>
              <p>Party affiliation: {getPartyAffiliationLabel(row.politician)}</p>
              <p>
                Promise counts: F {row.promiseStats.fulfilled}, B {row.promiseStats.broken}, P {row.promiseStats.inProgress}, U {row.promiseStats.unknown}
              </p>
              <p>
                Fulfillment ratio: <strong>Unknown</strong>
              </p>
              <p className="meta-line">Last updated: {formatDateTime(row.lastUpdated)}</p>
            </article>
          ))}
        </div>

        {filteredRows.length === 0 ? (
          <article className="card">
            <h3>No matches found</h3>
            <p>Try clearing filters or searching with a broader name, office, constituency, or region term.</p>
          </article>
        ) : null}
      </section>
    </div>
  );
};
