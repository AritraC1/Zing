const fs = require("fs");
const path = require("path");

const pool = require("../../config/db");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");
const SCHEMAS_DIR = path.join(__dirname, "schemas");

const BOOTSTRAP_SCHEMAS = [
  "users.sql",
  "conversations.sql",
  "conversation_participants.sql",
  "media.sql",
  "messages.sql",
  "message_status.sql",
  "devices.sql",
  "device_prekeys.sql",
  "sessions.sql",
  "foreign_keys.sql",
  "indexes.sql",
];

const BOOTSTRAP_MIGRATION = "001_bootstrap.sql";

async function runBootstrap(client) {
  for (const schemaFile of BOOTSTRAP_SCHEMAS) {
    const schemaPath = path.join(SCHEMAS_DIR, schemaFile);
    const sql = fs.readFileSync(schemaPath, "utf8");
    console.log(`  applying schema: ${schemaFile}`);
    await client.query(sql);
  }
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(client) {
  const { rows } = await client.query(
    "SELECT filename FROM schema_migrations",
  );
  return new Set(rows.map((row) => row.filename));
}

async function runSqlMigration(client, file, sql) {
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query(
      "INSERT INTO schema_migrations (filename) VALUES ($1)",
      [file],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

async function runBootstrapMigration(client, file) {
  await client.query("BEGIN");
  try {
    await runBootstrap(client);
    await client.query(
      "INSERT INTO schema_migrations (filename) VALUES ($1)",
      [file],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  }
}

async function migrate() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log("No migrations to run");
    await pool.end();
    return;
  }

  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      if (applied.has(file)) {
        console.log(`Skipping (already applied): ${file}`);
        continue;
      }

      console.log(`Running migration: ${file}`);

      if (file === BOOTSTRAP_MIGRATION) {
        await runBootstrapMigration(client, file);
      } else {
        const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
        await runSqlMigration(client, file, sql);
      }
    }

    console.log("Migration completed");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
