/* WHAT IT DO? Exposes protected import triggers, staged ingest review, and apply or reject controls for official Finland-first sources. */

import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { useAuth } from "../context/AuthContext";
import {
  applyIngestStageItem,
  getIngestCoverage,
  getIngestRunById,
  listIngestRuns,
  listIngestSources,
  markIngestStageItemNeedsSource,
  rejectIngestStageItem,
  triggerIngestRun
} from "../lib/api";
import { formatDateTime } from "../lib/format";
import type { IngestRunRecord, IngestSourceSummary, IngestStageItemRecord } from "../types";

const toMetadataObject = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const renderResearchMetadata = (normalized: unknown): ReactElement | null => {
  const metadata = toMetadataObject(normalized);
  const sourceTier = metadata?.sourceTier ?? metadata?.sourceType;
  const hasReviewMetadata =
    sourceTier !== undefined ||
    metadata?.confidence !== undefined ||
    metadata?.needsOfficialConfirmation !== undefined;

  if (!hasReviewMetadata) {
    return null;
  }

  return (
    <div className="stack-xs">
      {sourceTier !== undefined ? <p className="meta-line">Source tier: {String(sourceTier)}</p> : null}
      {metadata?.confidence !== undefined ? <p className="meta-line">Confidence: {String(metadata.confidence)}</p> : null}
      {metadata?.needsOfficialConfirmation !== undefined ? (
        <p className="meta-line">
          Official confirmation:{" "}
          {metadata.needsOfficialConfirmation === true
            ? "Needed"
            : metadata.needsOfficialConfirmation === false
              ? "Not flagged"
              : String(metadata.needsOfficialConfirmation)}
        </p>
      ) : null}
    </div>
  );
};

