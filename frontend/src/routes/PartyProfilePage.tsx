/* Finland-first party profile page with explicit unknown states. */

import type { ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { StatusChip } from "../components/StatusChip";
import { getPartyRouteShell } from "../types";

const formatUnknownCount = (value: number | null): string => {
  return value === null ? "Unknown" : String(value);
};

export const PartyProfilePage = (): ReactElement => {
  const { id } = useParams();
  const partyShell = getPartyRouteShell(id);

  if (!partyShell) {
    return (
      <section className="page-state page-state-error" role="alert">
        <h1>Party page not found</h1>
        <p>The requested party could not be found in the current public directory.</p>
        <p className="meta-line">Browse the party directory to open a tracked party page.</p>
        <Link to="/parties">Back to party directory</Link>
      </section>
    );
  }

  return (
    <div className="stack-lg">
      <section className="hero-panel stack-sm">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link className="breadcrumb-link" to="/">
            Home
          </Link>
          <span className="breadcrumb-separator" aria-hidden="true">
            /
          </span>
          <Link className="breadcrumb-link" to="/parties">
            Parties
          </Link>
          <span className="breadcrumb-separator" aria-hidden="true">
            /
          </span>
          <span className="breadcrumb-current" aria-current="page">
            {partyShell.party.shortName}
          </span>
        </nav>
        <p className="eyebrow">Party profile</p>
        <h1>{partyShell.party.name}</h1>
        <span className="party-badge">{partyShell.party.shortName}</span>
        <p className="lede">{partyShell.party.contextLine}</p>
      </section>

      <section className="scorecards-grid" aria-label="Party summary cards">
        <article className="card scorecard">
          <h2>Official stances tracked</h2>
          <p className="score-value">{formatUnknownCount(partyShell.officialStancesTracked)}</p>
          <p className="meta-line">No sourced party stance records are connected yet.</p>
        </article>
        <article className="card scorecard">
          <h2>Members on PNYX</h2>
          <p className="score-value">{formatUnknownCount(partyShell.membersOnPnyx)}</p>
          <p className="meta-line">Party membership links will appear here as they are connected.</p>
        </article>
        <article className="card scorecard">
          <h2>Party-line summary</h2>
          <p className="score-value">Unknown</p>
          <p className="meta-line">No party-line summary is shown until the supporting records are connected.</p>
        </article>
      </section>

      <section className="card stack-sm" aria-label="What is available">
        <h2>What this page shows today</h2>
        <ul className="placeholder-list">
          {partyShell.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      </section>

      <section className="split-grid">
        <article className="card stack-sm" aria-label="Official party stances">
          <h2>Official party stances</h2>
          {partyShell.stances.length === 0 ? (
            <>
              <StatusChip status="unknown" prefix="Official party stances" />
              <p>No official party stance has been recorded on this page yet.</p>
              <p className="meta-line">When sourced party positions are added, this section will show the issue, source, and date.</p>
            </>
          ) : null}
        </article>

        <article className="card stack-sm" aria-label="Member politicians">
          <h2>Member politicians</h2>
          {partyShell.members.length === 0 ? (
            <>
              <StatusChip status="unknown" prefix="Member politicians" />
              <p>No linked politician roster is available on this page yet.</p>
              <p className="meta-line">Connected politician profiles will appear here when membership records are added.</p>
            </>
          ) : null}
        </article>
      </section>

      <section className="card stack-sm" aria-label="Party-line alignment context">
        <h2>Party-line alignment context</h2>
        <StatusChip status="unknown" prefix="Party-line alignment context" />
        <p>PNYX keeps politician promises, party stances, and party-line comparisons separate.</p>
        <p className="meta-line">
          This page does not show alignment or party-line breaks until the relevant comparison records have been connected.
        </p>
        <div className="card-link-row">
          <Link to="/politicians">Browse politicians</Link>
          <Link to="/methodology">Read methodology</Link>
        </div>
      </section>
    </div>
  );
};
