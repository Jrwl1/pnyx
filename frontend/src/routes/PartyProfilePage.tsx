/* WHAT IT DO? Implements a Finland-first party profile route shell with explicit unknown states until backend party APIs exist. */

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
        <h1>Party route shell not found</h1>
        <p>The requested party id does not match a frontend-local placeholder route.</p>
        <p className="meta-line">Canonical party ids and backend lookups are not connected yet.</p>
        <Link to="/parties">Back to party directory</Link>
      </section>
    );
  }

  return (
    <div className="stack-lg">
      <section className="hero-panel stack-sm">
        <p className="eyebrow">Party profile</p>
        <h1>{partyShell.party.name}</h1>
        <p className="meta-line mono-inline">Short name: {partyShell.party.shortName}</p>
        <p className="lede">{partyShell.party.contextLine}</p>
      </section>

      <section className="scorecards-grid" aria-label="Party summary cards">
        <article className="card scorecard">
          <h2>Official stances tracked</h2>
          <p className="score-value">{formatUnknownCount(partyShell.officialStancesTracked)}</p>
          <p className="meta-line">No canonical stance feed connected yet.</p>
        </article>
        <article className="card scorecard">
          <h2>Members on PNYX</h2>
          <p className="score-value">{formatUnknownCount(partyShell.membersOnPnyx)}</p>
          <p className="meta-line">Member mappings stay Unknown until party memberships ship.</p>
        </article>
        <article className="card scorecard">
          <h2>Party-line summary</h2>
          <p className="score-value">Unknown</p>
          <p className="meta-line">PNYX does not infer party-line behavior without mapped stance and vote records.</p>
        </article>
      </section>

      <section className="card stack-sm" aria-label="What is available">
        <h2>What is available right now</h2>
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
              <p>No party stance records are published in the connected public API yet.</p>
              <p className="meta-line">When stance records exist, this section will show issue, source, and date.</p>
            </>
          ) : null}
        </article>

        <article className="card stack-sm" aria-label="Member politicians">
          <h2>Member politicians</h2>
          {partyShell.members.length === 0 ? (
            <>
              <StatusChip status="unknown" prefix="Member politicians" />
              <p>No member-politician roster is available from the current public backend.</p>
              <p className="meta-line">Linked politician profiles will appear here once memberships are exposed.</p>
            </>
          ) : null}
        </article>
      </section>

      <section className="card stack-sm" aria-label="Party-line alignment context">
        <h2>Party-line alignment context</h2>
        <StatusChip status="unknown" prefix="Party-line alignment context" />
        <p>PNYX keeps politician stance, party stance, and party-line comparison separate.</p>
        <p className="meta-line">
          No mapped party stance source or politician-vs-party comparison records are available yet, so this page does not imply alignment or a party-line break.
        </p>
        <div className="card-link-row">
          <Link to="/politicians">Browse politicians</Link>
          <Link to="/methodology">Read the methodology</Link>
        </div>
      </section>
    </div>
  );
};
