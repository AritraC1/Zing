/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication APIs
 */

/**
 * @swagger
 * /auth/verify-otp:
 *   post:
 *     summary: Verify OTP using Firebase ID token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - idToken
 *               - deviceId
 *               - deviceType
 *             properties:
 *               idToken:
 *                 type: string
 *                 example: firebase_id_token_here
 *               deviceId:
 *                 type: string
 *                 example: device-12345
 *               deviceType:
 *                 type: string
 *                 example: android
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: OTP verified
 *                 isNewUser:
 *                   type: boolean
 *                   example: false
 *                 profileCompleted:
 *                   type: boolean
 *                   example: true
 *                 accessToken:
 *                   type: string
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Invalid Firebase token
 *       500:
 *         description: OTP verification failed
 */

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: New access token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: New access token generated
 *                 accessToken:
 *                   type: string
 *       401:
 *         description: Refresh token missing
 *       403:
 *         description: Invalid or expired refresh token
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user and invalidate session
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       400:
 *         description: Refresh token required
 *       404:
 *         description: Session not found
 *       500:
 *         description: Logout failed
 */

/**
 * @swagger
 * /auth/keys/register:
 *   post:
 *     summary: Upload Signal Protocol public key
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - identityPublicKey
 *             properties:
 *               deviceId:
 *                 type: string
 *                 example: device-12345
 *               identityPublicKey:
 *                 type: string
 *                 example: BASE64_PUBLIC_KEY
 *     responses:
 *       200:
 *         description: Public key uploaded successfully
 *       400:
 *         description: Invalid input
 */

/**
 * @swagger
 * /auth/keys/{userId}:
 *   get:
 *     summary: Fetch user's public key
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         example: user-123
 *     responses:
 *       200:
 *         description: Public key fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 identityPublicKey:
 *                   type: string
 *                   example: BASE64_PUBLIC_KEY
 *       404:
 *         description: User or key not found
 */

/**
 * @swagger
 * /auth/delete-account:
 *   delete:
 *     summary: Delete user account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+919876543210"
 *     responses:
 *       200:
 *         description: User deleted successfully
 *       500:
 *         description: Unable to delete account
 */