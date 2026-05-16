/* Finland-first party directory backed by canonical backend party and membership reads. */

import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { PageMeta } from "../components/PageMeta";
import { listParties } from "../lib/api";
import type { BackendPartySummary } from "../types";

const formatPercent = (value: number | null | undefined): string => {
  return value == null ? "Unknown" : `${value}%`;
};

const formatFulfillmentCounts = (entry: BackendPartySummary): string => {
  const counts = entry.trustSummary?.fulfillmentCounts;
  if (!counts) {
    return "Unknown";
  }
  return `F ${counts.fulfilled} / B ${counts.broken} / P ${counts.inProgress} / U ${counts.unknown}`;
};

const formatPartyLineCounts = (entry: BackendPartySummary): string => {
  const counts = entry.trustSummary?.partyLineCounts;
  if (!counts) {
    return "Unknown";
  }
  return `A ${counts.aligned} / Break ${counts.brokePartyLine} / U ${counts.unknown}`;
};

export const PartiesPage = (): ReactElement => {
  const [parties, setParties] = useState<BackendPartySummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setParties(await listParties());
    } catch (err) {
      setError((err as Error).message || "Unable to load party directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return <LoadingState label="Loading party directory..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="stack-lg">
      <PageMeta
        title="Parties | PNYX"
        description="Browse Finnish political parties on PNYX and inspect stance coverage, memberships, and visible data gaps."
        path="/parties"
      />
      <header className="page-heading">
        <h1>Parties</h1>
      </header>

      <section className="stack-sm" aria-label="Party directory">
        <div className="section-header">
          <h2>Directory</h2>
        </div>

        <div className="record-list">
          {parties.length === 0 ? (
            <article className="record-row">
              <h3>No canonical parties yet</h3>
              <p>Party cards will appear here as canonical party identities and memberships are populated.</p>
            </article>
          ) : (
          parties.map((entry) => (
            <article key={entry.id} className="record-row">
              <div className="record-row-main">
                <p className="mono-inline">{entry.shortName}</p>
                <h3>{entry.name}</h3>
                <p>
                  {entry.description ??
                    "Canonical party identity is available; stance and member coverage appear when source-backed records exist."}
                </p>
              </div>

              <div className="record-row-side" aria-label={`${entry.name} summary`}>
                <span>{entry.officialStanceCount ?? 0} positions</span>
                <span>{entry.currentMemberCount} members</span>
                <span>{entry.trustSummary?.promiseCount ?? 0} promises</span>
                <span>{formatFulfillmentCounts(entry)}</span>
                <span>{formatPartyLineCounts(entry)}</span>
                <span>Known party line {formatPercent(entry.trustSummary?.partyLinePercentages ? 100 - entry.trustSummary.partyLinePercentages.unknown : null)}</span>
                <Link to={`/parties/${entry.id}`}>View party profile</Link>
              </div>
            </article>
          )))}
        </div>
      </section>
    </div>
  );
};
