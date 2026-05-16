/* WHAT IT DO? Shows a submitted promise claim with duplicate assist and contributor equivalence signaling controls. */

import { useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { useAuth } from "../context/AuthContext";
import {
  getPromiseClaimById,
  getPromiseClaimDuplicateAssist,
  listClaimEquivalenceSignals,
  submitClaimEquivalenceSignal
} from "../lib/api";

export const PromiseClaimDetailPage = (): ReactElement => {
  const { id } = useParams();
  const claimId = Number(id);
  const { session } = useAuth();
  const [claim, setClaim] = useState<Awaited<ReturnType<typeof getPromiseClaimById>>["claim"] | null>(null);
  const [assist, setAssist] = useState<Awaited<ReturnType<typeof getPromiseClaimDuplicateAssist>> | null>(null);
  const [signals, setSignals] = useState<Awaited<ReturnType<typeof listClaimEquivalenceSignals>>["items"]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [signalTarget, setSignalTarget] = useState<string>("");
  const [signalRelation, setSignalRelation] = useState<"same_as" | "non_match">("same_as");
  const [signalReasonCode, setSignalReasonCode] = useState<"same_claim" | "same_promise" | "different_subject" | "different_scope">("same_promise");
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !Number.isFinite(claimId)) {
      return;
    }
    let cancelled = false;
    const load = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const [claimResponse, assistResponse, signalResponse] = await Promise.all([
          getPromiseClaimById(session.token, claimId),
          getPromiseClaimDuplicateAssist(session.token, claimId),
          listClaimEquivalenceSignals(session.token, claimId)
        ]);
        if (!cancelled) {
          setClaim(claimResponse.claim);
          setAssist(assistResponse);
          setSignals(signalResponse.items);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message || "Unable to load promise claim.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [claimId, session]);

  const targetOptions = useMemo(() => {
    if (!assist) {
      return [];
    }
    return [
      ...assist.canonicalMatches.map((match) => ({ value: `canonical_promise:${match.id}`, label: `Canonical: ${match.promiseText}` })),
      ...assist.pendingClaimMatches.map((match) => ({ value: `claim:${match.id}`, label: `Claim: ${match.claimText}` })),
      ...assist.fuzzyHints.canonical.map((match) => ({ value: `canonical_promise:${match.id}`, label: `Canonical hint: ${match.promiseText}` })),
      ...assist.fuzzyHints.pendingClaims.map((match) => ({ value: `claim:${match.id}`, label: `Claim hint: ${match.claimText}` }))
    ];
  }, [assist]);

  const onSignalSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!session || !signalTarget) {
      return;
    }
    const [targetKind, targetIdRaw] = signalTarget.split(":");
    const targetId = Number(targetIdRaw);
    setSubmitError(null);
    try {
      await submitClaimEquivalenceSignal(session.token, claimId, {
        targetKind: targetKind as "canonical_promise" | "claim",
        targetId,
        relation: signalRelation,
        reasonCode: signalReasonCode
      });
      const signalResponse = await listClaimEquivalenceSignals(session.token, claimId);
      setSignals(signalResponse.items);
    } catch (err) {
      setSubmitError((err as Error).message || "Unable to submit equivalence signal.");
    }
  };

  if (!session) {
    return <LoadingState label="Restoring session..." />;
  }

  if (loading) {
    return <LoadingState label="Loading promise claim..." />;
  }

  if (error || !claim) {
    return <ErrorState message={error ?? "Promise claim not found."} />;
  }

  return (
    <div className="stack-lg">
      <section className="record-hero">
        <div className="record-hero-main">
          <p className="eyebrow">Contributor lens</p>
          <h1>Promise claim review record</h1>
          <p className="lede">{claim.claimText}</p>
          <div className="card-link-row">
            <Link to="/contribute/promises/new">Submit another claim</Link>
            <Link to={claim.linkedCanonicalPromiseId ? `/promises/${claim.linkedCanonicalPromiseId}` : "/promises"}>Public promise records</Link>
          </div>
        </div>
        <aside className="record-facts" aria-label="Promise claim status">
          <div>
            <span>Status</span>
            <strong>{claim.status}</strong>
          </div>
          <div>
            <span>Suggestions</span>
            <strong>{targetOptions.length}</strong>
          </div>
          <div>
            <span>Signals</span>
            <strong>{signals.length}</strong>
          </div>
          <div>
            <span>Source</span>
            <strong>{claim.sourceUrl ? "Attached" : "Missing"}</strong>
          </div>
        </aside>
      </section>

      <section className="card stack-sm">
        <h2>Signal equivalence</h2>
        {targetOptions.length === 0 ? (
          <p className="meta-line">No duplicate or equivalence suggestions are available for this claim yet.</p>
        ) : (
          <form className="stack-sm" onSubmit={(event) => void onSignalSubmit(event)}>
            <label className="field-group" htmlFor="claim-target">
              <span>Target</span>
              <select id="claim-target" className="select-input" value={signalTarget} onChange={(event) => setSignalTarget(event.target.value)} required>
                <option value="">Choose a suggested target</option>
                {targetOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-group" htmlFor="claim-relation">
              <span>Relation</span>
              <select id="claim-relation" className="select-input" value={signalRelation} onChange={(event) => setSignalRelation(event.target.value as "same_as" | "non_match")}>
                <option value="same_as">Same as</option>
                <option value="non_match">Non-match</option>
              </select>
            </label>

            <label className="field-group" htmlFor="claim-reason-code">
              <span>Reason code</span>
              <select
                id="claim-reason-code"
                className="select-input"
                value={signalReasonCode}
                onChange={(event) => setSignalReasonCode(event.target.value as "same_claim" | "same_promise" | "different_subject" | "different_scope")}
              >
                <option value="same_promise">same_promise</option>
                <option value="same_claim">same_claim</option>
                <option value="different_subject">different_subject</option>
                <option value="different_scope">different_scope</option>
              </select>
            </label>

            <button className="button button-primary" type="submit">
              Submit equivalence signal
            </button>
            {submitError ? <p className="meta-line" role="alert">{submitError}</p> : null}
          </form>
        )}
      </section>

      <section className="card stack-sm">
        <h2>Current signals</h2>
        {signals.length === 0 ? (
          <p className="meta-line">No equivalence signals have been recorded yet.</p>
        ) : (
          <ul className="timeline-list">
            {signals.map((signal) => (
              <li key={signal.id} className="timeline-item">
                <p>{signal.actorId}</p>
                <p className="meta-line">
                  {signal.relation} to {signal.targetKind}:{signal.targetId}
                </p>
                <p className="meta-line">Reason code: {signal.reasonCode}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card stack-sm">
        <div className="card-link-row">
          <Link to="/contribute/promises/new">Submit another promise claim</Link>
          <Link to={claim.linkedCanonicalPromiseId ? `/promises/${claim.linkedCanonicalPromiseId}` : "/"}>Return to public site</Link>
        </div>
      </section>
    </div>
  );
};
