const pool = require("../../config/db");
const tables = require("./tables");

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(tables.messages);

    await client.query("COMMIT");

    console.log("Migration completed");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration failed:", err);
  } finally {
    client.release();
  }
}

// async function migrate() {
//   const client = await pool.connect();

//   try {
//     await client.query("BEGIN");

//     await client.query(`
//       ALTER TABLE users
//       ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE;
//     `);

//     await client.query("COMMIT");

//     console.log("Migration completed");
//   } catch (err) {
//     await client.query("ROLLBACK");
//     console.error("Migration failed:", err);
//   } finally {
//     client.release();
//   }
// }

migrate();
