/* WHAT IT DO? Adds a public browse surface for promises with politician, party, issue, and record-state filters. */

import { useEffect, useMemo, useState, type ChangeEvent, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { PageMeta } from "../components/PageMeta";
import { usePublicData } from "../context/PublicDataContext";
import {
  getIssueTagsForStatement,
  getPartyAffiliationLabel,
  getTerritoryLabel,
  hasPartyAffiliationData,
  ISSUE_OPTIONS,
  toPromiseRecord
} from "../lib/domain";
import { listParties } from "../lib/api";
import { formatDate, formatIdentityLine } from "../lib/format";
import type { BackendPartySummary } from "../types";

type RecordStateFilter = "all" | "canonical" | "legacy";

export const PromiseIndexPage = (): ReactElement => {
  const { politicians, statements, loading, error, refresh } = usePublicData();
  const [parties, setParties] = useState<BackendPartySummary[]>([]);
  const [partyLoading, setPartyLoading] = useState<boolean>(true);
  const [partyError, setPartyError] = useState<string | null>(null);

  const [query, setQuery] = useState<string>("");
  const [politicianFilter, setPoliticianFilter] = useState<string>("");
  const [partyFilter, setPartyFilter] = useState<string>("");
  const [issueFilter, setIssueFilter] = useState<string>("");
  const [recordState, setRecordState] = useState<RecordStateFilter>("all");

  useEffect(() => {
    let cancelled = false;
    const loadParties = async (): Promise<void> => {
      setPartyLoading(true);
      setPartyError(null);
      try {
        const items = await listParties();
        if (!cancelled) {
          setParties(items);
        }
      } catch (err) {
        if (!cancelled) {
          setPartyError((err as Error).message || "Unable to load party filters.");
        }
      } finally {
        if (!cancelled) {
          setPartyLoading(false);
        }
      }
    };

    void loadParties();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedPoliticians = useMemo(
    () => [...politicians].sort((left, right) => left.name.localeCompare(right.name)),
    [politicians]
  );
  const hasPartyData = useMemo(() => hasPartyAffiliationData(politicians), [politicians]);
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
            return [value, { value, label: getPartyAffiliationLabel(politician) }];
          })
      ).values()
    ].sort((left, right) => left.label.localeCompare(right.label));
  }, [hasPartyData, politicians]);

  const filteredPromises = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return statements
      .map((statement) => {
        const politician = politicians.find((entry) => entry.id === statement.politicianId) ?? null;
        return {
          statement,
          promise: toPromiseRecord(statement),
          politician,
          issueTags: getIssueTagsForStatement(statement)
        };
      })
      .filter((entry) => {
        if (normalizedQuery) {
          const searchText = [
            entry.promise.promiseText,
            entry.politician?.name ?? "",
            entry.politician?.partyName ?? "",
            entry.politician?.partyShortName ?? "",
            entry.politician?.office ?? "",
            entry.politician ? getTerritoryLabel(entry.politician) ?? "" : ""
          ]
            .join(" ")
            .toLowerCase();
          if (!searchText.includes(normalizedQuery)) {
            return false;
          }
        }

        if (politicianFilter && entry.statement.politicianId !== Number(politicianFilter)) {
          return false;
        }

        if (partyFilter && entry.politician) {
          const candidates = [entry.politician.partyId, entry.politician.partyShortName, entry.politician.partyName].filter(
            (value): value is string => Boolean(value)
          );
          if (!candidates.includes(partyFilter)) {
            return false;
          }
        }

        if (issueFilter && !entry.issueTags.includes(issueFilter)) {
          return false;
        }

        if (recordState === "canonical" && entry.promise.recordType !== "canonical") {
          return false;
        }

        if (recordState === "legacy" && entry.promise.recordType !== "legacy") {
          return false;
        }

        return true;
      })
      .sort((left, right) => new Date(right.statement.dateSaid).getTime() - new Date(left.statement.dateSaid).getTime());
  }, [issueFilter, partyFilter, politicianFilter, politicians, query, recordState, statements]);

  const onFilterChange =
    (setter: (value: string) => void) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
      setter(event.target.value);
    };

  if (loading || partyLoading) {
    return <LoadingState label="Loading promise directory..." />;
  }

  if (error || partyError) {
    return <ErrorState message={error ?? partyError ?? "Unable to load promise directory."} onRetry={() => void refresh()} />;
  }

  return (
    <div className="stack-lg">
      <PageMeta
        title="Promises | PNYX"
        description="Browse documented promises by politician, party, issue, and record state across the current public PNYX dataset."
        path="/promises"
      />
      <section className="hero-panel stack-sm">
        <p className="eyebrow">Promise directory</p>
        <h1>Browse documented promises on PNYX</h1>
        <p className="lede">
          Filter by politician, party, issue, or record state, then open the full promise record with evidence, trust context, and visible unknowns.
        </p>
      </section>

      <section className="directory-controls stack-sm" aria-label="Promise directory filters">
        <div className="controls-grid">
          <label className="field-group" htmlFor="promise-directory-search">
            <span>Search</span>
            <input
              id="promise-directory-search"
              className="text-input"
              type="search"
              value={query}
              onChange={onFilterChange(setQuery)}
              placeholder="Promise text, politician, party, office, or region"
            />
          </label>

          <label className="field-group" htmlFor="promise-directory-politician">
            <span>Politician</span>
            <select
              id="promise-directory-politician"
              className="select-input"
              value={politicianFilter}
              onChange={onFilterChange(setPoliticianFilter)}
            >
              <option value="">All politicians</option>
              {sortedPoliticians.map((politician) => (
                <option key={politician.id} value={String(politician.id)}>
                  {politician.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group" htmlFor="promise-directory-party">
            <span>Party</span>
            <select
              id="promise-directory-party"
              className="select-input"
              value={hasPartyData ? partyFilter : ""}
              onChange={onFilterChange(setPartyFilter)}
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

          <label className="field-group" htmlFor="promise-directory-issue">
            <span>Issue</span>
            <select
              id="promise-directory-issue"
              className="select-input"
              value={issueFilter}
              onChange={onFilterChange(setIssueFilter)}
            >
              <option value="">All issues</option>
              {ISSUE_OPTIONS.map((issue) => (
                <option key={issue} value={issue}>
                  {issue}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group" htmlFor="promise-directory-record-state">
            <span>Record state</span>
            <select
              id="promise-directory-record-state"
              className="select-input"
              value={recordState}
              onChange={onFilterChange((value) => setRecordState(value as RecordStateFilter))}
            >
              <option value="all">All records</option>
              <option value="canonical">Canonical only</option>
              <option value="legacy">Legacy submissions only</option>
            </select>
          </label>
        </div>
        <p className="data-note">Showing {filteredPromises.length} promise records from the current public dataset.</p>
      </section>

      <section className="cards-grid cards-grid-2">
        {filteredPromises.length === 0 ? (
          <article className="card stack-sm">
            <h2>No promises match the current filters</h2>
            <p>Clear one or more filters to widen the public promise view.</p>
          </article>
        ) : (
          filteredPromises.map((entry) => (
            <article key={entry.statement.id} className="card stack-sm">
              <p className="mono-inline">{entry.promise.recordType === "canonical" ? "Canonical promise" : "Legacy submission"}</p>
              <h2>
                <Link to={`/promises/${entry.statement.id}`}>{entry.promise.promiseText}</Link>
              </h2>
              {entry.politician ? (
                <p className="meta-line">
                  <Link to={`/politicians/${entry.politician.id}`}>{entry.politician.name}</Link>
                  {" · "}
                  {formatIdentityLine(entry.politician.office, getTerritoryLabel(entry.politician))}
                </p>
              ) : (
                <p className="meta-line">Politician record not available.</p>
              )}
              {entry.politician ? <p>Party affiliation: {getPartyAffiliationLabel(entry.politician)}</p> : null}
              <div className="stat-strip">
                <span className="stat-pill">Promised {formatDate(entry.promise.datePromised)}</span>
                <span className="stat-pill">Evidence {entry.promise.evidenceCount}</span>
                <span className="stat-pill">{entry.promise.recordType === "canonical" ? "Canonical" : "Legacy"}</span>
              </div>
              {entry.issueTags.length > 0 ? (
                <div className="shortcut-row">
                  {entry.issueTags.map((issue) => (
                    <span key={`${entry.statement.id}-${issue}`} className="stat-pill">
                      {issue}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="data-note">No issue tags matched the current public keyword rules.</p>
              )}
              <div className="card-link-row">
                <Link className="button button-link" to={`/promises/${entry.statement.id}`}>
                  Open promise detail
                </Link>
                {entry.politician ? (
                  <Link className="button button-secondary" to={`/politicians/${entry.politician.id}`}>
                    Open politician
                  </Link>
                ) : null}
              </div>
            </article>
          ))
        )}
      </section>

      <section className="card stack-sm">
        <h2>How to read this directory</h2>
        <ul className="placeholder-list">
          <li>Canonical records are already merged into the public promise graph.</li>
          <li>Legacy submissions stay visible until canonization or merge work is complete.</li>
          <li>Issue filters use the same keyword-based public tagging rules used elsewhere in the site.</li>
        </ul>
      </section>
    </div>
  );
};
