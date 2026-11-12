/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Chat & messaging APIs
 */

/**
 * @swagger
 * /chats/my-conversations:
 *   get:
 *     summary: Get all conversations for current user
 *     tags: [Chat]
 *     description: Requires valid access token (JWT via cookie)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of user conversations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     example:
 *                       id: convo-123
 *                       type: direct
 *                       lastMessage: Hello
 *       500:
 *         description: Unable to fetch conversations
 */

/**
 * @swagger
 * /chats/create-find-conversation:
 *   post:
 *     summary: Create or find a direct conversation
 *     tags: [Chat]
 *     description: Creates a conversation if it doesn't exist, otherwise returns existing one
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *                 example: user-456
 *     responses:
 *       200:
 *         description: Conversation already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversationId:
 *                   type: string
 *                   example: convo-123
 *                 message:
 *                   type: string
 *                   example: Conversation already exists
 *       201:
 *         description: Conversation created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversationId:
 *                   type: string
 *                   example: convo-789
 *                 message:
 *                   type: string
 *                   example: Conversation created
 *       400:
 *         description: userId is required
 *       500:
 *         description: Unable to create or find conversation
 */

/**
 * @swagger
 * /chats/conversation/{conversationId}/messages:
 *   get:
 *     summary: Fetch messages of a conversation (paginated)
 *     tags: [Chat]
 *     description: Returns messages with pagination support. Each message includes reply preview fields (replyContent, replySenderName, …), reactions and the viewer's starred state.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *         example: convo-123
 *       - in: query
 *         name: offset
 *         required: false
 *         schema:
 *           type: integer
 *         example: 0
 *     responses:
 *       200:
 *         description: Messages fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     example:
 *                       id: msg-1
 *                       senderId: user-123
 *                       content: Hello
 *                       createdAt: 2026-04-07T10:00:00Z
 *                       replyToId: msg-0
 *                       replyContent: Hi there
 *                       reactions: []
 *                       starredByMe: false
 *                 statuses:
 *                   type: array
 *                   items:
 *                     type: object
 *                     example:
 *                       message_id: msg-1
 *                       user_id: user-456
 *                       msg_status: seen
 *                 hasMore:
 *                   type: boolean
 *                   example: false
 *       403:
 *         description: Not a participant in this conversation
 *       500:
 *         description: Unable to fetch messages
 */

/**
 * @swagger
 * /chats/conversation/{conversationId}/messages:
 *   post:
 *     summary: Send a message (HTTP fallback for the socket)
 *     tags: [Chat]
 *     description: >
 *       Requires valid access token (JWT via cookie). Idempotent on clientMsgId.
 *       Supports media (mediaId), forwards (forwardedFromId) and replies/quoting
 *       (replyToId — must be a message in the same conversation). Blocked pairs
 *       cannot send messages.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         example: 9f8b1c2d-1111-4e5f-8a9b-0c1d2e3f4a5b
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clientMsgId
 *             properties:
 *               content:
 *                 type: string
 *                 example: Hello there
 *                 description: Required unless mediaId is provided
 *               clientMsgId:
 *                 type: string
 *                 format: uuid
 *                 example: 3f1a2b3c-4d5e-4f60-8a9b-0c1d2e3f4a5b
 *                 description: Client-generated UUID for idempotent retries
 *               msgType:
 *                 type: string
 *                 enum: [text, media]
 *                 example: text
 *               mediaId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               forwardedFromId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *               replyToId:
 *                 type: string
 *                 format: uuid
 *                 nullable: true
 *                 description: Message being quoted/replied to (same conversation)
 *     responses:
 *       200:
 *         description: Message stored (or the previously stored copy on retry)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: object
 *                   example:
 *                     id: msg-2
 *                     content: Hello there
 *                 created:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: content/mediaId or clientMsgId missing
 *       403:
 *         description: Not a participant, or a block prevents delivery
 *       500:
 *         description: Unable to send message
 */

/**
 * @swagger
 * /chats/conversation/{conversationId}/messages/{messageId}:
 *   patch:
 *     summary: Edit a text message
 *     tags: [Chat]
 *     description: Only the sender may edit, only plain-text, non-deleted messages. Emits a `message_edited` socket event to every participant device.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 example: Hello (edited)
 *     responses:
 *       200:
 *         description: Message edited
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messageId:
 *                   type: string
 *                   format: uuid
 *                 conversationId:
 *                   type: string
 *                   format: uuid
 *                 content:
 *                   type: string
 *                 editedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid edit request
 *       403:
 *         description: Not a participant
 *       404:
 *         description: Message not found or cannot be edited
 */

/**
 * @swagger
 * /chats/conversation/{conversationId}/messages/{messageId}:
 *   delete:
 *     summary: Delete a message for everyone
 *     tags: [Chat]
 *     description: Soft-delete. Only the sender may delete; the content is cleared server-side. Emits a `message_deleted` socket event to every participant device.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Message deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messageId:
 *                   type: string
 *                   format: uuid
 *                 conversationId:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Invalid delete request
 *       403:
 *         description: Not a participant
 *       404:
 *         description: Message not found or already deleted
 */

