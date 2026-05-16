/* WHAT IT DO? Renders reviewed page readiness without mixing it with canonical facts or comments. */

import { Link } from "react-router-dom";
import { formatDate, formatDateTime } from "../lib/format";
import type { PageReadiness, PageReadinessState } from "../types";

const READINESS_LABELS: Record<PageReadinessState, string> = {
  ready: "Ready",
  thin_but_honest: "Thin but honest",
  not_ready: "Not ready"
};

const READINESS_DESCRIPTIONS: Record<PageReadinessState, string> = {
  ready: "Reviewed for public traffic against the current page checklist.",
  thin_but_honest: "Public, but still missing clearly identified source-backed coverage.",
  not_ready: "Needs review before this page should be treated as broadly complete."
};

const MISSING_DATA_LABELS: Record<string, string> = {
  accepted_sources: "Accepted source bundle",
  fulfillment_evidence: "Fulfillment evidence",
  membership_coverage: "Membership coverage",
  party_stances: "Party stance coverage",
  promise_coverage: "Promise coverage",
  readiness_review: "Readiness review",
  source_conflict: "Source conflict review",
  vote_alignment: "Vote alignment evidence"
};

const formatMissingDataKey = (key: string): string => {
  return MISSING_DATA_LABELS[key] ?? key.replace(/_/g, " ");
};

export const PageReadinessPanel = ({
  readiness,
  contributionHref
}: {
  readiness: PageReadiness;
  contributionHref: string;
}): JSX.Element => {
  return (
    <section className="readiness-panel stack-sm" aria-label="Page readiness">
      <div className="readiness-panel-header">
        <div>
          <h2>Page readiness</h2>
          <p className="meta-line">{READINESS_DESCRIPTIONS[readiness.readinessState]}</p>
        </div>
        <span className="readiness-state" data-state={readiness.readinessState}>
          {READINESS_LABELS[readiness.readinessState]}
        </span>
      </div>

      <dl className="readiness-facts">
        <div>
          <dt>Sources</dt>
          <dd>{readiness.sourceCount}</dd>
        </div>
        <div>
          <dt>Freshness checked</dt>
          <dd>{formatDate(readiness.freshnessCheckedAt)}</dd>
        </div>
        <div>
          <dt>Reviewed</dt>
          <dd>{formatDateTime(readiness.reviewedAt)}</dd>
        </div>
      </dl>

      <p>{readiness.provenanceSummary}</p>

      <div className="readiness-missing">
        <h3>Missing or stale coverage</h3>
        {readiness.missingDataKeys.length === 0 ? (
          <p className="meta-line">No missing-data reasons are recorded for this page.</p>
        ) : (
          <ul>
            {readiness.missingDataKeys.map((key) => (
              <li key={key}>{formatMissingDataKey(key)}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="card-link-row">
        <Link className="button button-secondary" to={contributionHref}>
          Submit source-backed evidence
        </Link>
      </div>
    </section>
  );
};
