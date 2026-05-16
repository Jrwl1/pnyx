/* WHAT IT DO? Lets signed-in contributors attach a new sourced statement to an existing politician profile. */

import { useMemo, useState, type FormEvent, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { useAuth } from "../context/AuthContext";
import { usePublicData } from "../context/PublicDataContext";
import { createStatement } from "../lib/api";
import { getPartyAffiliationLabel, getTerritoryLabel } from "../lib/domain";
import { formatIdentityLine } from "../lib/format";
import type { StatementSubmissionResult } from "../types";

export const SubmitStatementPage = (): ReactElement => {
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { politicians, loading, error, refresh } = usePublicData();
  const [politicianId, setPoliticianId] = useState<string>(searchParams.get("politicianId") ?? "");
  const [sourceUrl, setSourceUrl] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [dateSaid, setDateSaid] = useState<string>("");
  const [createdStatement, setCreatedStatement] = useState<StatementSubmissionResult | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sortedPoliticians = useMemo(() => {
    return [...politicians].sort((left, right) => left.name.localeCompare(right.name));
  }, [politicians]);

  const selectedPolitician = useMemo(() => {
    const numericId = Number(politicianId);
    return sortedPoliticians.find((entry) => entry.id === numericId) ?? null;
  }, [politicianId, sortedPoliticians]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!session) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const created = await createStatement(session.token, {
        politicianId: Number(politicianId),
        sourceUrl,
        body,
        dateSaid
      });
      setCreatedStatement(created);
      setSourceUrl("");
      setBody("");
      setDateSaid("");
      await refresh();
    } catch (err) {
      setSubmitError((err as Error).message || "Unable to submit statement.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!session) {
    return <LoadingState label="Restoring contributor session..." />;
  }

  if (loading) {
    return <LoadingState label="Loading politician options..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  return (
    <div className="stack-lg">
      <section className="record-hero">
        <div className="record-hero-main">
          <p className="eyebrow">Contributor lens</p>
          <h1>Add a sourced statement.</h1>
          <p className="lede">Attach a quoted statement to an existing politician. The quote remains separate from reviewed canonical promises.</p>
        </div>
        <aside className="record-facts" aria-label="Statement checklist">
          <div>
            <span>Required</span>
            <strong>Politician</strong>
          </div>
          <div>
            <span>Required</span>
            <strong>Source URL</strong>
          </div>
          <div>
            <span>Required</span>
            <strong>Quote</strong>
          </div>
        </aside>
      </section>

      {createdStatement ? (
        <section className="card stack-sm" aria-live="polite">
          <h2>Statement submitted</h2>
          <p>
            Statement <strong>#{createdStatement.id}</strong> was created with verification status <strong>{createdStatement.verificationStatus}</strong>.
          </p>
          <div className="card-link-row">
            <Link className="button button-secondary" to={`/promises/${createdStatement.id}`}>
              Open promise detail
            </Link>
            {selectedPolitician ? (
              <Link className="button button-link" to={`/politicians/${selectedPolitician.id}`}>
                Return to politician profile
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="card stack-sm">
        {sortedPoliticians.length === 0 ? (
          <div className="stack-sm">
            <h2>No politician profiles available</h2>
            <p>Add or approve a politician profile before attaching new statements.</p>
          </div>
        ) : (
          <form className="stack-sm" onSubmit={(event) => void onSubmit(event)}>
            <div className="controls-grid">
              <label className="field-group" htmlFor="statement-politician">
                <span>Politician</span>
                <select
                  id="statement-politician"
                  className="select-input"
                  value={politicianId}
                  onChange={(event) => setPoliticianId(event.target.value)}
                  required
                >
                  <option value="">Choose a politician</option>
                  {sortedPoliticians.map((entry) => (
                    <option key={entry.id} value={String(entry.id)}>
                      {entry.name} - {formatIdentityLine(entry.office, getTerritoryLabel(entry))} - {getPartyAffiliationLabel(entry)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field-group" htmlFor="statement-source-url">
                <span>Source URL</span>
                <input
                  id="statement-source-url"
                  className="text-input"
                  type="url"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://example.fi/article-or-video"
                  required
                />
              </label>

              <label className="field-group" htmlFor="statement-date-said">
                <span>Date said</span>
                <input
                  id="statement-date-said"
                  className="text-input"
                  type="date"
                  value={dateSaid}
                  onChange={(event) => setDateSaid(event.target.value)}
                  required
                />
              </label>

              <label className="field-group" htmlFor="statement-body">
                <span>Quoted statement</span>
                <textarea
                  id="statement-body"
                  className="text-input text-area-xl"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Paste the promise or statement text exactly as it appears in the source."
                  rows={6}
                  required
                />
              </label>
            </div>

            {selectedPolitician ? (
              <p className="data-note">
                Adding a statement for {selectedPolitician.name} ({getPartyAffiliationLabel(selectedPolitician)}).
              </p>
            ) : (
              <p className="data-note">Choose a politician before submitting. The backend will reject missing or unknown politician IDs.</p>
            )}

            {submitError ? (
              <p className="meta-line" role="alert">
                {submitError}
              </p>
            ) : null}

            <div className="card-link-row">
              <button className="button button-primary" type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit statement"}
              </button>
              {selectedPolitician ? (
                <Link className="button button-link" to={`/politicians/${selectedPolitician.id}`}>
                  Review politician profile
                </Link>
              ) : null}
            </div>
          </form>
        )}
      </section>
    </div>
  );
};
