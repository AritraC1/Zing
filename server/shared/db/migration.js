const fs = require("fs");
const path = require("path");
const pool = require("../../config/db");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

async function migrate() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log("No migrations to run");
    await pool.end();
    return;
  }

  const client = await pool.connect();

  try {
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      console.log(`Running migration: ${file}`);
      await client.query(sql);
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
