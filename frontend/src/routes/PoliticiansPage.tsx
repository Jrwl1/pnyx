/* WHAT IT DO? Implements the V3 politician directory with search, filters, required sort modes, and responsive listing. */

import { useMemo, type ChangeEvent, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { buildDirectoryRows, buildSearchText, ISSUE_OPTIONS, SORT_OPTIONS, type DirectorySort } from "../lib/domain";
import { formatDateTime, formatIdentityLine } from "../lib/format";
import { usePublicData } from "../context/PublicDataContext";

const SORT_LABELS: Record<DirectorySort, string> = {
  most_promises: "Most promises",
  fulfillment_rate: "Fulfillment rate",
  most_viewed: "Most viewed",
  recently_updated: "Recently updated"
};

export const PoliticiansPage = (): ReactElement => {
  const { politicians, statements, loading, error, refresh } = usePublicData();
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("q") ?? "";
  const region = searchParams.get("region") ?? "";
  const office = searchParams.get("office") ?? "";
  const issue = searchParams.get("issue") ?? "";
  const sort = (searchParams.get("sort") as DirectorySort) ?? SORT_OPTIONS.recentlyUpdated;

  const rows = useMemo(() => buildDirectoryRows(politicians, statements), [politicians, statements]);

  const regions = useMemo(() => {
    return [...new Set(rows.map((row) => row.politician.region).filter((value): value is string => Boolean(value)))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [rows]);

  const offices = useMemo(() => {
    return [...new Set(rows.map((row) => row.politician.office).filter((value): value is string => Boolean(value)))].sort((a, b) =>
      a.localeCompare(b)
    );
  }, [rows]);

  const filteredRows = useMemo(() => {
    const loweredQuery = query.trim().toLowerCase();

    const filtered = rows.filter((row) => {
      if (loweredQuery && !buildSearchText(row).includes(loweredQuery)) {
        return false;
      }

      if (region && row.politician.region !== region) {
        return false;
      }

      if (office && row.politician.office !== office) {
        return false;
      }

      if (issue && !row.issueTags.includes(issue)) {
        return false;
      }

      return true;
    });

    return filtered.sort((left, right) => {
      if (sort === SORT_OPTIONS.mostPromises || sort === SORT_OPTIONS.mostViewed) {
        if (right.promiseStats.total !== left.promiseStats.total) {
          return right.promiseStats.total - left.promiseStats.total;
        }
      }

      if (sort === SORT_OPTIONS.recentlyUpdated) {
        const rightDate = right.lastUpdated ? new Date(right.lastUpdated).getTime() : 0;
        const leftDate = left.lastUpdated ? new Date(left.lastUpdated).getTime() : 0;
        if (rightDate !== leftDate) {
          return rightDate - leftDate;
        }
      }

      return left.politician.name.localeCompare(right.politician.name);
    });
  }, [issue, office, query, region, rows, sort]);

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

  if (loading) {
    return <LoadingState label="Loading politician directory..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  const sortNotice =
    sort === SORT_OPTIONS.mostViewed
      ? "Most viewed data is not yet available, so this view falls back to most promises."
      : sort === SORT_OPTIONS.fulfillmentRate
        ? "Fulfillment-rate sorting remains unavailable while fulfillment data is Unknown."
        : null;

  return (
    <div className="stack-lg">
      <section className="stack-sm">
        <h1>Politicians directory</h1>
        <p className="lede">Browse public figures, compare promise coverage, and open a full accountability profile.</p>
      </section>

      <section className="directory-controls stack-sm" aria-label="Directory filters">
        <div className="controls-grid">
          <label className="field-group">
            <span>Search</span>
            <input className="text-input" type="search" value={query} onChange={onTextFilterChange} placeholder="Name, office, state" />
          </label>

          <label className="field-group">
            <span>State or region</span>
            <select className="select-input" value={region} onChange={onSelectFilterChange("region")}>
              <option value="">All regions</option>
              {regions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>Office</span>
            <select className="select-input" value={office} onChange={onSelectFilterChange("office")}>
              <option value="">All offices</option>
              {offices.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>Party</span>
            <select className="select-input" value="" disabled aria-describedby="party-unavailable">
              <option value="">Data not yet available</option>
            </select>
          </label>

          <label className="field-group">
            <span>Issue</span>
            <select className="select-input" value={issue} onChange={onSelectFilterChange("issue")}>
              <option value="">All issues</option>
              {ISSUE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group">
            <span>Sort</span>
            <select className="select-input" value={sort} onChange={onSelectFilterChange("sort")}>
              {(Object.values(SORT_OPTIONS) as DirectorySort[]).map((option) => (
                <option key={option} value={option}>
                  {SORT_LABELS[option]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p id="party-unavailable" className="data-note">
          Party metadata is not currently provided by the backend endpoint.
        </p>
        <p className="data-note">Issue filtering is keyword-based until backend issue tagging becomes available.</p>
        {sortNotice ? <p className="data-note">{sortNotice}</p> : null}
      </section>

      <section className="stack-sm" aria-label="Politician listing">
        <p className="meta-line">Showing {filteredRows.length} politicians</p>

        <div className="table-wrapper desktop-only">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Politician</th>
                <th scope="col">Office + region</th>
                <th scope="col">Promise counts</th>
                <th scope="col">Fulfillment ratio</th>
                <th scope="col">Last updated</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={row.politician.id}>
                  <td>
                    <Link to={`/politicians/${row.politician.id}`}>{row.politician.name}</Link>
                  </td>
                  <td>{formatIdentityLine(row.politician.office, row.politician.region)}</td>
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
            <article key={row.politician.id} className="card stack-xs">
              <h3>
                <Link to={`/politicians/${row.politician.id}`}>{row.politician.name}</Link>
              </h3>
              <p className="meta-line">{formatIdentityLine(row.politician.office, row.politician.region)}</p>
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
            <p>Try clearing filters or searching with a broader name, office, or region term.</p>
          </article>
        ) : null}
      </section>
    </div>
  );
};
