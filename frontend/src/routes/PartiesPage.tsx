/* Finland-first party directory with explicit unknown states. */

import type { ReactElement } from "react";
import { Link } from "react-router-dom";
import { StatusChip } from "../components/StatusChip";
import { PARTY_ROUTE_SHELLS } from "../types";

const formatUnknownCount = (value: number | null): string => {
  return value === null ? "Unknown" : String(value);
};

export const PartiesPage = (): ReactElement => {
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
          {PARTY_ROUTE_SHELLS.map((entry) => (
            <article key={entry.party.id} className="card stack-sm card-interactive">
              <div className="stack-xs">
                <span className="placeholder-badge mono-inline">Party page</span>
                <h3>{entry.party.name}</h3>
                <p className="meta-line mono-inline">{entry.party.shortName}</p>
                <p>{entry.party.contextLine}</p>
              </div>

              <div className="stack-xs" aria-label={`${entry.party.name} summary`}>
                <p className="metric-pair">
                  <span>Official stances tracked</span>
                  <strong>{formatUnknownCount(entry.officialStancesTracked)}</strong>
                </p>
                <p className="metric-pair">
                  <span>Members on PNYX</span>
                  <strong>{formatUnknownCount(entry.membersOnPnyx)}</strong>
                </p>
                <div className="metric-pair">
                  <span>Party-line summary</span>
                  <StatusChip status="unknown" prefix="Party-line summary" />
                </div>
              </div>

              <div className="card-link-row">
                <Link to={`/parties/${entry.party.id}`}>View party profile</Link>
                <Link to="/methodology">Read methodology</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
