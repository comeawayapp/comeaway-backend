/**
 * @swagger
 * components:
 *   schemas:
 *     UserManagement:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: User ID
 *         firstname:
 *           type: string
 *         lastname:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *         status:
 *           type: string
 *     
 *     UserWithType:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: User ID
 *         firstname:
 *           type: string
 *           description: User's first name
 *         lastname:
 *           type: string
 *           description: User's last name
 *         email:
 *           type: string
 *           description: User's email address
 *         role:
 *           type: string
 *           description: User's role
 *         status:
 *           type: string
 *           description: User's status (active/inactive)
 *         isPro:
 *           type: boolean
 *           description: Whether user has Pro access
 *         proExpiresAt:
 *           type: string
 *           format: date-time
 *           description: When Pro access expires
 *         activationMode:
 *           type: string
 *           enum: [code, card, null]
 *           description: How user got Pro access
 *         userType:
 *           type: string
 *           enum: [Standard, Pro]
 *           description: User type classification
 *         activationMethod:
 *           type: string
 *           enum: [code, card, None]
 *           description: Activation method used
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: User creation date
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update date
 */

/**
 * @swagger
 * tags:
 *   name: User Management
 *   description: User management endpoints
 */

/**
 * @swagger
 * /api/auth/all-user:
 *   get:
 *     summary: Get all users with search and filtering (Admin)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query for firstname, lastname, or email (case-insensitive)
 *         example: "temitope"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [standard, pro]
 *         description: Filter by user type
 *         example: "pro"
 *       - in: query
 *         name: activationMethod
 *         schema:
 *           type: string
 *           enum: [code, card, none]
 *         description: Filter by activation method
 *         example: "code"
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserWithType'
 *                 total:
 *                   type: number
 *                   description: Total number of users found
 *                 filters:
 *                   type: object
 *                   properties:
 *                     query:
 *                       type: string
 *                       nullable: true
 *                     type:
 *                       type: string
 *                       nullable: true
 *                     activationMethod:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Invalid filter parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 allowedValues:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 * 
 * /api/auth/soft-deleted-users:
 *   get:
 *     summary: Get soft-deleted users with search and filtering (Admin)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search query for firstname, lastname, or email (case-insensitive)
 *         example: "temitope"
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [standard, pro]
 *         description: Filter by user type
 *         example: "pro"
 *       - in: query
 *         name: activationMethod
 *         schema:
 *           type: string
 *           enum: [code, card, none]
 *         description: Filter by activation method
 *         example: "code"
 *     responses:
 *       200:
 *         description: Soft-deleted users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/UserWithType'
 *                 total:
 *                   type: number
 *                   description: Total number of soft-deleted users found
 *                 filters:
 *                   type: object
 *                   properties:
 *                     query:
 *                       type: string
 *                       nullable: true
 *                     type:
 *                       type: string
 *                       nullable: true
 *                     activationMethod:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Invalid filter parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 allowedValues:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */ 

/**
 * @swagger
 * /api/auth/admin/update-plan-status/{id}:
 *   put:
 *     summary: Admin update user plan status (pro/standard)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to update plan status for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planStatus
 *             properties:
 *               planStatus:
 *                 type: string
 *                 enum: [pro, standard]
 *                 description: New plan status for the user
 *                 example: "pro"
 *     responses:
 *       200:
 *         description: User plan status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User status updated successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       description: User ID
 *                     email:
 *                       type: string
 *                       description: User email
 *                     firstname:
 *                       type: string
 *                       description: User first name
 *                     lastname:
 *                       type: string
 *                       description: User last name
 *                     previousPlanStatus:
 *                       type: boolean
 *                       description: Previous plan status (true for pro, false for standard)
 *                     currentPlanStatus:
 *                       type: string
 *                       description: Current plan status (pro or standard)
 *                 action:
 *                   type: string
 *                   enum: [USER_ACTIVATED, USER_DEACTIVATED]
 *                   description: Action performed based on status change
 *       400:
 *         description: Bad request - invalid plan status or user ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Plan Status is required"
 *                 allowedValues:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["pro", "standard"]
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */ 

/**
 * @swagger
 * /api/auth/admin/activate/{id}:
 *   put:
 *     summary: Admin activate user account
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to activate
 *     responses:
 *       200:
 *         description: User activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User activated successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Bad request - invalid user ID
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 * 
 * /api/auth/admin/deactivate/{id}:
 *   put:
 *     summary: Admin deactivate user account
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to deactivate
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User deactivated successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Bad request - invalid user ID
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 * 
 * /api/auth/admin/restore/{id}:
 *   put:
 *     summary: Admin restore soft-deleted user account
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to restore
 *     responses:
 *       200:
 *         description: User restored successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User restored successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Bad request - invalid user ID
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 * 
 * /api/auth/admin/delete/{id}:
 *   delete:
 *     summary: Admin permanently delete user account
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to delete permanently
 *     responses:
 *       200:
 *         description: User deleted permanently
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User deleted permanently"
 *                 userId:
 *                   type: string
 *       400:
 *         description: Bad request - invalid user ID
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 * 
 * /api/auth/admin/update/{id}:
 *   put:
 *     summary: Admin update user details
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstname:
 *                 type: string
 *                 description: User's first name
 *               lastname:
 *                 type: string
 *                 description: User's last name
 *               email:
 *                 type: string
 *                 description: User's email address
 *               role:
 *                 type: string
 *                 description: User's role
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User updated successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     firstname:
 *                       type: string
 *                     lastname:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *       400:
 *         description: Bad request - invalid data
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 * 
 * /api/auth/getSingleUser/{id}:
 *   get:
 *     summary: Get single user by ID (Admin)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to retrieve
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/UserWithType'
 *       400:
 *         description: Bad request - invalid user ID
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 * 
 * /api/auth/updateStatus/{id}:
 *   put:
 *     summary: Update user status (Admin)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to update status for
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 description: New user status
 *                 example: "active"
 *     responses:
 *       200:
 *         description: User status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User status updated successfully"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Bad request - invalid status or user ID
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error 
 */

module.exports = router; 