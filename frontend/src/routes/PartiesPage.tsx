/* Finland-first party directory backed by canonical backend party and membership reads. */

import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
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
      <section className="hero-panel grid-12">
        <div className="col-span-8 stack-md">
          <p className="eyebrow">Finnish party directory</p>
          <h1>Browse Finnish political parties on PNYX.</h1>
          <p className="lede">
            Open each party page to see the public context available today, the politician links already connected, and the gaps that are still visible.
          </p>
        </div>

        <aside className="col-span-4 stack-sm info-panel" aria-label="Directory notes">
          <h2>What to expect</h2>
          <ul>
            <li>Unknown counts mean the supporting public data has not been connected yet.</li>
            <li>Party pages keep party records separate from individual politician records.</li>
            <li>The directory will expand as more party coverage is added.</li>
          </ul>
        </aside>
      </section>

      <section className="stack-sm" aria-label="Party directory">
        <div className="section-header">
          <h2>Parties on PNYX</h2>
          <p className="data-note">Each card opens a party page with current context, linked records, and clearly marked unknowns.</p>
        </div>

        <div className="cards-grid route-shell-grid">
          {parties.length === 0 ? (
            <article className="card stack-sm">
              <h3>No canonical parties yet</h3>
              <p>Party cards will appear here as canonical party identities and memberships are populated.</p>
            </article>
          ) : (
          parties.map((entry) => (
            <article key={entry.id} className="card stack-sm card-interactive">
              <div className="stack-xs">
                <span className="party-badge">{entry.shortName}</span>
                <h3>{entry.name}</h3>
                <p>
                  {entry.description ??
                    "Canonical party identity is available here now. Source-backed stance and trust records are shown directly when they exist."}
                </p>
              </div>

              <div className="stack-xs" aria-label={`${entry.name} summary`}>
                <p className="metric-pair">
                  <span>Official stances tracked</span>
                  <strong>{entry.officialStanceCount ?? 0}</strong>
                </p>
                <p className="metric-pair">
                  <span>Members on PNYX</span>
                  <strong>{entry.currentMemberCount}</strong>
                </p>
                <p className="metric-pair">
                  <span>Promises assessed</span>
                  <strong>{entry.trustSummary?.promiseCount ?? 0}</strong>
                </p>
                <p className="metric-pair">
                  <span>Fulfillment counts</span>
                  <strong>{formatFulfillmentCounts(entry)}</strong>
                </p>
                <p className="metric-pair">
                  <span>Party-line counts</span>
                  <strong>{formatPartyLineCounts(entry)}</strong>
                </p>
                <p className="meta-line">
                  Known party-line record:{" "}
                  {formatPercent(
                    entry.trustSummary?.partyLinePercentages
                      ? 100 - entry.trustSummary.partyLinePercentages.unknown
                      : null
                  )}
                </p>
              </div>

              <div className="card-link-row">
                <Link to={`/parties/${entry.id}`}>View party profile</Link>
                <Link to="/methodology">Read methodology</Link>
              </div>
            </article>
          )))}
        </div>
      </section>
    </div>
  );
};
