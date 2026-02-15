// WHAT IT DO? Service entrypoint: apply migrations, then start the HTTP server.
import { applyMigrations } from "./db/migrate.js";
import { startServer } from "./server.js";

applyMigrations();
startServer();
