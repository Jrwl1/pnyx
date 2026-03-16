/* WHAT IT DO? Implements a Finland-first party directory route shell using frontend-local placeholders and explicit unknown states. */

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
          <p className="eyebrow">Finland-first party discovery</p>
          <h1>Browse political party route shells without faking backend coverage.</h1>
          <p className="lede">
            These party pages exist so public navigation and discovery can land now. Official party stances, memberships, and party-line summaries remain explicit unknowns until the public backend exposes canonical party records.
          </p>
        </div>

        <aside className="col-span-4 stack-sm info-panel" aria-label="Directory status">
          <h2>Directory status</h2>
          <ul>
            <li>This is a frontend-local placeholder directory.</li>
            <li>Counts stay Unknown when no party API exists.</li>
            <li>The seed list is non-exhaustive and used for route-shell validation only.</li>
          </ul>
        </aside>
      </section>

      <section className="stack-sm" aria-label="Party route shells">
        <div className="section-header">
          <h2>Party route shells</h2>
          <p className="data-note">Every card below links to a public party profile shell with explicit missing-data messaging.</p>
        </div>

        <div className="cards-grid route-shell-grid">
          {PARTY_ROUTE_SHELLS.map((entry) => (
            <article key={entry.party.id} className="card stack-sm card-interactive">
              <div className="stack-xs">
                <span className="placeholder-badge mono-inline">Placeholder shell</span>
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
                <Link to={`/parties/${entry.party.id}`}>Open party profile</Link>
                <Link to="/methodology">Review methodology</Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
