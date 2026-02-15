// WHAT IT DO? Vitest setup: use in-memory DB and apply migrations.
process.env.DB_PATH = ":memory:";
process.env.JWT_SECRET = "test-jwt-secret";
