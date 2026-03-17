/* WHAT IT DO? Lets contributors submit promise-source claims and preview duplicate or equivalence suggestions before queueing. */

import { useMemo, useState, type FormEvent, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { useAuth } from "../context/AuthContext";
import { usePublicData } from "../context/PublicDataContext";
import { previewPromiseClaimDuplicateAssist, submitPromiseClaim } from "../lib/api";
import { getPartyAffiliationLabel, getTerritoryLabel } from "../lib/domain";
import { formatIdentityLine } from "../lib/format";

export const SubmitPromiseClaimPage = (): ReactElement => {
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { politicians, loading, error, refresh } = usePublicData();
  const [politicianId, setPoliticianId] = useState<string>(searchParams.get("politicianId") ?? "");
  const [claimText, setClaimText] = useState<string>("");
  const [sourceUrl, setSourceUrl] = useState<string>("");
  const [dateSaid, setDateSaid] = useState<string>("");
  const [sourceNote, setSourceNote] = useState<string>("");
  const [preview, setPreview] = useState<Awaited<ReturnType<typeof previewPromiseClaimDuplicateAssist>> | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedClaimId, setSubmittedClaimId] = useState<number | null>(null);
  const [previewPending, setPreviewPending] = useState<boolean>(false);
  const [submitPending, setSubmitPending] = useState<boolean>(false);

  const sortedPoliticians = useMemo(() => [...politicians].sort((left, right) => left.name.localeCompare(right.name)), [politicians]);

  const previewAssist = async (): Promise<void> => {
    if (!session || !politicianId || !claimText.trim() || !sourceUrl.trim()) {
      return;
    }
    setPreviewPending(true);
    setPreviewError(null);
    try {
      setPreview(
        await previewPromiseClaimDuplicateAssist(session.token, {
          politicianId: Number(politicianId),
          claimText,
          sourceUrl
        })
      );
    } catch (err) {
      setPreviewError((err as Error).message || "Unable to load duplicate assist preview.");
    } finally {
      setPreviewPending(false);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!session) {
      return;
    }
    setSubmitPending(true);
    setSubmitError(null);
    try {
      const claim = await submitPromiseClaim(session.token, {
        politicianId: Number(politicianId),
        claimText,
        sourceUrl,
        dateSaid,
        sourceNote: sourceNote || undefined
      });
      setSubmittedClaimId(claim.id);
    } catch (err) {
      setSubmitError((err as Error).message || "Unable to submit promise claim.");
    } finally {
      setSubmitPending(false);
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
      <section className="hero-panel stack-sm">
        <p className="eyebrow">Promise source claim</p>
        <h1>Submit a source-backed promise claim</h1>
        <p className="lede">
          Contributors can propose a source-backed promise record here before moderation merges it into an existing canonical promise or canonizes a new one.
        </p>
      </section>

      {submittedClaimId ? (
        <section className="card stack-sm" aria-live="polite">
          <h2>Claim queued</h2>
          <p>Promise claim #{submittedClaimId} is now pending moderation.</p>
          <div className="card-link-row">
            <Link className="button button-primary" to={`/claims/${submittedClaimId}`}>
              Open claim detail
            </Link>
          </div>
        </section>
      ) : null}

      <section className="card stack-sm">
        <form className="stack-sm" onSubmit={(event) => void onSubmit(event)}>
          <div className="controls-grid">
            <label className="field-group" htmlFor="claim-politician">
              <span>Politician</span>
              <select id="claim-politician" className="select-input" value={politicianId} onChange={(event) => setPoliticianId(event.target.value)} required>
                <option value="">Choose a politician</option>
                {sortedPoliticians.map((politician) => (
                  <option key={politician.id} value={String(politician.id)}>
                    {politician.name} - {formatIdentityLine(politician.office, getTerritoryLabel(politician))} - {getPartyAffiliationLabel(politician)}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group" htmlFor="claim-source">
              <span>Source URL</span>
              <input id="claim-source" className="text-input" type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} required />
            </label>

            <label className="field-group" htmlFor="claim-date">
              <span>Date said</span>
              <input id="claim-date" className="text-input" type="date" value={dateSaid} onChange={(event) => setDateSaid(event.target.value)} required />
            </label>

            <label className="field-group" htmlFor="claim-text">
              <span>Claim text</span>
              <textarea id="claim-text" className="text-input" value={claimText} onChange={(event) => setClaimText(event.target.value)} rows={5} style={{ minHeight: "160px", padding: "12px" }} required />
            </label>

            <label className="field-group" htmlFor="claim-note">
              <span>Source note</span>
              <input id="claim-note" className="text-input" type="text" value={sourceNote} onChange={(event) => setSourceNote(event.target.value)} />
            </label>
          </div>

          <div className="card-link-row">
            <button className="button button-secondary" type="button" disabled={previewPending} onClick={() => void previewAssist()}>
              {previewPending ? "Checking..." : "Check duplicates first"}
            </button>
            <button className="button button-primary" type="submit" disabled={submitPending}>
              {submitPending ? "Submitting..." : "Submit claim"}
            </button>
          </div>

          {previewError ? <p className="meta-line" role="alert">{previewError}</p> : null}
          {submitError ? <p className="meta-line" role="alert">{submitError}</p> : null}
        </form>
      </section>

      {preview ? (
        <section className="card stack-sm">
          <h2>Duplicate and equivalence suggestions</h2>
          <p className="meta-line">Review these before sending the claim into moderation.</p>
          <div className="stack-sm">
            <div>
              <h3>Canonical matches</h3>
              {preview.canonicalMatches.length === 0 ? (
                <p className="meta-line">No exact canonical matches.</p>
              ) : (
                <ul className="timeline-list">
                  {preview.canonicalMatches.map((match) => (
                    <li key={`canonical-${match.id}`} className="timeline-item">
                      <p>{match.promiseText}</p>
                      <p className="meta-line">Sources {match.acceptedSourceCount} · State {match.publicStatus}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3>Pending claim matches</h3>
              {preview.pendingClaimMatches.length === 0 ? (
                <p className="meta-line">No exact pending claim matches.</p>
              ) : (
                <ul className="timeline-list">
                  {preview.pendingClaimMatches.map((match) => (
                    <li key={`claim-${match.id}`} className="timeline-item">
                      <p>{match.claimText}</p>
                      <p className="meta-line">{match.sourceUrl}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
};
