const pool = require("../../config/db");
const tables = require("./tables");

async function migrate() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // await client.query(tables.users);
    // await client.query(tables.conversations);
    // await client.query(tables.conversation_participants);
    // await client.query(tables.media);
    // await client.query(tables.devices);
    // await client.query(tables.device_prekeys);
    // await client.query(tables.sessions);
    // await client.query(tables.messages);
    // await client.query(tables.fk);
    await client.query(tables.message_status);
    await client.query(tables.indexes);

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

//     // 1. Create enum type
//     await client.query(`
//       DO $$ BEGIN
//         CREATE TYPE message_type AS ENUM ('text','media','voice_note','call','system');
//       EXCEPTION
//         WHEN duplicate_object THEN null;
//       END $$;
//     `);

//     // 2. Add new columns (nullable first to avoid failure)
//     await client.query(`
//       ALTER TABLE messages
//       ADD COLUMN client_msg_id UUID,
//       ADD COLUMN sequence_no BIGINT,
//       ADD COLUMN msg_type message_type DEFAULT 'text',
//       ADD COLUMN media_id UUID REFERENCES media(id),
//       ADD COLUMN forwarded_from_id UUID REFERENCES messages(id);
//     `);

//     // 3. Backfill client_msg_id (generate UUIDs)
//     await client.query(`
//       UPDATE messages
//       SET client_msg_id = gen_random_uuid()
//       WHERE client_msg_id IS NULL;
//     `);

//     // 4. Backfill sequence_no (per conversation ordering)
//     await client.query(`
//       WITH ranked AS (
//         SELECT id,
//                ROW_NUMBER() OVER (
//                  PARTITION BY conversation_id
//                  ORDER BY created_at
//                ) AS seq
//         FROM messages
//       )
//       UPDATE messages m
//       SET sequence_no = r.seq
//       FROM ranked r
//       WHERE m.id = r.id;
//     `);

//     // 5. Make required columns NOT NULL
//     await client.query(`
//       ALTER TABLE messages
//       ALTER COLUMN client_msg_id SET NOT NULL,
//       ALTER COLUMN sequence_no SET NOT NULL;
//     `);

//     // 6. Add constraints
//     await client.query(`
//       ALTER TABLE messages
//       ADD CONSTRAINT unique_client_msg_sender UNIQUE (client_msg_id, sender_id),
//       ADD CONSTRAINT unique_conversation_sequence UNIQUE (conversation_id, sequence_no);
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
