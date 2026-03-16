/* WHAT IT DO? Implements V3 promise detail with claim, fulfillment, alignment, evidence, revisions, and confidence blocks. */

import { useEffect, useMemo, useState, type ReactElement } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { StatusChip } from "../components/StatusChip";
import { usePublicData } from "../context/PublicDataContext";
import { getStatementById, getStatementRevisions } from "../lib/api";
import { findPartyShellForPolitician, getPartyAffiliationLabel, getTerritoryLabel, toPromiseRecord } from "../lib/domain";
import { formatDate, formatDateTime, formatIdentityLine } from "../lib/format";
import type { StatementDetail, StatementRevision } from "../types";

export const PromiseDetailPage = (): ReactElement => {
  const { id } = useParams();
  const promiseId = Number(id);
  const { politicians } = usePublicData();

  const [statement, setStatement] = useState<StatementDetail | null>(null);
  const [revisions, setRevisions] = useState<StatementRevision[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isFinite(promiseId)) {
      setError("Invalid promise id.");
      setLoading(false);
      return;
    }

    let isCancelled = false;

    const load = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const [statementPayload, revisionPayload] = await Promise.all([
          getStatementById(promiseId),
          getStatementRevisions(promiseId)
        ]);

        if (!isCancelled) {
          setStatement(statementPayload);
          setRevisions(revisionPayload);
        }
      } catch (err) {
        if (!isCancelled) {
          setError((err as Error).message || "Unable to load promise detail.");
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isCancelled = true;
    };
  }, [promiseId]);

  const latestEvidenceDate = useMemo(() => {
    if (!statement) {
      return null;
    }

    const revisionDate = revisions.length > 0 ? revisions[revisions.length - 1].createdAt : null;
    const candidates = [statement.updatedAt, revisionDate, statement.dateSaid].filter(Boolean) as string[];

    if (candidates.length === 0) {
      return null;
    }

    return candidates.reduce((latest, current) => {
      return new Date(current).getTime() > new Date(latest).getTime() ? current : latest;
    });
  }, [revisions, statement]);

  if (loading) {
    return <LoadingState label="Loading promise detail..." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!statement) {
    return <ErrorState message="Promise detail not found." />;
  }

  const promiseRecord = toPromiseRecord(statement);
  const politician = politicians.find((entry) => entry.id === statement.politicianId);
  const linkedPartyShell = findPartyShellForPolitician(politician);
  const partyAffiliationLabel = politician ? getPartyAffiliationLabel(politician) : "Data not yet available";

  return (
    <div className="stack-lg">
      <section className="hero-panel stack-sm">
        <p className="eyebrow">Promise detail</p>
        <h1>{promiseRecord.promiseText}</h1>
        <p className="meta-line">
          {politician ? (
            <>
              <Link to={`/politicians/${politician.id}`}>{politician.name}</Link> - {formatIdentityLine(politician.office, getTerritoryLabel(politician))}
            </>
          ) : (
            <>Politician id {statement.politicianId}</>
          )}
        </p>
        <p className="meta-line">
          Party affiliation: {linkedPartyShell ? <Link to={`/parties/${linkedPartyShell.party.id}`}>{partyAffiliationLabel}</Link> : partyAffiliationLabel}
        </p>
      </section>

      <section className="card stack-sm" aria-label="Promise claim">
        <h2>Promise claim</h2>
        <p>{statement.body}</p>
        <p className="meta-line">Date promised: {formatDate(statement.dateSaid)}</p>
        <p>
          Source: <a href={statement.sourceUrl}>{statement.sourceUrl}</a>
        </p>
      </section>

      <section className="split-grid">
        <article className="card stack-xs" aria-label="Fulfillment verdict">
          <h2>Fulfillment verdict</h2>
          <StatusChip status={promiseRecord.fulfillmentStatus} prefix="Fulfillment verdict" />
          <p>{promiseRecord.fulfillmentSummary}</p>
          <p className="meta-line">Latest evidence date: {formatDateTime(latestEvidenceDate)}</p>
        </article>

        <article className="card stack-xs" aria-label="Vote alignment">
          <h2>Vote alignment</h2>
          <StatusChip status={promiseRecord.voteAlignment} prefix="Vote alignment" />
          <p>Data not yet available</p>
          <ul>
            <li>No roll-call vote events are currently available from the backend.</li>
          </ul>
        </article>
      </section>

      <section className="card stack-sm" aria-label="Party stance comparison">
        <h2>Party stance comparison</h2>
        <StatusChip status="unknown" prefix="Party stance comparison" />
        <p>
          Linked party:{" "}
          {linkedPartyShell ? <Link to={`/parties/${linkedPartyShell.party.id}`}>{partyAffiliationLabel}</Link> : partyAffiliationLabel}
        </p>
        <p>No official party stance record is mapped to this promise yet.</p>
        <p className="meta-line">
          PNYX only compares a promise against party stance when a linked party and a sourced party stance record both exist. Until then, this block remains explicit about Unknown state.
        </p>
      </section>

      <section className="card stack-sm" aria-label="Evidence list">
        <h2>Evidence list</h2>
        <p className="meta-line">Newest first</p>
        <ol>
          <li>
            <a href={statement.sourceUrl}>{statement.sourceUrl}</a>
            <span className="meta-line">Original source for this promise statement</span>
          </li>
        </ol>
      </section>

      <section className="card stack-sm" aria-label="Revision and audit history">
        <details>
          <summary>Revision and audit history</summary>
          {revisions.length === 0 ? (
            <p className="meta-line">No revision records yet.</p>
          ) : (
            <ul className="timeline-list">
              {revisions.map((revision) => (
                <li key={revision.id} className="timeline-item">
                  <p className="mono-inline">{formatDateTime(revision.createdAt)}</p>
                  <p>
                    {revision.changeType} by {revision.actorId}
                  </p>
                  <p className="meta-line">Reason: {revision.reason ?? "Not provided"}</p>
                </li>
              ))}
            </ul>
          )}
        </details>
      </section>

      <section className="card stack-sm" aria-label="Community confidence">
        <h2>Community confidence</h2>
        <p>
          Support: <strong>{statement.aggregate.support}</strong>
        </p>
        <p>
          Oppose: <strong>{statement.aggregate.oppose}</strong>
        </p>
        <p className="data-note">
          Community confidence reflects user sentiment and is not a politician roll-call voting record or a party stance record.
        </p>
      </section>
    </div>
  );
};
