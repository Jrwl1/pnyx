/* Methodology page for status definitions, evidence standards, uncertainty handling, and update cadence. */

import type { ReactElement } from "react";

export const MethodologyPage = (): ReactElement => {
  return (
    <div className="stack-lg">
      <section className="hero-panel stack-sm">
        <p className="eyebrow">Methodology</p>
        <h1>How PNYX evaluates promises, party context, evidence, and uncertainty</h1>
        <p className="lede">This page explains what each public status means, what counts as evidence, and how missing information is handled.</p>
      </section>

      <section className="card stack-sm">
        <h2>Fulfillment status definitions</h2>
        <ul>
          <li>
            <strong>Fulfilled:</strong> Available evidence shows the promise outcome was delivered.
          </li>
          <li>
            <strong>Broken:</strong> Available evidence shows outcomes contradict the promise.
          </li>
          <li>
            <strong>In progress:</strong> Evidence suggests partial implementation with outstanding commitments.
          </li>
          <li>
            <strong>Unknown:</strong> Data not yet available, inconsistent, or insufficient for a verdict.
          </li>
        </ul>
      </section>

      <section className="card stack-sm">
        <h2>Vote-alignment status definitions</h2>
        <ul>
          <li>
            <strong>Aligned:</strong> Recorded votes support the promise direction.
          </li>
          <li>
            <strong>Contradicted:</strong> Recorded votes conflict with the promise direction.
          </li>
          <li>
            <strong>Mixed:</strong> Voting behavior supports and contradicts the promise in different events.
          </li>
          <li>
            <strong>Unknown:</strong> No verified roll-call vote mapping is available.
          </li>
        </ul>
      </section>

      <section className="card stack-sm">
        <h2>Party stance and party-line definitions</h2>
        <ul>
          <li>
            <strong>Party stance:</strong> A sourced official position from a political party. It is separate from the personal stance of an individual politician.
          </li>
          <li>
            <strong>Aligned with party line:</strong> PNYX shows this only when a politician action can be mapped against a sourced party stance in the same direction.
          </li>
          <li>
            <strong>Broke party line:</strong> PNYX shows this only when a sourced party stance and a mapped politician action point in opposite directions.
          </li>
          <li>
            <strong>Unknown:</strong> No linked party, no sourced party stance, or no mapped comparison record is available.
          </li>
        </ul>
      </section>

      <section className="card stack-sm">
        <h2>Evidence quality rules</h2>
        <ul>
          <li>Every promise record links to source material for the original claim.</li>
          <li>Evidence quality depends on source credibility, date clarity, and traceable attribution.</li>
          <li>Community support and oppose totals represent sentiment, not formal legislative voting records or party stance evidence.</li>
        </ul>
      </section>

      <section className="card stack-sm">
        <h2>Handling missing data and uncertainty</h2>
        <ul>
          <li>Unknown means the evidence is missing, incomplete, inconsistent, or not yet assessed.</li>
          <li>PNYX does not treat evidence review status as proof of fulfillment.</li>
          <li>Community sentiment does not count as a voting record or a party stance.</li>
          <li>Party stance is shown only when a sourced party position is connected.</li>
          <li>Party-line alignment is shown only when the relevant comparison record exists.</li>
        </ul>
      </section>

      <section className="card stack-sm">
        <h2>Change log and update cadence</h2>
        <ul>
          <li>Public data sync and moderation updates occur continuously as evidence is reviewed.</li>
          <li>Methodology text is revised when definitions, schemas, or evidence standards change.</li>
          <li>Major methodology updates are tracked in repository docs and release notes.</li>
        </ul>
      </section>
    </div>
  );
};
