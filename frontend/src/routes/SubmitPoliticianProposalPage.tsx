/* WHAT IT DO? Lets signed-in contributors submit politician proposals and surfaces duplicate, captcha, and rate-limit feedback honestly. */

import { useState, type FormEvent, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { LoadingState } from "../components/PageState";
import { useAuth } from "../context/AuthContext";
import { submitPoliticianProposal } from "../lib/api";
import type { PoliticianProposalRecord } from "../types";

export const SubmitPoliticianProposalPage = (): ReactElement => {
  const { session } = useAuth();
  const [name, setName] = useState<string>("");
  const [region, setRegion] = useState<string>("");
  const [office, setOffice] = useState<string>("");
  const [externalId, setExternalId] = useState<string>("");
  const [sourceNote, setSourceNote] = useState<string>("");
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [createdProposal, setCreatedProposal] = useState<PoliticianProposalRecord | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!session) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const proposal = await submitPoliticianProposal(session.token, {
        name,
        region: region.trim() || undefined,
        office: office.trim() || undefined,
        externalId: externalId.trim() || undefined,
        sourceNote: sourceNote.trim() || undefined,
        captchaToken: captchaToken.trim() || undefined
      });
      setCreatedProposal(proposal);
      setName("");
      setRegion("");
      setOffice("");
      setExternalId("");
      setSourceNote("");
      setCaptchaToken("");
    } catch (err) {
      setError((err as Error).message || "Unable to submit proposal.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!session) {
    return <LoadingState label="Restoring contributor session..." />;
  }

  return (
    <div className="stack-lg">
      <section className="hero-panel stack-sm">
        <p className="eyebrow">Politician proposal</p>
        <h1>Submit a missing politician profile</h1>
        <p className="lede">
          This route writes to the existing backend proposal queue. If the server blocks a duplicate, captcha, or rate-limit condition, that response is shown directly.
        </p>
      </section>

      {createdProposal ? (
        <section className="card stack-sm" aria-live="polite">
          <h2>Proposal queued</h2>
          <p>
            Proposal <strong>#{createdProposal.id}</strong> is now in the moderation queue with status <strong>{createdProposal.status}</strong>.
          </p>
          <div className="card-link-row">
            <Link className="button button-link" to="/">
              Return home
            </Link>
          </div>
        </section>
      ) : null}

      <section className="card stack-sm">
        <form className="stack-sm" onSubmit={(event) => void onSubmit(event)}>
          <div className="controls-grid">
            <label className="field-group" htmlFor="proposal-name">
              <span>Name</span>
              <input
                id="proposal-name"
                className="text-input"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Politician name"
                required
              />
            </label>

            <label className="field-group" htmlFor="proposal-region">
              <span>Region or constituency</span>
              <input
                id="proposal-region"
                className="text-input"
                type="text"
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                placeholder="For example Helsinki or Uusimaa"
              />
            </label>

            <label className="field-group" htmlFor="proposal-office">
              <span>Office</span>
              <input
                id="proposal-office"
                className="text-input"
                type="text"
                value={office}
                onChange={(event) => setOffice(event.target.value)}
                placeholder="For example MP, Minister, Mayor"
              />
            </label>

            <label className="field-group" htmlFor="proposal-external-id">
              <span>External ID</span>
              <input
                id="proposal-external-id"
                className="text-input"
                type="text"
                value={externalId}
                onChange={(event) => setExternalId(event.target.value)}
                placeholder="Optional source-system identifier"
              />
            </label>

            <label className="field-group" htmlFor="proposal-captcha">
              <span>Captcha token</span>
              <input
                id="proposal-captcha"
                className="text-input"
                type="text"
                value={captchaToken}
                onChange={(event) => setCaptchaToken(event.target.value)}
                placeholder="Required only when proposal CAPTCHA is enabled"
                autoComplete="off"
              />
            </label>

            <label className="field-group" htmlFor="proposal-source-note">
              <span>Source note</span>
              <input
                id="proposal-source-note"
                className="text-input"
                type="text"
                value={sourceNote}
                onChange={(event) => setSourceNote(event.target.value)}
                placeholder="Campaign site, candidate page, news profile, or similar"
              />
            </label>
          </div>

          <p className="data-note">
            Signed in as {session.userId} ({session.role}). The backend will still reject duplicate identities or submissions beyond current rate limits.
          </p>

          {error ? (
            <p className="meta-line" role="alert">
              {error}
            </p>
          ) : null}

          <div className="card-link-row">
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit proposal"}
            </button>
            <Link className="button button-link" to="/contribute/statements/new">
              Add a statement instead
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
};
