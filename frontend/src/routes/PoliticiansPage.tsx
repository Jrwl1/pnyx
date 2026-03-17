/* Finland-first politician directory with public-discovery filters. */

import { useMemo, type ChangeEvent, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
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
import { formatDateTime, formatIdentityLine } from "../lib/format";
import { usePublicData } from "../context/PublicDataContext";
import { getPartyRouteShell, PARTY_ROUTE_SHELLS } from "../types";

const SORT_LABELS: Record<DirectorySort, string> = {
  most_promises: "Most promises",
  fulfillment_rate: "Fulfillment rate",
  recently_updated: "Recently updated"
};

export const PoliticiansPage = (): ReactElement => {
  const { politicians, statements, loading, error, refresh } = usePublicData();
  const [searchParams, setSearchParams] = useSearchParams();

  const query = searchParams.get("q") ?? "";
  const territory = searchParams.get("territory") ?? "";
  const office = searchParams.get("office") ?? "";
  const party = searchParams.get("party") ?? "";
  const issue = searchParams.get("issue") ?? "";
  const sort = (searchParams.get("sort") as DirectorySort) ?? SORT_OPTIONS.recentlyUpdated;

  const rows = useMemo(() => buildDirectoryRows(politicians, statements), [politicians, statements]);
  const hasPartyData = useMemo(() => hasPartyAffiliationData(politicians), [politicians]);
  const selectedPartyShell = useMemo(() => getPartyRouteShell(party), [party]);

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
      return PARTY_ROUTE_SHELLS.map((entry) => ({
        value: entry.party.id,
        label: `${entry.party.shortName} - ${entry.party.name}`
      }));
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
      if (sort === SORT_OPTIONS.mostPromises) {
        if (right.promiseStats.total !== left.promiseStats.total) {
          return right.promiseStats.total - left.promiseStats.total;
        }
      }

      if (sort === SORT_OPTIONS.fulfillmentRate) {
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

      if (sort === SORT_OPTIONS.recentlyUpdated) {
        const rightDate = right.lastUpdated ? new Date(right.lastUpdated).getTime() : 0;
        const leftDate = left.lastUpdated ? new Date(left.lastUpdated).getTime() : 0;
        if (rightDate !== leftDate) {
          return rightDate - leftDate;
        }
      }

      return left.politician.name.localeCompare(right.politician.name);
    });
  }, [hasPartyData, issue, office, party, query, rows, sort, territory]);

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
    sort === SORT_OPTIONS.fulfillmentRate && !hasKnownFulfillmentData
      ? "Fulfillment sorting is limited right now because every promise is still marked Unknown."
      : null;

  return (
    <div className="stack-lg">
      <section className="stack-sm">
        <h1>Finnish politician directory</h1>
        <p className="lede">
          Browse documented politicians, filter by constituency or region, and follow promises, evidence, and visible gaps in the public record.
        </p>
      </section>

      <section className="directory-controls stack-sm" aria-label="Directory filters">
        <div className="controls-grid">
          <label className="field-group">
            <span>Search</span>
            <input
              className="text-input"
              type="search"
              value={query}
              onChange={onTextFilterChange}
              placeholder="Name, party, office, constituency, or region"
            />
          </label>

          <label className="field-group">
            <span>Constituency or region</span>
            <select className="select-input" value={territory} onChange={onSelectFilterChange("territory")}>
              <option value="">All constituencies or regions</option>
              {territories.map((option) => (
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
            <select className="select-input" value={party} onChange={onSelectFilterChange("party")} aria-describedby="party-filter-note">
              <option value="">All parties</option>
              {partyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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

        <p id="party-filter-note" className="data-note">
          {hasPartyData
            ? "Party filters use connected affiliation fields when the dataset provides them."
            : "Party filtering will be available once politician-to-party links are connected."}
        </p>
        <p className="data-note">Issue filters currently use keyword matching. Read methodology for how labels are handled.</p>
        {party && !hasPartyData ? (
          <p className="data-note">
            {selectedPartyShell
              ? `Party filter selected: ${selectedPartyShell.party.shortName}. Results stay unchanged until membership links are added. View ${selectedPartyShell.party.name} in the party directory.`
              : `Party filter selected: ${party}. Results stay unchanged until membership links are added.`}
          </p>
        ) : null}
        {sortNotice ? <p className="data-note">{sortNotice}</p> : null}
      </section>

      <section className="stack-sm" aria-label="Politician listing">
        <p className="meta-line">Showing {filteredRows.length} politicians</p>

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
                <tr key={row.politician.id}>
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
            <article key={row.politician.id} className="card stack-xs">
              <h3>
                <Link to={`/politicians/${row.politician.id}`}>{row.politician.name}</Link>
              </h3>
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
