/* WHAT IT DO? Exposes authenticated notification preferences and inbox records from the backend `/me` APIs. */

import { useEffect, useState, type ReactElement } from "react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/PageState";
import { PageMeta } from "../components/PageMeta";
import { useAuth } from "../context/AuthContext";
import {
  getNotificationPreferences,
  listNotifications,
  markNotificationRead,
  updateNotificationPreferences
} from "../lib/api";
import { formatDateTime } from "../lib/format";
import type { NotificationPreferences, NotificationRecord } from "../types";

export const NotificationsPage = (): ReactElement => {
  const { session } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadOnly, setUnreadOnly] = useState<boolean>(false);

  const load = async (): Promise<void> => {
    if (!session) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [preferenceResponse, notificationResponse] = await Promise.all([
        getNotificationPreferences(session.token),
        listNotifications(session.token, { unreadOnly })
      ]);
      setPreferences(preferenceResponse);
      setNotifications(notificationResponse.items);
    } catch (err) {
      setError((err as Error).message || "Unable to load notification settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [session, unreadOnly]);

  const onPreferenceToggle = async (
    field: "inAppEnabled" | "emailEnabled" | "reviewUpdatesEnabled" | "moderatorAssignmentsEnabled" | "roleUpdatesEnabled",
    checked: boolean
  ): Promise<void> => {
    if (!session || !preferences) {
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const next = await updateNotificationPreferences(session.token, { [field]: checked });
      setPreferences(next);
      setMessage("Notification preferences updated.");
    } catch (err) {
      setError((err as Error).message || "Unable to update notification preferences.");
    } finally {
      setSaving(false);
    }
  };

  const onMarkRead = async (notificationId: number): Promise<void> => {
    if (!session) {
      return;
    }
    try {
      await markNotificationRead(session.token, notificationId);
      await load();
    } catch (err) {
      setError((err as Error).message || "Unable to mark notification as read.");
    }
  };

  if (!session) {
    return <LoadingState label="Restoring account session..." />;
  }

  if (loading) {
    return <LoadingState label="Loading notifications..." />;
  }

  if (error && !preferences) {
    return <ErrorState message={error} onRetry={() => void load()} />;
  }

  return (
    <div className="stack-lg">
      <PageMeta
        title="Notifications | PNYX"
        description="Manage notification preferences and review updates from your PNYX account."
        path="/notifications"
      />

      <section className="hero-panel stack-sm">
        <p className="eyebrow">Notifications</p>
        <h1>Manage alerts and review updates</h1>
        <p className="lede">
          Control which account and moderation updates reach you, then review the current notification inbox for this signed-in identity.
        </p>
      </section>

      {message ? <p className="meta-line">{message}</p> : null}
      {error ? (
        <p className="meta-line" role="alert">
          {error}
        </p>
      ) : null}

      {preferences ? (
        <section className="card stack-sm">
          <h2>Preferences</h2>
          <label className="field-group">
            <span>
              <input
                type="checkbox"
                checked={preferences.inAppEnabled === 1}
                onChange={(event) => void onPreferenceToggle("inAppEnabled", event.target.checked)}
                disabled={saving}
              />{" "}
              In-app inbox
            </span>
          </label>
          <label className="field-group">
            <span>
              <input
                type="checkbox"
                checked={preferences.emailEnabled === 1}
                onChange={(event) => void onPreferenceToggle("emailEnabled", event.target.checked)}
                disabled={saving}
              />{" "}
              Queue email delivery when available
            </span>
          </label>
          <label className="field-group">
            <span>
              <input
                type="checkbox"
                checked={preferences.reviewUpdatesEnabled === 1}
                onChange={(event) => void onPreferenceToggle("reviewUpdatesEnabled", event.target.checked)}
                disabled={saving}
              />{" "}
              Proposal and claim review outcomes
            </span>
          </label>
          <label className="field-group">
            <span>
              <input
                type="checkbox"
                checked={preferences.moderatorAssignmentsEnabled === 1}
                onChange={(event) => void onPreferenceToggle("moderatorAssignmentsEnabled", event.target.checked)}
                disabled={saving}
              />{" "}
              Moderator assignment updates
            </span>
          </label>
          <label className="field-group">
            <span>
              <input
                type="checkbox"
                checked={preferences.roleUpdatesEnabled === 1}
                onChange={(event) => void onPreferenceToggle("roleUpdatesEnabled", event.target.checked)}
                disabled={saving}
              />{" "}
              Role change updates
            </span>
          </label>
        </section>
      ) : null}

      <section className="card stack-sm">
        <div className="section-header">
          <h2>Inbox</h2>
          <label className="field-group" htmlFor="notifications-unread-only">
            <span>
              <input
                id="notifications-unread-only"
                type="checkbox"
                checked={unreadOnly}
                onChange={(event) => setUnreadOnly(event.target.checked)}
              />{" "}
              Show unread only
            </span>
          </label>
        </div>

        {notifications.length === 0 ? (
          <p className="meta-line">No notifications match the current filter.</p>
        ) : (
          <ul className="timeline-list">
            {notifications.map((notification) => (
              <li key={notification.id} className="timeline-item">
                <p>{notification.title}</p>
                <p className="meta-line">{notification.body}</p>
                <p className="meta-line">Created {formatDateTime(notification.createdAt)}</p>
                <p className="meta-line">{notification.readAt ? `Read ${formatDateTime(notification.readAt)}` : "Unread"}</p>
                <div className="card-link-row">
                  {notification.relatedPath ? <Link to={notification.relatedPath}>Open related record</Link> : null}
                  {!notification.readAt ? (
                    <button className="button button-secondary" type="button" onClick={() => void onMarkRead(notification.id)}>
                      Mark read
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