/**
 * @swagger
 * /chats/conversation/{conversationId}/messages/{messageId}/reaction:
 *   put:
 *     summary: Add an emoji reaction
 *     tags: [Chat]
 *     description: Adds the viewer's reaction. Idempotent — re-adding the same emoji is a no-op. Blocked pairs cannot react. Emits `message_reaction_updated` to every participant device with the full reaction list.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emoji
 *               - action
 *             properties:
 *               emoji:
 *                 type: string
 *                 enum: ["👍", "❤️", "😂", "😮", "😢", "🙏"]
 *                 example: "👍"
 *               action:
 *                 type: string
 *                 enum: [add, remove]
 *                 example: add
 *     responses:
 *       200:
 *         description: Reaction applied; returns the message's full reaction list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messageId:
 *                   type: string
 *                   format: uuid
 *                 conversationId:
 *                   type: string
 *                   format: uuid
 *                 reactions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId:
 *                         type: string
 *                         format: uuid
 *                       emoji:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       400:
 *         description: Unsupported emoji or invalid request
 *       403:
 *         description: Not a participant, or a block prevents reactions
 *       404:
 *         description: Message not found in this conversation
 */

/**
 * @swagger
 * /chats/conversation/{conversationId}/messages/{messageId}/reaction:
 *   delete:
 *     summary: Remove an emoji reaction
 *     tags: [Chat]
 *     description: Removes the viewer's reaction for the given emoji. Emits `message_reaction_updated` to every participant device with the full reaction list.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - emoji
 *               - action
 *             properties:
 *               emoji:
 *                 type: string
 *                 enum: ["👍", "❤️", "😂", "😮", "😢", "🙏"]
 *                 example: "👍"
 *               action:
 *                 type: string
 *                 enum: [add, remove]
 *                 example: remove
 *     responses:
 *       200:
 *         description: Reaction removed; returns the message's full reaction list
 *       400:
 *         description: Unsupported emoji or invalid request
 *       404:
 *         description: Message not found in this conversation
 */

/**
 * @swagger
 * /chats/conversation/{conversationId}/messages/{messageId}/star:
 *   post:
 *     summary: Star or unstar a message
 *     tags: [Chat]
 *     description: Per-user bookmark (private — only the acting user's devices receive the `message_starred` / `message_unstarred` socket event). Idempotent.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: messageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - starred
 *             properties:
 *               starred:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Star state updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messageId:
 *                   type: string
 *                   format: uuid
 *                 conversationId:
 *                   type: string
 *                   format: uuid
 *                 starred:
 *                   type: boolean
 *       400:
 *         description: Invalid star request
 *       403:
 *         description: Not a participant
 *       404:
 *         description: Message not found in this conversation
 */

/**
 * @swagger
 * /chats/starred-messages:
 *   get:
 *     summary: List the current user's starred messages
 *     tags: [Chat]
 *     description: Requires valid access token (JWT via cookie). Returns starred messages across all conversations (deleted messages excluded), newest first, with conversation/peer context.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Starred messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 starredMessages:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       conversation_id:
 *                         type: string
 *                         format: uuid
 *                       conversation_chat_type:
 *                         type: string
 *                         example: direct
 *                       peer_id:
 *                         type: string
 *                         format: uuid
 *                       peer_name:
 *                         type: string
 *                         example: Aisha
 *                       sender_name:
 *                         type: string
 *                       content:
 *                         type: string
 *                         nullable: true
 *                       msg_type:
 *                         type: string
 *                         example: text
 *                       starred_at:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Unable to fetch starred messages
 */

/**
 * @swagger
 * /chats/conversation/{conversationId}/archive:
 *   post:
 *     summary: Archive or unarchive a conversation (per-user flag)
 *     tags: [Chat]
 *     description: Sets this user's personal archive flag. Emits `chat_archived` to the acting user's devices only (other devices sync).
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - archived
 *             properties:
 *               archived:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Archive flag updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversationId:
 *                   type: string
 *                   format: uuid
 *                 archived:
 *                   type: boolean
 *       400:
 *         description: conversationId or archived (boolean) invalid
 *       403:
 *         description: Not a participant
 *       404:
 *         description: Conversation not found
 */

/**
 * @swagger
 * /chats/conversation/{conversationId}:
 *   delete:
 *     summary: Delete a chat for me (per-user flag)
 *     tags: [Chat]
 *     description: Hides the conversation from the caller's chat list only. The other participant and the message history are untouched. Emits `chat_deleted` to the acting user's devices only. If a new message later arrives in the conversation, the chat reappears.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Chat deleted for the current user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversationId:
 *                   type: string
 *                   format: uuid
 *                 deleted:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Invalid conversationId
 *       403:
 *         description: Not a participant
 *       404:
 *         description: Conversation not found
 */