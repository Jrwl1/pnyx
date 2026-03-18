// WHAT IT DO? Writes append-only product events for auth, contribution, moderation, and editorial actions.

import { db } from "./client.js";

export type ProductEventDomain = "auth" | "contribution" | "moderation" | "editorial";

export const recordProductEvent = (input: {
  eventDomain: ProductEventDomain;
  eventName: string;
  actorId?: string | null;
  actorRole?: string | null;
  entityKind?: string | null;
  entityId?: string | number | null;
  metadata?: Record<string, unknown> | null;
}): number => {
  const result = db
    .prepare(
      `INSERT INTO product_events (event_domain, event_name, actor_id, actor_role, entity_kind, entity_id, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.eventDomain,
      input.eventName,
      input.actorId ?? null,
      input.actorRole ?? null,
      input.entityKind ?? null,
      input.entityId != null ? String(input.entityId) : null,
      input.metadata ? JSON.stringify(input.metadata) : null
    );

  return result.lastInsertRowid as number;
};
