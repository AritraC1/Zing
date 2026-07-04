const db = require("../../config/db");

class MediaRepo {
  static async insertMedia({
    uploader_id,
    storage_key,
    mime_type,
    size_byte,
    checksum_sha256,
  }) {
    const query = `
        INSERT INTO media (
            id,
            uploader_id,
            storage_key,
            mime_type,
            size_byte,
            checksum_sha256
        )
        VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
        RETURNING
            id,
            uploader_id,
            storage_key,
            mime_type,
            size_byte,
            checksum_sha256,
            duration_ms,
            created_at
        `;

    const values = [
      uploader_id,
      storage_key,
      mime_type,
      size_byte,
      checksum_sha256,
    ];

    const result = await db.query(query, values);

    return result.rows[0];
  }
}

module.exports = MediaRepo;
