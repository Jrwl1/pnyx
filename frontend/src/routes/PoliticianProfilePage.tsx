/* WHAT IT DO? Implements V3 politician profile with scorecards, required tabs, and promise-level accountability fields. */

import { useMemo, type ReactElement } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { StatusChip } from "../components/StatusChip";
import { usePublicData } from "../context/PublicDataContext";
import { findPartyShellForPolitician, getPartyAffiliationLabel, getTerritoryLabel, toPromiseRecord } from "../lib/domain";
import { formatDate, formatDateTime, formatIdentityLine } from "../lib/format";

type ProfileTab = "promises" | "votes" | "evidence";

const PROFILE_TABS: ProfileTab[] = ["promises", "votes", "evidence"];

export const PoliticianProfilePage = (): ReactElement => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { politicians, statements, loading, error, refresh } = usePublicData();

  const politicianId = Number(id);
  const selectedTab = (searchParams.get("tab") as ProfileTab) ?? "promises";
  const activeTab: ProfileTab = PROFILE_TABS.includes(selectedTab) ? selectedTab : "promises";

  const politician = useMemo(() => politicians.find((entry) => entry.id === politicianId), [politicianId, politicians]);
  const linkedPartyShell = useMemo(() => findPartyShellForPolitician(politician), [politician]);
  const promiseRecords = useMemo(() => {
    return statements.filter((statement) => statement.politicianId === politicianId).map(toPromiseRecord);
  }, [politicianId, statements]);

  const totalPromises = promiseRecords.length;
  const unknownCount = promiseRecords.filter((promise) => promise.fulfillmentStatus === "unknown").length;

  const onTabChange = (tab: ProfileTab): void => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", tab);
    setSearchParams(next);
  };

  if (!Number.isFinite(politicianId)) {
    return (
      <section className="page-state page-state-error" role="alert">
        <h1>Invalid politician id</h1>
        <p>The requested profile id is not a valid number.</p>
      </section>
    );
  }

  if (loading) {
    return <LoadingState label="Loading politician profile..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  if (!politician) {
    return (
      <section className="page-state page-state-error" role="alert">
        <h1>Politician not found</h1>
        <p>We could not find a profile for id {politicianId}.</p>
      </section>
    );
  }

  return (
    <div className="stack-lg">
      <section className="hero-panel stack-sm">
        <p className="eyebrow">Politician profile</p>
        <h1>{politician.name}</h1>
        <p className="lede">{formatIdentityLine(politician.office, getTerritoryLabel(politician))}</p>
        <p className="meta-line">
          Party affiliation:{" "}
          {linkedPartyShell ? <Link to={`/parties/${linkedPartyShell.party.id}`}>{getPartyAffiliationLabel(politician)}</Link> : getPartyAffiliationLabel(politician)}
        </p>
        <p className="meta-line mono-inline">External id: {politician.externalId ?? "Data not yet available"}</p>
      </section>

      <section className="scorecards-grid" aria-label="Promise and alignment scorecards">
        <article className="card scorecard">
          <h2>Total promises tracked</h2>
          <p className="score-value">{totalPromises}</p>
        </article>
        <article className="card scorecard">
          <h2>Fulfilled</h2>
          <p className="score-value">0</p>
        </article>
        <article className="card scorecard">
          <h2>Broken</h2>
          <p className="score-value">0</p>
        </article>
        <article className="card scorecard">
          <h2>In progress</h2>
          <p className="score-value">0</p>
        </article>
        <article className="card scorecard">
          <h2>Unknown</h2>
          <p className="score-value">{unknownCount}</p>
        </article>
        <article className="card scorecard">
          <h2>Vote alignment summary</h2>
          <p className="score-value">Unknown</p>
          <p className="meta-line">Aligned 0 / Contradicted 0 / Mixed 0 / Unknown {totalPromises}</p>
        </article>
      </section>

      <section className="split-grid" aria-label="Party context">
        <article className="card stack-sm">
          <h2>Party affiliation</h2>
          <p>
            {linkedPartyShell ? <Link to={`/parties/${linkedPartyShell.party.id}`}>{getPartyAffiliationLabel(politician)}</Link> : getPartyAffiliationLabel(politician)}
          </p>
          <p className="meta-line">
            {linkedPartyShell
              ? "Linked to the frontend-local party shell until canonical party membership APIs exist."
              : "No party affiliation field is available from the connected public dataset yet."}
          </p>
        </article>

        <article className="card stack-sm">
          <h2>Party-line alignment</h2>
          <StatusChip status="unknown" prefix="Party-line alignment" />
          <p>PNYX does not infer party-line behavior without a linked party, sourced party stance records, and mapped politician comparisons.</p>
          <p className="meta-line">
            Until those records exist, this profile keeps party-line alignment explicit as Unknown rather than implying support or a break.
          </p>
        </article>
      </section>

      <section className="card stack-sm" aria-label="Profile tabs">
        <div className="tabs" role="tablist" aria-label="Politician profile tabs">
          <button className={activeTab === "promises" ? "tab active" : "tab"} role="tab" aria-selected={activeTab === "promises"} onClick={() => onTabChange("promises")} type="button">
            Promises
          </button>
          <button className={activeTab === "votes" ? "tab active" : "tab"} role="tab" aria-selected={activeTab === "votes"} onClick={() => onTabChange("votes")} type="button">
            Voting record vs promises
          </button>
          <button className={activeTab === "evidence" ? "tab active" : "tab"} role="tab" aria-selected={activeTab === "evidence"} onClick={() => onTabChange("evidence")} type="button">
            Evidence timeline
          </button>
        </div>

        {activeTab === "promises" ? (
          <>
            <p className="data-note">
              Fulfillment, vote alignment, and party-line comparison fields are currently Unknown until backend accountability mappings are available.
            </p>

            <div className="table-wrapper desktop-only">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Promise statement</th>
                    <th scope="col">Date promised</th>
                    <th scope="col">Current fulfillment status</th>
                    <th scope="col">Vote alignment status</th>
                    <th scope="col">Evidence count</th>
                    <th scope="col">Link to detail</th>
                  </tr>
                </thead>
                <tbody>
                  {promiseRecords.map((promise) => (
                    <tr key={promise.id}>
                      <td>{promise.promiseText}</td>
                      <td>{formatDate(promise.datePromised)}</td>
                      <td>
                        <StatusChip status={promise.fulfillmentStatus} prefix="Fulfillment" />
                      </td>
                      <td>
                        <StatusChip status={promise.voteAlignment} prefix="Vote alignment" />
                      </td>
                      <td>{promise.evidenceCount}</td>
                      <td>
                        <Link to={`/promises/${promise.id}`}>Open promise</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="cards-grid cards-grid-1 mobile-only">
              {promiseRecords.map((promise) => (
                <article key={promise.id} className="card stack-xs">
                  <h3>{promise.promiseText}</h3>
                  <p className="meta-line">Date promised: {formatDate(promise.datePromised)}</p>
                  <p>
                    Fulfillment: <StatusChip status={promise.fulfillmentStatus} prefix="Fulfillment" />
                  </p>
                  <p>
                    Vote alignment: <StatusChip status={promise.voteAlignment} prefix="Vote alignment" />
                  </p>
                  <p>Evidence count: {promise.evidenceCount}</p>
                  <Link to={`/promises/${promise.id}`}>Open promise detail</Link>
                </article>
              ))}
            </div>
          </>
        ) : null}

        {activeTab === "votes" ? (
          <div className="stack-sm">
            <p className="data-note">
              Politician roll-call vote events and party-line comparisons are not yet available in the backend. Alignment remains Unknown for every promise.
            </p>
            <div className="cards-grid cards-grid-1">
              {promiseRecords.map((promise) => (
                <article key={promise.id} className="card stack-xs">
                  <h3>{promise.promiseText}</h3>
                  <p className="meta-line">Promised on {formatDate(promise.datePromised)}</p>
                  <StatusChip status="unknown" prefix="Vote alignment" />
                  <p className="meta-line">Data not yet available</p>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === "evidence" ? (
          <div className="timeline-list" role="list" aria-label="Evidence timeline">
            {statements
              .filter((statement) => statement.politicianId === politician.id)
              .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
              .map((statement) => (
                <article key={statement.id} className="timeline-item" role="listitem">
                  <p className="mono-inline">{formatDateTime(statement.createdAt)}</p>
                  <h3>{statement.body}</h3>
                  <p>
                    Source: <a href={statement.sourceUrl}>{statement.sourceUrl}</a>
                  </p>
                  <p className="meta-line">verificationStatus: {statement.verificationStatus} (evidence confidence, not fulfillment)</p>
                  <Link to={`/promises/${statement.id}`}>Review full promise record</Link>
                </article>
              ))}
          </div>
        ) : null}
      </section>
    </div>
  );
};
