/* WHAT IT DO? Shows bounded page discussion while keeping comments separate from verified evidence. */

import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { addDiscussionComment, createDiscussion, listDiscussions, reportDiscussionComment } from "../lib/api";
import { formatDateTime } from "../lib/format";
import type { AuthSession, DiscussionBundle, DiscussionEntityKind } from "../types";

const buildSignInRedirectLink = (target: string): string => {
  const params = new URLSearchParams({ redirect: target });
  return `/sign-in?${params.toString()}`;
};

export const DiscussionPanel = ({
  entityKind,
  entityId,
  currentPath,
  session
}: {
  entityKind: DiscussionEntityKind;
  entityId: string | number;
  currentPath: string;
  session: AuthSession | null;
}): JSX.Element => {
  const [threads, setThreads] = useState<DiscussionBundle[]>([]);
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [commentTextByThread, setCommentTextByThread] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const signInPath = buildSignInRedirectLink(currentPath);

  const load = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      setThreads(await listDiscussions(entityKind, entityId, session?.token));
    } catch (err) {
      setError((err as Error).message || "Unable to load discussion.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [entityKind, entityId, session?.token]);

  const onCreateThread = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!session) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      await createDiscussion(session.token, {
        entityKind,
        entityId,
        title,
        body
      });
      setTitle("");
      setBody("");
      setMessage("Discussion queued on this page.");
      await load();
    } catch (err) {
      setError((err as Error).message || "Unable to create discussion.");
    }
  };

  const onAddComment = async (threadId: number): Promise<void> => {
    if (!session) {
      return;
    }
    const commentBody = commentTextByThread[threadId]?.trim() ?? "";
    if (!commentBody) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      await addDiscussionComment(session.token, threadId, commentBody);
      setCommentTextByThread((current) => ({ ...current, [threadId]: "" }));
      await load();
    } catch (err) {
      setError((err as Error).message || "Unable to add comment.");
    }
  };

  const onReport = async (commentId: number): Promise<void> => {
    if (!session) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      await reportDiscussionComment(session.token, commentId, "source_problem");
      setMessage("Report sent to moderation.");
    } catch (err) {
      setError((err as Error).message || "Unable to report comment.");
    }
  };

  return (
    <section className="discussion-panel stack-sm" aria-label="Bounded discussion">
      <div className="section-header">
        <div className="stack-xs">
          <h2>Discussion</h2>
          <p className="meta-line">Comments are public context only. They do not change canonical facts or reviewed evidence.</p>
        </div>
        {!session ? (
          <Link className="button button-secondary" to={signInPath}>
            Sign in to discuss
          </Link>
        ) : null}
      </div>

      {loading ? <p className="meta-line">Loading discussion...</p> : null}
      {message ? <p className="meta-line">{message}</p> : null}
      {error ? (
        <p className="meta-line" role="alert">
          {error}
        </p>
      ) : null}

      {session ? (
        <form className="discussion-form stack-sm" onSubmit={(event) => void onCreateThread(event)}>
          <label className="field-group" htmlFor={`discussion-title-${entityKind}-${entityId}`}>
            <span>Thread title</span>
            <input
              id={`discussion-title-${entityKind}-${entityId}`}
              className="text-input"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
            />
          </label>
          <label className="field-group" htmlFor={`discussion-body-${entityKind}-${entityId}`}>
            <span>Comment</span>
            <textarea
              id={`discussion-body-${entityKind}-${entityId}`}
              className="text-input"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={4}
              required
            />
          </label>
          <button className="button button-secondary" type="submit">
            Start discussion
          </button>
        </form>
      ) : null}

      {threads.length === 0 && !loading ? (
        <p className="meta-line">No discussion threads are attached to this page yet.</p>
      ) : null}

      <div className="discussion-thread-list">
        {threads.map((bundle) => (
          <article key={bundle.thread.id} className="discussion-thread stack-sm">
            <div className="section-header">
              <div>
                <h3>{bundle.thread.title}</h3>
                <p className="meta-line">
                  {bundle.thread.status} by {bundle.thread.createdBy} on {formatDateTime(bundle.thread.createdAt)}
                </p>
              </div>
            </div>
            {bundle.comments.map((comment) => (
              <div key={comment.id} className="discussion-comment">
                <p>{comment.body}</p>
                <p className="meta-line">
                  {comment.createdBy} on {formatDateTime(comment.createdAt)}
                </p>
                {session ? (
                  <button className="button button-link" type="button" onClick={() => void onReport(comment.id)}>
                    Report
                  </button>
                ) : null}
              </div>
            ))}
            {session && bundle.thread.status === "open" ? (
              <div className="discussion-reply-row">
                <label className="field-group" htmlFor={`discussion-reply-${bundle.thread.id}`}>
                  <span>Reply</span>
                  <input
                    id={`discussion-reply-${bundle.thread.id}`}
                    className="text-input"
                    type="text"
                    value={commentTextByThread[bundle.thread.id] ?? ""}
                    onChange={(event) =>
                      setCommentTextByThread((current) => ({ ...current, [bundle.thread.id]: event.target.value }))
                    }
                  />
                </label>
                <button className="button button-secondary" type="button" onClick={() => void onAddComment(bundle.thread.id)}>
                  Add reply
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
};
