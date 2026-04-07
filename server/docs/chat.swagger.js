/**
 * @swagger
 * tags:
 *   name: Chat
 *   description: Chat & messaging APIs
 */

/**
 * @swagger
 * /chat/my-conversations:
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
 * /chat/create-find-conversation:
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
 * /chat/conversation/{conversationId}/messages:
 *   get:
 *     summary: Fetch messages of a conversation (paginated)
 *     tags: [Chat]
 *     description: Returns messages with pagination support
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
 *       500:
 *         description: Unable to fetch messages
 */