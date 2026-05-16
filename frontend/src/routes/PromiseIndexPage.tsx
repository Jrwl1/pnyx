/* Public promise directory with source-first filters. */

import { useEffect, useMemo, useState, type ChangeEvent, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { PageMeta } from "../components/PageMeta";
import { usePublicData } from "../context/PublicDataContext";
import { listParties } from "../lib/api";
import {
  getIssueTagsForStatement,
  getPartyAffiliationLabel,
  getTerritoryLabel,
  hasPartyAffiliationData,
  ISSUE_OPTIONS,
  toPromiseRecord
} from "../lib/domain";
import { formatDate, formatIdentityLine } from "../lib/format";

type RecordStateFilter = "all" | "canonical" | "legacy";

export const PromiseIndexPage = (): ReactElement => {
  const { politicians, statements, loading, error, refresh } = usePublicData();
  const [searchParams] = useSearchParams();
  const [partyLoading, setPartyLoading] = useState<boolean>(true);
  const [partyError, setPartyError] = useState<string | null>(null);

  const [query, setQuery] = useState<string>("");
  const [politicianFilter, setPoliticianFilter] = useState<string>("");
  const [partyFilter, setPartyFilter] = useState<string>("");
  const [issueFilter, setIssueFilter] = useState<string>(searchParams.get("issue") ?? "");
  const [recordState, setRecordState] = useState<RecordStateFilter>("all");

  useEffect(() => {
    let cancelled = false;
    const loadParties = async (): Promise<void> => {
      setPartyLoading(true);
      setPartyError(null);
      try {
        await listParties();
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

  const sortedPoliticians = useMemo(() => [...politicians].sort((left, right) => left.name.localeCompare(right.name)), [politicians]);
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

      <header className="page-heading">
        <h1>Promises</h1>
      </header>

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
            <select id="promise-directory-politician" className="select-input" value={politicianFilter} onChange={onFilterChange(setPoliticianFilter)}>
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
            <select id="promise-directory-issue" className="select-input" value={issueFilter} onChange={onFilterChange(setIssueFilter)}>
              <option value="">All issues</option>
              {ISSUE_OPTIONS.map((issue) => (
                <option key={issue} value={issue}>
                  {issue}
                </option>
              ))}
            </select>
          </label>

          <label className="field-group" htmlFor="promise-directory-record-state">
            <span>Review state</span>
            <select
              id="promise-directory-record-state"
              className="select-input"
              value={recordState}
              onChange={onFilterChange((value) => setRecordState(value as RecordStateFilter))}
            >
              <option value="all">All records</option>
              <option value="canonical">Reviewed public records</option>
              <option value="legacy">Submitted records</option>
            </select>
          </label>
        </div>
        <p className="meta-line">{filteredPromises.length} matching records</p>
      </section>

      <section className="record-list">
        {filteredPromises.length === 0 ? (
          <article className="record-row">
            <div>
              <h2>No promises match the current filters</h2>
              <p>Clear one or more filters to widen the public promise view.</p>
            </div>
          </article>
        ) : (
          filteredPromises.map((entry) => (
            <article key={entry.statement.id} className="record-row">
              <div className="record-row-main">
                <p className="mono-inline">{entry.promise.recordType === "canonical" ? "Reviewed public record" : "Submitted record"}</p>
                <h2>
                  <Link to={`/promises/${entry.statement.id}`}>{entry.promise.promiseText}</Link>
                </h2>
                {entry.politician ? (
                  <p className="meta-line">
                    <Link to={`/politicians/${entry.politician.id}`}>{entry.politician.name}</Link>
                    {" · "}
                    {getPartyAffiliationLabel(entry.politician)}
                    {" · "}
                    {formatIdentityLine(entry.politician.office, getTerritoryLabel(entry.politician))}
                  </p>
                ) : (
                  <p className="meta-line">Politician record not available.</p>
                )}
              </div>
              <div className="record-row-side">
                <span>{formatDate(entry.promise.datePromised)}</span>
                <span>{entry.promise.evidenceCount} sources</span>
                <span>{entry.issueTags.length > 0 ? entry.issueTags.join(", ") : "No issue label"}</span>
                <Link to={`/promises/${entry.statement.id}`}>Open</Link>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
};
