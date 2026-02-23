// WHAT IT DO? Vitest setup: use in-memory DB and apply migrations.
process.env.DB_PATH = ":memory:";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_WINDOW_MS = "60000";
process.env.RATE_LIMIT_LOGIN_MAX = "3";
process.env.RATE_LIMIT_REGISTER_MAX = "2";
process.env.RATE_LIMIT_ADD_STATEMENT_MAX = "2";
process.env.RATE_LIMIT_VOTE_MAX = "2";
process.env.RATE_LIMIT_GLOBAL_MAX = "8";
