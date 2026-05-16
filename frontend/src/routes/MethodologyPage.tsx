/* Methodology page for status definitions, evidence standards, uncertainty handling, and update cadence. */

import type { ReactElement } from "react";
import { PageMeta } from "../components/PageMeta";

const SECTION_ORDER = [
  "fulfillment",
  "votes",
  "party-context",
  "evidence",
  "uncertainty",
  "updates"
] as const;

const SECTIONS: Record<
  (typeof SECTION_ORDER)[number],
  { title: string; intro: string; items: Array<{ label?: string; text: string }> }
> = {
  fulfillment: {
    title: "Fulfillment statuses",
    intro: "Fulfillment is based on the latest source-backed assessment record connected to a canonical promise.",
    items: [
      { label: "Fulfilled", text: "The latest assessment record says the promised outcome was delivered and links back to a source." },
      { label: "Broken", text: "The latest assessment record says later evidence contradicts the promise outcome." },
      { label: "In progress", text: "The latest assessment record says delivery work is underway but not complete." },
      { label: "Unknown", text: "No fulfillment assessment has been connected yet, or the latest assessment explicitly stays unknown." }
    ]
  },
  votes: {
    title: "Vote alignment",
    intro: "Vote alignment compares a canonical promise with mapped vote events and the politician's recorded vote on those events.",
    items: [
      { label: "Aligned", text: "Mapped vote events exist and the politician voted in the direction marked as aligned for the promise." },
      { label: "Contradicted", text: "Mapped vote events exist and the politician voted against the direction marked as aligned for the promise." },
      { label: "Mixed", text: "Some mapped vote events align and others contradict the promise." },
      { label: "Unknown", text: "No mapped vote events exist yet, or the politician's vote is missing or marked absent." }
    ]
  },
  "party-context": {
    title: "Party stance and party-line context",
    intro: "Party records and politician records stay separate. Party-line context is shown only when a sourced official stance is explicitly assessed against a promise.",
    items: [
      { label: "Party stance", text: "A sourced official position from a party, with issue text, date, and source link." },
      { label: "Aligned with party line", text: "Shown only when a party-alignment assessment says the promise matches the linked official stance." },
      { label: "Broke party line", text: "Shown only when a party-alignment assessment says the promise conflicts with the linked official stance." },
      { label: "Unknown", text: "Shown when no linked party, no sourced party stance, or no explicit party-alignment assessment exists." }
    ]
  },
  evidence: {
    title: "Evidence standards",
    intro: "Every public promise page should let a reader inspect the source trail for themselves.",
    items: [
      { text: "Every promise record links back to the source material for the original claim." },
      { text: "Fulfillment, vote-alignment, and party-line records must each link back to their own source-backed assessment trail." },
      { text: "Evidence review status is not the same thing as fulfillment." },
      { text: "Community support and oppose totals are sentiment, not voting records and not party stances." }
    ]
  },
  uncertainty: {
    title: "Handling missing data and uncertainty",
    intro: "Unknown is a transparency rule. It is used to avoid fake precision when the record is incomplete.",
    items: [
      { text: "PNYX does not infer fulfillment from evidence-review labels." },
      { text: "PNYX does not infer vote alignment from community sentiment." },
      { text: "PNYX does not infer party stance from branding, rhetoric, or unsourced summaries." },
      { text: "PNYX does not infer party-line alignment when the mapped comparison record is missing." }
    ]
  },
  updates: {
    title: "Change log and update cadence",
    intro: "The public methodology changes when the product definitions or evidence standards change.",
    items: [
      { text: "Public data sync and moderation updates happen continuously as evidence is reviewed." },
      { text: "Methodology text is revised when definitions, schemas, or evidence standards change." },
      { text: "Major methodology updates are tracked in repository docs and release notes." }
    ]
  }
};

const QUICK_RULES = [
  "Promises, mapped vote events, and official party stances are separate signals.",
  "Unknown means the record is incomplete, not hidden.",
  "Every public verdict should be traceable to a source-backed assessment record."
];

export const MethodologyPage = (): ReactElement => {
  return (
    <div className="stack-lg">
      <PageMeta
        title="Methodology | PNYX"
        description="Read how PNYX defines fulfillment, vote alignment, party context, evidence standards, and unknown-state handling."
        path="/methodology"
      />
      <header className="page-heading">
        <h1>Methodology</h1>
      </header>

      <section className="methodology-rules" aria-label="Core methodology rules">
        <ul>
          {QUICK_RULES.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </section>

      <div className="methodology-layout">
        <aside className="card stack-sm methodology-toc" aria-label="Methodology table of contents">
          <p className="mono-inline">On this page</p>
          <nav className="methodology-toc-links">
            {SECTION_ORDER.map((sectionId) => (
              <a key={sectionId} className="methodology-toc-link" href={`#${sectionId}`}>
                {SECTIONS[sectionId].title}
              </a>
            ))}
          </nav>
        </aside>

        <div className="stack-lg">
          {SECTION_ORDER.map((sectionId) => {
            const section = SECTIONS[sectionId];

            return (
              <section key={sectionId} id={sectionId} className="card stack-sm methodology-section" aria-labelledby={`${sectionId}-title`}>
                <h2 id={`${sectionId}-title`}>{section.title}</h2>
                <p>{section.intro}</p>
                <ul className="placeholder-list">
                  {section.items.map((item) => (
                    <li key={`${sectionId}-${item.label ?? item.text}`}>
                      {item.label ? <strong>{item.label}:</strong> : null} {item.text}
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
};
