/**
 * @swagger
 * components:
 *   schemas:
 *     TeamInviteRequest:
 *       type: object
 *       required:
 *         - email
 *         - firstname
 *         - lastname
 *         - role
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: manager@example.com
 *         firstname:
 *           type: string
 *           example: Jane
 *         lastname:
 *           type: string
 *           example: Doe
 *         role:
 *           type: string
 *           enum: [admin, content_manager]
 *           description: Owner may invite admin or content_manager; Admin may invite content_manager only
 *
 *     TeamAcceptInviteRequest:
 *       type: object
 *       required:
 *         - token
 *         - password
 *       properties:
 *         token:
 *           type: string
 *           description: Invite token from set-password email link
 *         password:
 *           type: string
 *           minLength: 6
 *
 *     TeamMember:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *         email:
 *           type: string
 *         firstname:
 *           type: string
 *         lastname:
 *           type: string
 *         role:
 *           type: string
 *           enum: [owner, admin, content_manager]
 *           nullable: true
 *         accountType:
 *           type: string
 *           enum: [standard, pro, team_member]
 *         teamDateAdded:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         canRemove:
 *           type: boolean
 *         status:
 *           type: string
 *           enum: [active, inactive]
 *         isEmailVerified:
 *           type: boolean
 *         isPro:
 *           type: boolean
 *
 *     TeamInviteResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         inviteType:
 *           type: string
 *           enum: [set_password, access_granted]
 *         user:
 *           $ref: '#/components/schemas/TeamMember'
 *
 *     TeamListResponse:
 *       type: object
 *       properties:
 *         team:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/TeamMember'
 *         total:
 *           type: number
 *
 *     TeamAcceptInviteResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *         token:
 *           type: string
 *         user:
 *           $ref: '#/components/schemas/TeamMember'
 */

/**
 * @swagger
 * tags:
 *   name: Team
 *   description: Team member invite, accept, list, and remove (admin app)
 */

/**
 * @swagger
 * /api/team/invite:
 *   post:
 *     summary: Invite a team member
 *     description: |
 *       **Auth:** Owner or Admin (Admin cannot invite Admin).
 *
 *       - New/inactive user → set-password email (`inviteType: set_password`)
 *       - Active verified customer → access-granted email, keeps password (`inviteType: access_granted`)
 *
 *       Requires `ADMIN_APP_URL` in server env.
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TeamInviteRequest'
 *           example:
 *             email: cm@example.com
 *             firstname: Casey
 *             lastname: Manager
 *             role: content_manager
 *     responses:
 *       201:
 *         description: Invitation sent or access granted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TeamInviteResponse'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Insufficient permissions
 *       409:
 *         description: Email already on team
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/team/accept-invite:
 *   post:
 *     summary: Accept invite and set password
 *     description: Public endpoint. Use token from invite email. Returns JWT on success.
 *     tags: [Team]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TeamAcceptInviteRequest'
 *           example:
 *             token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *             password: SecurePass1
 *     responses:
 *       200:
 *         description: Password set and user signed in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TeamAcceptInviteResponse'
 *       400:
 *         description: Invalid or expired token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/team:
 *   get:
 *     summary: List team members
 *     description: Owner only. Owner listed first, then Admins and Content Managers.
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Team list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TeamListResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Owner role required
 *       500:
 *         description: Server error
 */

/**
 * @swagger
 * /api/team/{userId}:
 *   delete:
 *     summary: Remove a team member
 *     description: |
 *       Owner only. Demotes user to customer (`role: null`, `accountType` from `isPro`).
 *       Cannot remove self or Owner.
 *     tags: [Team]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB user id
 *     responses:
 *       200:
 *         description: Team member removed
 *       400:
 *         description: Invalid id or cannot remove self/owner
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Owner role required
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
