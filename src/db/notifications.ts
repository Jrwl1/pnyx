// WHAT IT DO? Stores notification preferences, notification records, and delivery attempts for authenticated users.

import { db } from "./client.js";

export type NotificationPreferenceRow = {
  userId: string;
  inAppEnabled: number;
  emailEnabled: number;
  reviewUpdatesEnabled: number;
  moderatorAssignmentsEnabled: number;
  roleUpdatesEnabled: number;
  createdAt: string | null;
  updatedAt: string | null;
};

export type NotificationPreferenceKey =
  | "reviewUpdatesEnabled"
  | "moderatorAssignmentsEnabled"
  | "roleUpdatesEnabled";

export type NotificationRecord = {
  id: number;
  userId: string;
  notificationType: string;
  title: string;
  body: string;
  relatedPath: string | null;
  readAt: string | null;
  createdAt: string;
};

const DEFAULT_NOTIFICATION_PREFERENCES: Omit<NotificationPreferenceRow, "userId" | "createdAt" | "updatedAt"> = {
  inAppEnabled: 1,
  emailEnabled: 0,
  reviewUpdatesEnabled: 1,
  moderatorAssignmentsEnabled: 1,
  roleUpdatesEnabled: 1
};

export const getNotificationPreferences = (userId: string): NotificationPreferenceRow => {
  const row = db
    .prepare(
      `SELECT user_id AS userId,
        in_app_enabled AS inAppEnabled,
        email_enabled AS emailEnabled,
        review_updates_enabled AS reviewUpdatesEnabled,
        moderator_assignments_enabled AS moderatorAssignmentsEnabled,
        role_updates_enabled AS roleUpdatesEnabled,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM notification_preferences
       WHERE user_id = ?`
    )
    .get(userId) as NotificationPreferenceRow | undefined;

  if (row) {
    return row;
  }

  return {
    userId,
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    createdAt: null,
    updatedAt: null
  };
};

export const upsertNotificationPreferences = (
  userId: string,
  input: Partial<Omit<NotificationPreferenceRow, "userId" | "createdAt" | "updatedAt">>
): NotificationPreferenceRow => {
  const current = getNotificationPreferences(userId);
  const next = {
    inAppEnabled: input.inAppEnabled ?? current.inAppEnabled,
    emailEnabled: input.emailEnabled ?? current.emailEnabled,
    reviewUpdatesEnabled: input.reviewUpdatesEnabled ?? current.reviewUpdatesEnabled,
    moderatorAssignmentsEnabled: input.moderatorAssignmentsEnabled ?? current.moderatorAssignmentsEnabled,
    roleUpdatesEnabled: input.roleUpdatesEnabled ?? current.roleUpdatesEnabled
  };

  db.prepare(
    `INSERT INTO notification_preferences
     (user_id, in_app_enabled, email_enabled, review_updates_enabled, moderator_assignments_enabled, role_updates_enabled, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id)
     DO UPDATE SET
       in_app_enabled = excluded.in_app_enabled,
       email_enabled = excluded.email_enabled,
       review_updates_enabled = excluded.review_updates_enabled,
       moderator_assignments_enabled = excluded.moderator_assignments_enabled,
       role_updates_enabled = excluded.role_updates_enabled,
       updated_at = datetime('now')`
  ).run(
    userId,
    next.inAppEnabled,
    next.emailEnabled,
    next.reviewUpdatesEnabled,
    next.moderatorAssignmentsEnabled,
    next.roleUpdatesEnabled
  );

  return getNotificationPreferences(userId);
};

export const listNotifications = ({
  userId,
  unreadOnly,
  page,
  pageSize
}: {
  userId: string;
  unreadOnly: boolean;
  page: number;
  pageSize: number;
}): { items: NotificationRecord[]; total: number } => {
  const conditions = ["user_id = ?"];
  const params: Array<string | number> = [userId];

  if (unreadOnly) {
    conditions.push("read_at IS NULL");
  }

  const whereSql = `WHERE ${conditions.join(" AND ")}`;
  const offset = (page - 1) * pageSize;
  const total = (
    db.prepare(`SELECT COUNT(*) AS total FROM notifications ${whereSql}`).get(...params) as { total: number }
  ).total;
  const items = db
    .prepare(
      `SELECT id,
        user_id AS userId,
        notification_type AS notificationType,
        title,
        body,
        related_path AS relatedPath,
        read_at AS readAt,
        created_at AS createdAt
       FROM notifications
       ${whereSql}
       ORDER BY created_at DESC, id DESC
       LIMIT ? OFFSET ?`
    )
    .all(...params, pageSize, offset) as NotificationRecord[];

  return { items, total };
};

export const markNotificationRead = (userId: string, notificationId: number): boolean => {
  const result = db
    .prepare("UPDATE notifications SET read_at = datetime('now') WHERE id = ? AND user_id = ? AND read_at IS NULL")
    .run(notificationId, userId);
  return result.changes > 0;
};

const isCategoryEnabled = (preferences: NotificationPreferenceRow, key?: NotificationPreferenceKey): boolean => {
  if (!key) {
    return true;
  }
  return preferences[key] === 1;
};

export const createNotification = (input: {
  userId: string;
  notificationType: string;
  title: string;
  body: string;
  relatedPath?: string | null;
  preferenceKey?: NotificationPreferenceKey;
}): number | null => {
  const user = db.prepare("SELECT 1 FROM users WHERE id = ? LIMIT 1").get(input.userId) as { "1"?: number } | undefined;
  if (!user) {
    return null;
  }

  const preferences = getNotificationPreferences(input.userId);
  const categoryEnabled = isCategoryEnabled(preferences, input.preferenceKey);
  if (!categoryEnabled) {
    return null;
  }

  const notificationResult = db
    .prepare(
      `INSERT INTO notifications (user_id, notification_type, title, body, related_path)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(input.userId, input.notificationType, input.title, input.body, input.relatedPath ?? null);

  const notificationId = notificationResult.lastInsertRowid as number;
  if (preferences.inAppEnabled === 1) {
    db.prepare(
      `INSERT INTO notification_deliveries (notification_id, channel, delivery_state, updated_at)
       VALUES (?, 'inapp', 'delivered', datetime('now'))`
    ).run(notificationId);
  }
  if (preferences.emailEnabled === 1) {
    db.prepare(
      `INSERT INTO notification_deliveries (notification_id, channel, delivery_state, updated_at)
       VALUES (?, 'email', 'pending', datetime('now'))`
    ).run(notificationId);
  }

  return notificationId;
};
