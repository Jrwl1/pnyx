// WHAT IT DO? Keeps bounded page discussions, reports, and moderation separate from canonical data.
import { db } from "./client.js";

export type DiscussionEntityKind = "politician" | "canonical_promise";
export type DiscussionThreadStatus = "open" | "locked" | "hidden" | "removed" | "escalated";
export type DiscussionCommentStatus = "visible" | "hidden" | "removed";
export type DiscussionTargetKind = "thread" | "comment";
export type DiscussionReportStatus = "pending" | "reviewed" | "escalated";

export type DiscussionThreadRow = {
  id: number;
  entityKind: DiscussionEntityKind;
  entityId: string;
  title: string;
  createdBy: string;
  status: DiscussionThreadStatus;
  moderationReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DiscussionCommentRow = {
  id: number;
  threadId: number;
  body: string;
  createdBy: string;
  status: DiscussionCommentStatus;
  moderationReason: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DiscussionReportRow = {
  id: number;
  targetKind: DiscussionTargetKind;
  targetId: number;
  reporterId: string;
  reason: string;
  status: DiscussionReportStatus;
  createdAt: string;
  updatedAt: string;
};

export type DiscussionBundle = {
  thread: DiscussionThreadRow;
  comments: DiscussionCommentRow[];
};

export const isDiscussionEntityKind = (value: string): value is DiscussionEntityKind => {
  return value === "politician" || value === "canonical_promise";
};

const threadSelect = `
  SELECT id,
    entity_kind AS entityKind,
    entity_id AS entityId,
    title,
    created_by AS createdBy,
    status,
    moderation_reason AS moderationReason,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM discussion_threads
`;

const commentSelect = `
  SELECT id,
    thread_id AS threadId,
    body,
    created_by AS createdBy,
    status,
    moderation_reason AS moderationReason,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM discussion_comments
`;

const reportSelect = `
  SELECT id,
    target_kind AS targetKind,
    target_id AS targetId,
    reporter_id AS reporterId,
    reason,
    status,
    created_at AS createdAt,
    updated_at AS updatedAt
  FROM discussion_reports
`;

export const discussionEntityExists = (entityKind: DiscussionEntityKind, entityId: string | number): boolean => {
  const serializedId = String(entityId);
  if (entityKind === "politician") {
    const row = db
      .prepare("SELECT 1 FROM politicians WHERE id = ? AND deleted_at IS NULL LIMIT 1")
      .get(Number(serializedId)) as { "1": number } | undefined;
    return Boolean(row);
  }

  const row = db
    .prepare("SELECT 1 FROM canonical_promises WHERE id = ? AND deleted_at IS NULL LIMIT 1")
    .get(Number(serializedId)) as { "1": number } | undefined;
  return Boolean(row);
};

export const getDiscussionThreadById = (threadId: number): DiscussionThreadRow | null => {
  const row = db.prepare(`${threadSelect} WHERE id = ? LIMIT 1`).get(threadId) as DiscussionThreadRow | undefined;
  return row ?? null;
};

export const getDiscussionCommentById = (commentId: number): DiscussionCommentRow | null => {
  const row = db.prepare(`${commentSelect} WHERE id = ? LIMIT 1`).get(commentId) as DiscussionCommentRow | undefined;
  return row ?? null;
};

const listCommentsForThreads = (threadIds: number[], includeModerated: boolean): Map<number, DiscussionCommentRow[]> => {
  if (threadIds.length === 0) {
    return new Map<number, DiscussionCommentRow[]>();
  }
  const placeholders = threadIds.map(() => "?").join(", ");
  const statusClause = includeModerated ? "" : " AND status = 'visible'";
  const rows = db
    .prepare(`${commentSelect} WHERE thread_id IN (${placeholders})${statusClause} ORDER BY created_at ASC, id ASC`)
    .all(...threadIds) as DiscussionCommentRow[];

  const commentsByThread = new Map<number, DiscussionCommentRow[]>();
  for (const row of rows) {
    commentsByThread.set(row.threadId, [...(commentsByThread.get(row.threadId) ?? []), row]);
  }
  return commentsByThread;
};

export const listDiscussionBundles = (
  entityKind: DiscussionEntityKind,
  entityId: string | number,
  includeModerated = false
): DiscussionBundle[] => {
  const statusClause = includeModerated ? "" : " AND status IN ('open', 'locked', 'escalated')";
  const threads = db
    .prepare(
      `${threadSelect} WHERE entity_kind = ? AND entity_id = ?${statusClause} ORDER BY updated_at DESC, id DESC`
    )
    .all(entityKind, String(entityId)) as DiscussionThreadRow[];
  const commentsByThread = listCommentsForThreads(
    threads.map((thread) => thread.id),
    includeModerated
  );
  return threads.map((thread) => ({
    thread,
    comments: commentsByThread.get(thread.id) ?? []
  }));
};

export const createDiscussionThread = ({
  entityKind,
  entityId,
  title,
  body,
  createdBy
}: {
  entityKind: DiscussionEntityKind;
  entityId: string | number;
  title: string;
  body: string;
  createdBy: string;
}): DiscussionBundle => {
  const tx = db.transaction(() => {
    const threadId = db
      .prepare(
        `INSERT INTO discussion_threads (entity_kind, entity_id, title, created_by, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      )
      .run(entityKind, String(entityId), title, createdBy).lastInsertRowid as number;
    db.prepare(
      `INSERT INTO discussion_comments (thread_id, body, created_by, updated_at)
       VALUES (?, ?, ?, datetime('now'))`
    ).run(threadId, body, createdBy);
    return threadId;
  });
  const threadId = tx();
  const thread = getDiscussionThreadById(threadId);
  if (!thread) {
    throw new Error("discussion thread create failed");
  }
  return {
    thread,
    comments: listCommentsForThreads([threadId], true).get(threadId) ?? []
  };
};

export const addDiscussionComment = (threadId: number, body: string, createdBy: string): DiscussionCommentRow => {
  const thread = getDiscussionThreadById(threadId);
  if (!thread) {
    throw new Error("discussion thread not found");
  }
  if (thread.status !== "open") {
    throw new Error("discussion thread is not open");
  }
  const commentId = db
    .prepare(
      `INSERT INTO discussion_comments (thread_id, body, created_by, updated_at)
       VALUES (?, ?, ?, datetime('now'))`
    )
    .run(threadId, body, createdBy).lastInsertRowid as number;
  db.prepare("UPDATE discussion_threads SET updated_at = datetime('now') WHERE id = ?").run(threadId);
  const comment = getDiscussionCommentById(commentId);
  if (!comment) {
    throw new Error("discussion comment create failed");
  }
  return comment;
};

export const createDiscussionReport = (
  targetKind: DiscussionTargetKind,
  targetId: number,
  reporterId: string,
  reason: string
): DiscussionReportRow => {
  const reportId = db
    .prepare(
      `INSERT INTO discussion_reports (target_kind, target_id, reporter_id, reason, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    )
    .run(targetKind, targetId, reporterId, reason).lastInsertRowid as number;
  const row = db.prepare(`${reportSelect} WHERE id = ? LIMIT 1`).get(reportId) as DiscussionReportRow | undefined;
  if (!row) {
    throw new Error("discussion report create failed");
  }
  return row;
};

export const listDiscussionReports = (): DiscussionReportRow[] => {
  return db.prepare(`${reportSelect} ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at ASC, id ASC`).all() as DiscussionReportRow[];
};

const recordModerationAction = (
  targetKind: "thread" | "comment" | "report",
  targetId: number,
  action: string,
  actorId: string,
  reason: string | null
): void => {
  db.prepare(
    `INSERT INTO discussion_moderation_actions (target_kind, target_id, action, actor_id, reason)
     VALUES (?, ?, ?, ?, ?)`
  ).run(targetKind, targetId, action, actorId, reason);
};

export const moderateDiscussionThread = (
  threadId: number,
  action: "lock" | "unlock" | "hide" | "remove" | "restore" | "escalate",
  actorId: string,
  reason: string | null
): DiscussionThreadRow => {
  const nextStatusByAction: Record<typeof action, DiscussionThreadStatus> = {
    lock: "locked",
    unlock: "open",
    hide: "hidden",
    remove: "removed",
    restore: "open",
    escalate: "escalated"
  };
  const nextStatus = nextStatusByAction[action];
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE discussion_threads
       SET status = ?, moderation_reason = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(nextStatus, reason, threadId);
    recordModerationAction("thread", threadId, action, actorId, reason);
  });
  tx();
  const thread = getDiscussionThreadById(threadId);
  if (!thread) {
    throw new Error("discussion thread not found");
  }
  return thread;
};

export const moderateDiscussionComment = (
  commentId: number,
  action: "hide" | "remove" | "restore",
  actorId: string,
  reason: string | null
): DiscussionCommentRow => {
  const nextStatusByAction: Record<typeof action, DiscussionCommentStatus> = {
    hide: "hidden",
    remove: "removed",
    restore: "visible"
  };
  const nextStatus = nextStatusByAction[action];
  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE discussion_comments
       SET status = ?, moderation_reason = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(nextStatus, reason, commentId);
    recordModerationAction("comment", commentId, action, actorId, reason);
  });
  tx();
  const comment = getDiscussionCommentById(commentId);
  if (!comment) {
    throw new Error("discussion comment not found");
  }
  return comment;
};
