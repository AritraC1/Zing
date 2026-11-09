/**
 * @swagger
 * tags:
 *   name: Calls
 *   description: 1:1 audio/video call history APIs (signaling runs over Socket.IO)
 */

/**
 * @swagger
 * /calls/history:
 *   get:
 *     summary: Get call history for current user
 *     tags: [Calls]
 *     description: Requires valid access token (JWT via cookie). Returns the 100 most recent calls, newest first.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: Call history
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 calls:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: 9f8b1c2d-...
 *                       conversationId:
 *                         type: string
 *                       direction:
 *                         type: string
 *                         enum: [incoming, outgoing]
 *                       callType:
 *                         type: string
 *                         enum: [audio, video]
 *                       status:
 *                         type: string
 *                         enum: [ringing, answered, missed, rejected, cancelled]
 *                       startedAt:
 *                         type: string
 *                         format: date-time
 *                       answeredAt:
 *                         type: string
 *                         format: date-time
 *                       endedAt:
 *                         type: string
 *                         format: date-time
 *                       peer:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           avatarUrl:
 *                             type: string
 *                             nullable: true
 *       401:
 *         description: Unauthorized
 */