export const OpsImportsPage = (): ReactElement => {
  const { session } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [sources, setSources] = useState<IngestSourceSummary[]>([]);
  const [runs, setRuns] = useState<IngestRunRecord[]>([]);
  const [coverage, setCoverage] = useState<{ pending: Record<string, number>; applied: Record<string, number> } | null>(null);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [selectedRun, setSelectedRun] = useState<IngestRunRecord | null>(null);
  const [stageItems, setStageItems] = useState<IngestStageItemRecord[]>([]);

  const load = async (preferredRunIdOverride?: number | null): Promise<void> => {
    if (!session) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [sourceItems, runItems, coverageResponse] = await Promise.all([
        listIngestSources(session.token),
        listIngestRuns(session.token),
        getIngestCoverage(session.token)
      ]);
      setSources(sourceItems);
      setRuns(runItems);
      setCoverage(coverageResponse);

      const preferredRunId = preferredRunIdOverride ?? selectedRunId ?? runItems[0]?.id ?? null;
      if (preferredRunId) {
        const detail = await getIngestRunById(session.token, preferredRunId);
        setSelectedRunId(preferredRunId);
        setSelectedRun(detail.run);
        setStageItems(detail.stageItems);
      } else {
        setSelectedRun(null);
        setStageItems([]);
      }
    } catch (err) {
      setError((err as Error).message || "Unable to load import operations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [session]);

  const runAction = async (
    operation: () => Promise<void>,
    successMessage: string,
    refreshRunId: number | null = selectedRunId
  ): Promise<void> => {
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      await operation();
      setMessage(successMessage);
      await load(refreshRunId);
    } catch (err) {
      setError((err as Error).message || "Unable to complete import action.");
    } finally {
      setSubmitting(false);
    }
  };

  const openRun = async (runId: number): Promise<void> => {
    await runAction(async () => undefined, `Loaded run #${runId}.`, runId);
  };

  if (!session) {
    return <LoadingState label="Restoring moderator session..." />;
  }

  if (loading) {
    return <LoadingState label="Loading official import operations..." />;
  }

  if (error && !coverage) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="stack-lg">
      <section className="hero-panel stack-sm">
        <p className="eyebrow">Official imports</p>
        <h1>Finland-first ingest review</h1>
        <div className="card-link-row">
          <Link to="/ops">Open politician proposal queue</Link>
          <Link to="/ops/admin">Open party and promise admin</Link>
          <Link to="/ops/records">Open editorial record ops</Link>
        </div>
      </section>

      {message ? <p className="meta-line">{message}</p> : null}
      {error ? (
        <p className="meta-line" role="alert">
          {error}
        </p>
      ) : null}

      {coverage ? (
        <section className="cards-grid cards-grid-3" aria-label="Import coverage">
          <article className="card stack-xs">
            <h2>Pending vote events</h2>
            <p className="score-value">{coverage.pending.vote_event ?? 0}</p>
          </article>
          <article className="card stack-xs">
            <h2>Pending vote records</h2>
            <p className="score-value">{coverage.pending.vote_record ?? 0}</p>
          </article>
          <article className="card stack-xs">
            <h2>Pending party stances</h2>
            <p className="score-value">{coverage.pending.party_stance ?? 0}</p>
          </article>
        </section>
      ) : null}

      <section className="card stack-sm">
        <h2>Trigger supported official sources</h2>
        <div className="cards-grid cards-grid-2">
          {sources.map((source) => (
            <article key={source.sourceKey} className="card stack-xs">
              <h3>{source.label}</h3>
              <p className="meta-line">{source.sourceFamily}</p>
              <button
                className="button button-primary"
                type="button"
                disabled={submitting}
                onClick={() =>
                  void runAction(
                    async () => {
                      await triggerIngestRun(session.token, source.sourceKey);
                    },
                    `Triggered ${source.label}.`
                  )
                }
              >
                {submitting ? "Running..." : "Run import"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="split-grid">
        <article className="card stack-sm">
          <h2>Recent ingest runs</h2>
          {runs.length === 0 ? (
            <p className="meta-line">No import runs yet.</p>
          ) : (
            <ul className="timeline-list">
              {runs.map((run) => (
                <li key={run.id} className="timeline-item">
                  <p>{run.sourceKey}</p>
                  <p className="meta-line">
                    {run.status} · fetched {run.fetchedCount} · staged {run.stagedCount} · applied {run.appliedCount}
                  </p>
                  <p className="meta-line">Created {formatDateTime(run.createdAt)}</p>
                  <button className="button button-secondary" type="button" onClick={() => void openRun(run.id)}>
                    Open run
                  </button>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="card stack-sm">
          <h2>{selectedRun ? `Run #${selectedRun.id}` : "Run detail"}</h2>
          {selectedRun ? (
            <>
              <p className="meta-line">{selectedRun.sourceKey} · {selectedRun.status}</p>
              <p className="meta-line">
                fetched {selectedRun.fetchedCount} · staged {selectedRun.stagedCount} · applied {selectedRun.appliedCount}
              </p>
              {selectedRun.errorMessage ? <p className="meta-line">Error: {selectedRun.errorMessage}</p> : null}
            </>
          ) : (
            <p className="meta-line">Select a run to inspect stage items.</p>
          )}
          {stageItems.length > 0 ? (
            <ul className="timeline-list">
              {stageItems.map((item) => (
                <li key={item.id} className="timeline-item">
                  <p>{item.stageType}</p>
                  <p className="meta-line">{item.status} · {item.dedupeKey}</p>
                  <pre className="meta-line" style={{ whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(item.normalized, null, 2)}
                  </pre>
                  {renderResearchMetadata(item.normalized)}
                  <div className="card-link-row">
                    {item.status === "pending" ? (
                      <>
                        <button
                          className="button button-primary"
                          type="button"
                          disabled={submitting}
                          onClick={() =>
                            void runAction(async () => {
                              await applyIngestStageItem(session.token, item.id);
                            }, `Applied stage item #${item.id}.`)
                          }
                        >
                          Apply
                        </button>
                        <button
                          className="button button-secondary"
                          type="button"
                          disabled={submitting}
                          onClick={() =>
                            void runAction(async () => {
                              await rejectIngestStageItem(session.token, item.id);
                            }, `Rejected stage item #${item.id}.`)
                          }
                        >
                          Reject
                        </button>
                        <button
                          className="button button-secondary"
                          type="button"
                          disabled={submitting}
                          onClick={() =>
                            void runAction(async () => {
                              await markIngestStageItemNeedsSource(session.token, item.id);
                            }, `Marked stage item #${item.id} as needing stronger source confirmation.`)
                          }
                        >
                          Needs source
                        </button>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </article>
      </section>
    </div>
  );
};
