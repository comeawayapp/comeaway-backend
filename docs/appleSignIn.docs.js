/**
 * @swagger
 * components:
 *   schemas:
 *     AppleSignInRequest:
 *       type: object
 *       required:
 *         - identityToken
 *       properties:
 *         identityToken:
 *           type: string
 *           description: Apple identity token received from Apple Sign In
 *           example: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         user:
 *           type: object
 *           description: Optional user data from Apple (only provided on first sign in)
 *           properties:
 *             name:
 *               type: object
 *               properties:
 *                 firstName:
 *                   type: string
 *                   example: "John"
 *                 lastName:
 *                   type: string
 *                   example: "Doe"
 * 
 *     AppleSignInResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Apple Sign-In successful"
 *         token:
 *           type: string
 *           description: JWT token for authentication
 *           example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *         user:
 *           type: object
 *           properties:
 *             _id:
 *               type: string
 *               example: "64a1b2c3d4e5f6789abcdef0"
 *             firstname:
 *               type: string
 *               example: "John"
 *             lastname:
 *               type: string
 *               example: "Doe"
 *             email:
 *               type: string
 *               example: "john.doe@example.com"
 *             phoneNumber:
 *               type: string
 *               example: "+1234567890"
 *             role:
 *               type: string
 *               example: "user"
 *             isEmailVerified:
 *               type: boolean
 *               example: true
 *             isPro:
 *               type: boolean
 *               example: false
 *             proExpiresAt:
 *               type: string
 *               format: date-time
 *               example: "2024-12-31T23:59:59.000Z"
 *             userType:
 *               type: string
 *               example: "Standard"
 *             activationMethod:
 *               type: string
 *               example: "None"
 *             authProvider:
 *               type: string
 *               example: "apple"
 * 
 *     AppleSignInError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Invalid Apple identity token"
 *         error:
 *           type: string
 *           example: "Token verification failed"
 */

/**
 * @swagger
 * /api/auth/apple-signin:
 *   post:
 *     summary: Apple Sign In authentication
 *     description: Authenticate user using Apple Sign In identity token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AppleSignInRequest'
 *           examples:
 *             firstTimeUser:
 *               summary: First time Apple Sign In
 *               value:
 *                 identityToken: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   name:
 *                     firstName: "John"
 *                     lastName: "Doe"
 *             returningUser:
 *               summary: Returning Apple Sign In user
 *               value:
 *                 identityToken: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Apple Sign In successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppleSignInResponse'
 *       400:
 *         description: Bad request - Invalid or missing identity token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppleSignInError'
 *       404:
 *         description: User not found (soft deleted)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AppleSignInError'
 */

/**
 * Apple Sign In Implementation Guide
 * =================================
 * 
 * This implementation provides secure Apple Sign In authentication for your Node.js backend.
 * 
 * Prerequisites:
 * 1. Apple Developer Account
 * 2. App ID configured with Sign In with Apple capability
 * 3. Service ID for web authentication
 * 4. Private key (.p8 file) for JWT signing
 * 
 * Environment Variables Required:
 * - APPLE_CLIENT_ID: Your Apple app's client ID (Service ID)
 * - JWT_SECRET: Your existing JWT secret
 * 
 * How Apple Sign In Works:
 * 1. Client initiates Apple Sign In
 * 2. Apple returns an identity token (JWT)
 * 3. Backend verifies the token using Apple's public keys
 * 4. Backend extracts user information from the verified token
 * 5. Backend creates or updates user account
 * 6. Backend returns JWT token for API authentication
 * 
 * Token Verification Process:
 * 1. Decode the identity token header to get the key ID (kid)
 * 2. Fetch Apple's public keys from https://appleid.apple.com/auth/keys
 * 3. Find the matching public key using the kid
 * 4. Verify the token signature using the public key
 * 5. Validate token claims (issuer, audience, expiration)
 * 
 * Security Features:
 * - Token signature verification using Apple's public keys
 * - Token expiration validation
 * - Issuer and audience validation
 * - Rate limiting on JWKS requests
 * - Caching of public keys for performance
 * 
 * User Data Handling:
 * - Email is always provided by Apple
 * - Name is only provided on first sign in
 * - Apple ID (sub claim) is stored for future reference
 * - Email verification is automatically set to true
 * 
 * Error Handling:
 * - Invalid token format
 * - Token verification failure
 * - Missing required claims
 * - Network errors during key fetching
 * 
 * Usage Example:
 * ```javascript
 * // Frontend (React Native/Web)
 * const response = await fetch('/api/auth/apple-signin', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *   },
 *   body: JSON.stringify({
 *     identityToken: appleIdentityToken,
 *     user: appleUserData // Optional, only on first sign in
 *   })
 * });
 * 
 * const data = await response.json();
 * if (data.token) {
 *   // Store token and redirect to app
 *   localStorage.setItem('authToken', data.token);
 * }
 * ```
 */
