/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile & onboarding APIs
 */

/**
 * @swagger
 * /users/onboard:
 *   post:
 *     summary: Complete onboarding for new user
 *     tags: [Users]
 *     description: Requires valid access token (JWT via cookie)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - displayName
 *               - deviceId
 *               - deviceType
 *             properties:
 *               displayName:
 *                 type: string
 *                 example: John Doe
 *               deviceId:
 *                 type: string
 *                 example: device-12345
 *               deviceType:
 *                 type: string
 *                 example: android
 *     responses:
 *       200:
 *         description: Onboarding complete
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Failed to onboard user
 */

/**
 * @swagger
 * /users/me:
 *   get:
 *     summary: Get current logged-in user's profile
 *     tags: [Users]
 *     description: Requires valid access token (JWT via cookie)
 *     responses:
 *       200:
 *         description: Successfully fetched user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Successfully fetched user profile
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: user-123
 *                     phone_number:
 *                       type: string
 *                       example: "+919876543210"
 *                     display_name:
 *                       type: string
 *                       example: John Doe
 *                     profile_completed:
 *                       type: boolean
 *                       example: true
 *       500:
 *         description: Unable to get profile data
 */

/**
 * @swagger
 * /users/update-profile:
 *   patch:
 *     summary: Update user's display name
 *     tags: [Users]
 *     description: Requires valid access token (JWT via cookie)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newDisplayName
 *             properties:
 *               newDisplayName:
 *                 type: string
 *                 example: John Updated
 *     responses:
 *       200:
 *         description: User details updated successfully
 *       404:
 *         description: User not found or missing data
 *       500:
 *         description: Unable to update profile
 */

/**
 * @swagger
 * /users/upload-avatar:
 *   post:
 *     summary: Upload user avatar
 *     tags: [Users]
 *     description: Upload profile picture using multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: File uploaded successfully
 *                 data:
 *                   type: object
 *                   example:
 *                     url: https://res.cloudinary.com/demo/image/upload/sample.jpg
 *       400:
 *         description: File is required
 *       500:
 *         description: Upload failed
 */

/**
 * @swagger
 * /users/search:
 *   get:
 *     summary: Search user by phone number
 *     tags: [Users]
 *     description: Requires valid access token (JWT via cookie)
 *     parameters:
 *       - in: query
 *         name: phoneNumber
 *         required: true
 *         schema:
 *           type: string
 *         example: "+919876543210"
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User found
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: user-123
 *                     name:
 *                       type: string
 *                       example: John Doe
 *                     phoneNumber:
 *                       type: string
 *                       example: "+919876543210"
 *                     profilePic:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *       400:
 *         description: Phone number is required
 *       404:
 *         description: User not found
 */