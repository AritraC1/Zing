const db = require("../../config/db");

class ChatParticipantsRepo {
  static async addTwoParticipants(conversationId, user1Id, user2Id, client = db) {
        const query = `
            INSERT INTO conversation_participants (conversation_id, user_id, joined_at)
            VALUES 
                ($1, $2, NOW()),
                ($1, $3, NOW());
        `;

        await client.query(query, [conversationId, user1Id, user2Id]);
    }
}

module.exports = ChatParticipantsRepo;
