/* WHAT IT DO? Provides protected editorial forms for launch-critical party, vote, fulfillment, and alignment records plus coverage metrics. */

import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { useAuth } from "../context/AuthContext";
import {
  createFulfillmentAssessment,
  createPartyAlignment,
  createPartyStance,
  createVoteEvent,
  createVoteEventRecord,
  getLaunchCoverage,
  getPartyStances,
  listCanonicalPromises,
  listParties,
  listPoliticians,
  listVoteEvents
} from "../lib/api";
import { formatDateTime } from "../lib/format";
import type {
  BackendPartyStance,
  CanonicalPromiseSummary,
  LaunchCoverageSummary,
  Politician,
  VoteEventSummary
} from "../types";

const asPositiveInt = (value: string): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const OpsRecordsPage = (): ReactElement => {
  const { session } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [coverage, setCoverage] = useState<LaunchCoverageSummary | null>(null);
  const [parties, setParties] = useState<Awaited<ReturnType<typeof listParties>>>([]);
  const [politicians, setPoliticians] = useState<Politician[]>([]);
  const [canonicalPromises, setCanonicalPromises] = useState<CanonicalPromiseSummary[]>([]);
  const [voteEvents, setVoteEvents] = useState<VoteEventSummary[]>([]);
  const [allPartyStances, setAllPartyStances] = useState<BackendPartyStance[]>([]);

  const [partyStanceForm, setPartyStanceForm] = useState({
    partyId: "",
    issue: "",
    stanceText: "",
    sourceUrl: "",
    sourceNote: "",
    dateSaid: ""
  });
  const [voteEventForm, setVoteEventForm] = useState({
    externalKey: "",
    issue: "",
    title: "",
    sourceUrl: "",
    sourceNote: "",
    eventDate: "",
    institutionName: "Eduskunta",
    countryCode: "FI"
  });
  const [voteRecordForm, setVoteRecordForm] = useState({
    voteEventId: "",
    politicianId: "",
    voteValue: "for" as "for" | "against" | "abstain" | "absent",
    sourceNote: ""
  });
  const [fulfillmentForm, setFulfillmentForm] = useState({
    canonicalPromiseId: "",
    status: "unknown" as "fulfilled" | "broken" | "in_progress" | "unknown",
    summary: "",
    sourceUrl: "",
    sourceNote: "",
    evidenceDate: ""
  });
  const [partyAlignmentForm, setPartyAlignmentForm] = useState({
    canonicalPromiseId: "",
    partyId: "",
    partyStanceId: "",
    status: "aligned" as "aligned" | "broke_party_line",
    reason: ""
  });

  const loadData = async (): Promise<void> => {
    if (!session) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [coverageResponse, partyList, politicianList, canonicalList, voteEventList] = await Promise.all([
        getLaunchCoverage(session.token),
        listParties(),
        listPoliticians(),
        listCanonicalPromises(undefined, session.token),
        listVoteEvents()
      ]);
      const stanceLists = await Promise.all(partyList.map((party) => getPartyStances(party.id)));

      setCoverage(coverageResponse);
      setParties(partyList);
      setPoliticians(politicianList);
      setCanonicalPromises(canonicalList);
      setVoteEvents(voteEventList);
      setAllPartyStances(stanceLists.flat());
    } catch (err) {
      setError((err as Error).message || "Unable to load editorial records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [session]);

  const runAction = async (operation: () => Promise<void>, successMessage: string): Promise<void> => {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await operation();
      setMessage(successMessage);
      await loadData();
    } catch (err) {
      setError((err as Error).message || "Unable to save editorial record.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!session) {
    return <LoadingState label="Restoring moderator session..." />;
  }

  if (loading) {
    return <LoadingState label="Loading editorial operations..." />;
  }

  if (error && !coverage) {
    return <ErrorState message={error} onRetry={() => void loadData()} />;
  }

  const filteredStances = partyAlignmentForm.partyId
    ? allPartyStances.filter((stance) => stance.partyId === partyAlignmentForm.partyId)
    : allPartyStances;

  return (
    <div className="stack-lg">
      <section className="hero-panel stack-sm">
        <p className="eyebrow">Editorial operations</p>
        <h1>Launch-critical record maintenance</h1>
        <div className="card-link-row">
          <Link to="/ops">Open politician proposal queue</Link>
          <Link to="/ops/claims">Open promise claim queue</Link>
        </div>
      </section>

      {coverage ? (
        <section className="cards-grid cards-grid-3" aria-label="Launch coverage">
          <article className="card stack-xs">
            <h2>Party stance coverage</h2>
            <p className="score-value">
              {coverage.parties.withStances} / {coverage.parties.total}
            </p>
            <p className="meta-line">Canonical parties with at least one official stance record.</p>
          </article>
          <article className="card stack-xs">
            <h2>Membership coverage</h2>
            <p className="score-value">
              {coverage.politicians.withCurrentMembership} / {coverage.politicians.total}
            </p>
            <p className="meta-line">Politicians with a current party membership linked.</p>
          </article>
          <article className="card stack-xs">
            <h2>Public promise coverage</h2>
            <p className="score-value">{coverage.canonicalPromises.publicTotal}</p>
            <p className="meta-line">
              Fulfillment {coverage.canonicalPromises.withFulfillment} · Vote links {coverage.canonicalPromises.withVoteLinks} · Party alignment{" "}
              {coverage.canonicalPromises.withPartyAlignment}
            </p>
          </article>
        </section>
      ) : null}

      {message ? <p className="meta-line">{message}</p> : null}
      {error ? (
        <p className="meta-line" role="alert">
          {error}
        </p>
      ) : null}

      <section className="split-grid">
        <article className="card stack-sm">
          <h2>Add party stance</h2>
          <form
            className="stack-sm"
            onSubmit={(event) => {
              event.preventDefault();
              void runAction(async () => {
                await createPartyStance(session.token, {
                  partyId: partyStanceForm.partyId,
                  issue: partyStanceForm.issue || undefined,
                  stanceText: partyStanceForm.stanceText,
                  sourceUrl: partyStanceForm.sourceUrl,
                  sourceNote: partyStanceForm.sourceNote || undefined,
                  dateSaid: partyStanceForm.dateSaid
                });
                setPartyStanceForm({
                  partyId: "",
                  issue: "",
                  stanceText: "",
                  sourceUrl: "",
                  sourceNote: "",
                  dateSaid: ""
                });
              }, "Party stance recorded.");
            }}
          >
            <div className="controls-grid">
              <label className="field-group" htmlFor="ops-record-party">
                <span>Party</span>
                <select
                  id="ops-record-party"
                  className="select-input"
                  value={partyStanceForm.partyId}
                  onChange={(event) => setPartyStanceForm((current) => ({ ...current, partyId: event.target.value }))}
                  required
                >
                  <option value="">Choose party</option>
                  {parties.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.shortName} - {party.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-group" htmlFor="ops-record-party-issue">
                <span>Issue</span>
                <input
                  id="ops-record-party-issue"
                  className="text-input"
                  type="text"
                  value={partyStanceForm.issue}
                  onChange={(event) => setPartyStanceForm((current) => ({ ...current, issue: event.target.value }))}
                />
              </label>
              <label className="field-group" htmlFor="ops-record-party-date">
                <span>Date</span>
                <input
                  id="ops-record-party-date"
                  className="text-input"
                  type="date"
                  value={partyStanceForm.dateSaid}
                  onChange={(event) => setPartyStanceForm((current) => ({ ...current, dateSaid: event.target.value }))}
                  required
                />
              </label>
            </div>
            <label className="field-group" htmlFor="ops-record-party-text">
              <span>Stance text</span>
              <textarea
                id="ops-record-party-text"
                className="text-input"
                rows={4}
                style={{ minHeight: "132px", padding: "12px" }}
                value={partyStanceForm.stanceText}
                onChange={(event) => setPartyStanceForm((current) => ({ ...current, stanceText: event.target.value }))}
                required
              />
            </label>
            <div className="controls-grid">
              <label className="field-group" htmlFor="ops-record-party-url">
                <span>Source URL</span>
                <input
                  id="ops-record-party-url"
                  className="text-input"
                  type="url"
                  value={partyStanceForm.sourceUrl}
                  onChange={(event) => setPartyStanceForm((current) => ({ ...current, sourceUrl: event.target.value }))}
                  required
                />
              </label>
              <label className="field-group" htmlFor="ops-record-party-note">
                <span>Source note</span>
                <input
                  id="ops-record-party-note"
                  className="text-input"
                  type="text"
                  value={partyStanceForm.sourceNote}
                  onChange={(event) => setPartyStanceForm((current) => ({ ...current, sourceNote: event.target.value }))}
                />
              </label>
            </div>
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save party stance"}
            </button>
          </form>
        </article>

        <article className="card stack-sm">
          <h2>Add vote event</h2>
          <form
            className="stack-sm"
            onSubmit={(event) => {
              event.preventDefault();
              void runAction(async () => {
                await createVoteEvent(session.token, {
                  externalKey: voteEventForm.externalKey || undefined,
                  countryCode: voteEventForm.countryCode || undefined,
                  institutionName: voteEventForm.institutionName || undefined,
                  issue: voteEventForm.issue || undefined,
                  title: voteEventForm.title,
                  sourceUrl: voteEventForm.sourceUrl,
                  sourceNote: voteEventForm.sourceNote || undefined,
                  eventDate: voteEventForm.eventDate
                });
                setVoteEventForm({
                  externalKey: "",
                  issue: "",
                  title: "",
                  sourceUrl: "",
                  sourceNote: "",
                  eventDate: "",
                  institutionName: "Eduskunta",
                  countryCode: "FI"
                });
              }, "Vote event recorded.");
            }}
          >
            <div className="controls-grid">
              <label className="field-group" htmlFor="ops-vote-title">
                <span>Title</span>
                <input
                  id="ops-vote-title"
                  className="text-input"
                  type="text"
                  value={voteEventForm.title}
                  onChange={(event) => setVoteEventForm((current) => ({ ...current, title: event.target.value }))}
                  required
                />
              </label>
              <label className="field-group" htmlFor="ops-vote-issue">
                <span>Issue</span>
                <input
                  id="ops-vote-issue"
                  className="text-input"
                  type="text"
                  value={voteEventForm.issue}
                  onChange={(event) => setVoteEventForm((current) => ({ ...current, issue: event.target.value }))}
                />
              </label>
              <label className="field-group" htmlFor="ops-vote-date">
                <span>Event date</span>
                <input
                  id="ops-vote-date"
                  className="text-input"
                  type="date"
                  value={voteEventForm.eventDate}
                  onChange={(event) => setVoteEventForm((current) => ({ ...current, eventDate: event.target.value }))}
                  required
                />
              </label>
            </div>
            <div className="controls-grid">
              <label className="field-group" htmlFor="ops-vote-url">
                <span>Source URL</span>
                <input
                  id="ops-vote-url"
                  className="text-input"
                  type="url"
                  value={voteEventForm.sourceUrl}
                  onChange={(event) => setVoteEventForm((current) => ({ ...current, sourceUrl: event.target.value }))}
                  required
                />
              </label>
              <label className="field-group" htmlFor="ops-vote-note">
                <span>Source note</span>
                <input
                  id="ops-vote-note"
                  className="text-input"
                  type="text"
                  value={voteEventForm.sourceNote}
                  onChange={(event) => setVoteEventForm((current) => ({ ...current, sourceNote: event.target.value }))}
                />
              </label>
            </div>
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save vote event"}
            </button>
          </form>
        </article>
      </section>

      <section className="split-grid">
        <article className="card stack-sm">
          <h2>Add vote record</h2>
          <form
            className="stack-sm"
            onSubmit={(event) => {
              event.preventDefault();
              const voteEventId = asPositiveInt(voteRecordForm.voteEventId);
              const politicianId = asPositiveInt(voteRecordForm.politicianId);
              if (!voteEventId || !politicianId) {
                setError("Vote record requires a vote event and politician.");
                return;
              }
              void runAction(async () => {
                await createVoteEventRecord(session.token, voteEventId, {
                  politicianId,
                  voteValue: voteRecordForm.voteValue,
                  sourceNote: voteRecordForm.sourceNote || undefined
                });
                setVoteRecordForm({
                  voteEventId: "",
                  politicianId: "",
                  voteValue: "for",
                  sourceNote: ""
                });
              }, "Vote record recorded.");
            }}
          >
            <div className="controls-grid">
              <label className="field-group" htmlFor="ops-vote-record-event">
                <span>Vote event</span>
                <select
                  id="ops-vote-record-event"
                  className="select-input"
                  value={voteRecordForm.voteEventId}
                  onChange={(event) => setVoteRecordForm((current) => ({ ...current, voteEventId: event.target.value }))}
                  required
                >
                  <option value="">Choose vote event</option>
                  {voteEvents.map((event) => (
                    <option key={event.id} value={String(event.id)}>
                      {event.title} ({event.eventDate})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-group" htmlFor="ops-vote-record-politician">
                <span>Politician</span>
                <select
                  id="ops-vote-record-politician"
                  className="select-input"
                  value={voteRecordForm.politicianId}
                  onChange={(event) => setVoteRecordForm((current) => ({ ...current, politicianId: event.target.value }))}
                  required
                >
                  <option value="">Choose politician</option>
                  {politicians.map((politician) => (
                    <option key={politician.id} value={String(politician.id)}>
                      {politician.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-group" htmlFor="ops-vote-record-value">
                <span>Vote value</span>
                <select
                  id="ops-vote-record-value"
                  className="select-input"
                  value={voteRecordForm.voteValue}
                  onChange={(event) =>
                    setVoteRecordForm((current) => ({
                      ...current,
                      voteValue: event.target.value as "for" | "against" | "abstain" | "absent"
                    }))
                  }
                >
                  <option value="for">for</option>
                  <option value="against">against</option>
                  <option value="abstain">abstain</option>
                  <option value="absent">absent</option>
                </select>
              </label>
            </div>
            <label className="field-group" htmlFor="ops-vote-record-note">
              <span>Source note</span>
              <input
                id="ops-vote-record-note"
                className="text-input"
                type="text"
                value={voteRecordForm.sourceNote}
                onChange={(event) => setVoteRecordForm((current) => ({ ...current, sourceNote: event.target.value }))}
              />
            </label>
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save vote record"}
            </button>
          </form>
        </article>

        <article className="card stack-sm">
          <h2>Add fulfillment assessment</h2>
          <form
            className="stack-sm"
            onSubmit={(event) => {
              event.preventDefault();
              const canonicalPromiseId = asPositiveInt(fulfillmentForm.canonicalPromiseId);
              if (!canonicalPromiseId) {
                setError("Fulfillment assessment requires a canonical promise.");
                return;
              }
              void runAction(async () => {
                await createFulfillmentAssessment(session.token, canonicalPromiseId, {
                  status: fulfillmentForm.status,
                  summary: fulfillmentForm.summary,
                  sourceUrl: fulfillmentForm.sourceUrl,
                  sourceNote: fulfillmentForm.sourceNote || undefined,
                  evidenceDate: fulfillmentForm.evidenceDate
                });
                setFulfillmentForm({
                  canonicalPromiseId: "",
                  status: "unknown",
                  summary: "",
                  sourceUrl: "",
                  sourceNote: "",
                  evidenceDate: ""
                });
              }, "Fulfillment assessment recorded.");
            }}
          >
            <div className="controls-grid">
              <label className="field-group" htmlFor="ops-fulfillment-promise">
                <span>Canonical promise</span>
                <select
                  id="ops-fulfillment-promise"
                  className="select-input"
                  value={fulfillmentForm.canonicalPromiseId}
                  onChange={(event) => setFulfillmentForm((current) => ({ ...current, canonicalPromiseId: event.target.value }))}
                  required
                >
                  <option value="">Choose canonical promise</option>
                  {canonicalPromises.map((promise) => (
                    <option key={promise.id} value={String(promise.id)}>
                      {promise.promiseText}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-group" htmlFor="ops-fulfillment-status">
                <span>Status</span>
                <select
                  id="ops-fulfillment-status"
                  className="select-input"
                  value={fulfillmentForm.status}
                  onChange={(event) =>
                    setFulfillmentForm((current) => ({
                      ...current,
                      status: event.target.value as "fulfilled" | "broken" | "in_progress" | "unknown"
                    }))
                  }
                >
                  <option value="fulfilled">fulfilled</option>
                  <option value="broken">broken</option>
                  <option value="in_progress">in_progress</option>
                  <option value="unknown">unknown</option>
                </select>
              </label>
              <label className="field-group" htmlFor="ops-fulfillment-date">
                <span>Evidence date</span>
                <input
                  id="ops-fulfillment-date"
                  className="text-input"
                  type="date"
                  value={fulfillmentForm.evidenceDate}
                  onChange={(event) => setFulfillmentForm((current) => ({ ...current, evidenceDate: event.target.value }))}
                  required
                />
              </label>
            </div>
            <label className="field-group" htmlFor="ops-fulfillment-summary">
              <span>Summary</span>
              <textarea
                id="ops-fulfillment-summary"
                className="text-input"
                rows={4}
                style={{ minHeight: "132px", padding: "12px" }}
                value={fulfillmentForm.summary}
                onChange={(event) => setFulfillmentForm((current) => ({ ...current, summary: event.target.value }))}
                required
              />
            </label>
            <div className="controls-grid">
              <label className="field-group" htmlFor="ops-fulfillment-url">
                <span>Source URL</span>
                <input
                  id="ops-fulfillment-url"
                  className="text-input"
                  type="url"
                  value={fulfillmentForm.sourceUrl}
                  onChange={(event) => setFulfillmentForm((current) => ({ ...current, sourceUrl: event.target.value }))}
                  required
                />
              </label>
              <label className="field-group" htmlFor="ops-fulfillment-note">
                <span>Source note</span>
                <input
                  id="ops-fulfillment-note"
                  className="text-input"
                  type="text"
                  value={fulfillmentForm.sourceNote}
                  onChange={(event) => setFulfillmentForm((current) => ({ ...current, sourceNote: event.target.value }))}
                />
              </label>
            </div>
            <button className="button button-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving..." : "Save fulfillment assessment"}
            </button>
          </form>
        </article>
      </section>

      <section className="card stack-sm">
        <h2>Add party-line assessment</h2>
        <form
          className="stack-sm"
          onSubmit={(event) => {
            event.preventDefault();
            const canonicalPromiseId = asPositiveInt(partyAlignmentForm.canonicalPromiseId);
            const partyStanceId = asPositiveInt(partyAlignmentForm.partyStanceId);
            if (!canonicalPromiseId || !partyStanceId) {
              setError("Party-line assessment requires a canonical promise and party stance.");
              return;
            }
            void runAction(async () => {
              await createPartyAlignment(session.token, canonicalPromiseId, {
                partyStanceId,
                status: partyAlignmentForm.status,
                reason: partyAlignmentForm.reason || undefined
              });
              setPartyAlignmentForm({
                canonicalPromiseId: "",
                partyId: "",
                partyStanceId: "",
                status: "aligned",
                reason: ""
              });
            }, "Party-line assessment recorded.");
          }}
        >
          <div className="controls-grid">
            <label className="field-group" htmlFor="ops-alignment-promise">
              <span>Canonical promise</span>
              <select
                id="ops-alignment-promise"
                className="select-input"
                value={partyAlignmentForm.canonicalPromiseId}
                onChange={(event) => setPartyAlignmentForm((current) => ({ ...current, canonicalPromiseId: event.target.value }))}
                required
              >
                <option value="">Choose canonical promise</option>
                {canonicalPromises.map((promise) => (
                  <option key={promise.id} value={String(promise.id)}>
                    {promise.promiseText}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-group" htmlFor="ops-alignment-party">
              <span>Party</span>
              <select
                id="ops-alignment-party"
                className="select-input"
                value={partyAlignmentForm.partyId}
                onChange={(event) =>
                  setPartyAlignmentForm((current) => ({
                    ...current,
                    partyId: event.target.value,
                    partyStanceId: ""
                  }))
                }
              >
                <option value="">Any party</option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.shortName} - {party.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-group" htmlFor="ops-alignment-stance">
              <span>Party stance</span>
              <select
                id="ops-alignment-stance"
                className="select-input"
                value={partyAlignmentForm.partyStanceId}
                onChange={(event) => setPartyAlignmentForm((current) => ({ ...current, partyStanceId: event.target.value }))}
                required
              >
                <option value="">Choose party stance</option>
                {filteredStances.map((stance) => (
                  <option key={stance.id} value={String(stance.id)}>
                    {(stance.issue ?? "General")} - {stance.stanceText.slice(0, 80)}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-group" htmlFor="ops-alignment-status">
              <span>Status</span>
              <select
                id="ops-alignment-status"
                className="select-input"
                value={partyAlignmentForm.status}
                onChange={(event) =>
                  setPartyAlignmentForm((current) => ({
                    ...current,
                    status: event.target.value as "aligned" | "broke_party_line"
                  }))
                }
              >
                <option value="aligned">aligned</option>
                <option value="broke_party_line">broke_party_line</option>
              </select>
            </label>
          </div>
          <label className="field-group" htmlFor="ops-alignment-reason">
            <span>Reason</span>
            <textarea
              id="ops-alignment-reason"
              className="text-input"
              rows={4}
              style={{ minHeight: "132px", padding: "12px" }}
              value={partyAlignmentForm.reason}
              onChange={(event) => setPartyAlignmentForm((current) => ({ ...current, reason: event.target.value }))}
            />
          </label>
          <button className="button button-primary" type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save party-line assessment"}
          </button>
        </form>

        <p className="meta-line">
          Last refreshed: {formatDateTime(new Date().toISOString())}
        </p>
      </section>
    </div>
  );
};
