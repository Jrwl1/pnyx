/* WHAT IT DO? Documents V3 methodology: status definitions, evidence standards, uncertainty handling, and update cadence. */

import type { ReactElement } from "react";

export const MethodologyPage = (): ReactElement => {
  return (
    <div className="stack-lg">
      <section className="hero-panel stack-sm">
        <p className="eyebrow">Methodology</p>
        <h1>How PNYX evaluates promises, evidence, and uncertainty</h1>
        <p className="lede">This page explains the logic behind every public status shown in the accountability views.</p>
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
        <h2>Evidence quality rules</h2>
        <ul>
          <li>Every promise record links to source material for the original claim.</li>
          <li>Evidence quality depends on source credibility, date clarity, and traceable attribution.</li>
          <li>Community support and oppose totals represent sentiment, not formal legislative voting records.</li>
        </ul>
      </section>

      <section className="card stack-sm">
        <h2>Handling missing data and uncertainty</h2>
        <ul>
          <li>When fulfillment fields are absent, PNYX shows Unknown with the explicit label Data not yet available.</li>
          <li>PNYX does not infer fulfillment from evidence verification status.</li>
          <li>PNYX does not infer vote alignment from community support or oppose aggregates.</li>
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
