const pool = require("../../config/db");

// async function migrate() {
//   const client = await pool.connect();

//   try {
//     await client.query("BEGIN");

//     await client.query(tables.sessions);

//     await client.query("COMMIT");

//     console.log("Migration completed");
//   } catch (err) {
//     await client.query("ROLLBACK");
//     console.error("Migration failed:", err);
//   } finally {
//     client.release();
//   }
// }

// migrate();

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(`
      ALTER TABLE users
      ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE;
    `);

    await client.query("COMMIT");

    console.log("Migration completed");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
  } finally {
    client.release();
  }
}

migrate();
