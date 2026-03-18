-- WHAT IT DO? Adds an append-only product event log for auth, contribution, moderation, and editorial actions.

CREATE TABLE IF NOT EXISTS product_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_domain TEXT NOT NULL CHECK(event_domain IN ('auth', 'contribution', 'moderation', 'editorial')),
  event_name TEXT NOT NULL,
  actor_id TEXT,
  actor_role TEXT,
  entity_kind TEXT,
  entity_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_product_events_domain_created
ON product_events(event_domain, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_name_created
ON product_events(event_name, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_actor_created
ON product_events(actor_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_product_events_entity_created
ON product_events(entity_kind, entity_id, created_at DESC, id DESC);
