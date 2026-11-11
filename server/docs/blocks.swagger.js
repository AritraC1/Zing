/**
 * @swagger
 * tags:
 *   name: Blocks
 *   description: Contact blocking. A block in either direction stops messaging AND calls between the pair.
 */

/**
 * @swagger
 * /blocks/block:
 *   post:
 *     summary: Block a contact
 *     tags: [Blocks]
 *     description: Requires valid access token (JWT via cookie). Idempotent — blocking twice keeps a single row. Prevents message delivery and calls in both directions.
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
 *                 format: uuid
 *                 example: 5f2b8a1e-3c4d-4e5f-8a9b-0c1d2e3f4a5b
 *     responses:
 *       200:
 *         description: Contact blocked
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Contact blocked
 *       400:
 *         description: userId missing/invalid, or you tried to block yourself
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Unable to block contact
 */

/**
 * @swagger
 * /blocks/unblock:
 *   post:
 *     summary: Unblock a contact
 *     tags: [Blocks]
 *     description: Requires valid access token (JWT via cookie). Unblocking restores messaging and calling.
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
 *                 format: uuid
 *                 example: 5f2b8a1e-3c4d-4e5f-8a9b-0c1d2e3f4a5b
 *     responses:
 *       200:
 *         description: Contact unblocked (or was not blocked)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Contact unblocked
 *       400:
 *         description: userId missing/invalid
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Unable to unblock contact
 */

/**
 * @swagger
 * /blocks/blocked:
 *   get:
 *     summary: List the current user's blocked contacts
 *     tags: [Blocks]
 *     description: Requires valid access token (JWT via cookie). Returns the blocked user IDs.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Blocked user IDs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 blockedUserIds:
 *                   type: array
 *                   items:
 *                     type: string
 *                     format: uuid
 *                   example: [5f2b8a1e-3c4d-4e5f-8a9b-0c1d2e3f4a5b]
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Unable to fetch blocked list
 */
