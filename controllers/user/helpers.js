const jwt = require("jsonwebtoken");
const jwksRsa = require('jwks-rsa');
const user = require("../../models/user");

// Helper to check and update Pro status
async function checkAndUpdateProStatus(userDoc) {
  // Defensive: ensure proExpiresAt is a valid date
  let expired = false;
  let activationCodeExpired = false;
  
  if (userDoc.isPro) {
    // Check subscription expiry
    if (
      !userDoc.proExpiresAt ||
      isNaN(new Date(userDoc.proExpiresAt).getTime())
    ) {
      // No expiry date or invalid date: treat as expired
      expired = true;
    } else {
      // Compare using UTC to avoid timezone issues
      const now = new Date();
      const expiry = new Date(userDoc.proExpiresAt);
      if (expiry.getTime() < now.getTime()) {
        expired = true;
      }
    }
    
    // Check activation code expiry if user was activated by code
    if (userDoc.activationMode === 'code' && userDoc.proExpiresAt) {
      const now = new Date();
      const codeExpiry = new Date(userDoc.proExpiresAt);
      if (codeExpiry.getTime() < now.getTime()) {
        activationCodeExpired = true;
      }
    }
  }
  
  // Downgrade to standard user if either subscription or activation code expired
  if (userDoc.isPro && (expired || activationCodeExpired)) {
    userDoc.isPro = false;
    userDoc.activationMode = null; // Clear activation mode when expired
    await userDoc.save();
  }
  
  return userDoc;
}

// Helper function to verify Apple identity token
async function verifyAppleToken(identityToken) {
  try {
    // Apple's JWKS endpoint
    const client = jwksRsa({
      jwksUri: 'https://appleid.apple.com/auth/keys',
      cache: true,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 5  
    });

    // Get the key ID from the token header
    const decoded = jwt.decode(identityToken, { complete: true });
    if (!decoded || !decoded.header || !decoded.header.kid) {
      throw new Error('Invalid token format');
    }

    // Get the signing key
    const key = await client.getSigningKey(decoded?.header?.kid);
    const signingKey = key.getPublicKey();

    // Verify the token
    const verified = jwt.verify(identityToken, signingKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      audience: [process.env.APPLE_CLIENT_ID, 'com.payfiorg.kabo'], // Allow multiple audiences
    });

    return verified;
  } catch (error) {
    console.error('Apple token verification failed:', error);
    return null;
  }
}

// Helper function to validate profile data
const validateProfileData = (firstname, lastname, phoneNumber) => {
  const errors = [];

  // Validate firstname
  if (!firstname || typeof firstname !== "string") {
    errors.push("First name is required");
  } else if (firstname.length < 2 || firstname.length > 50) {
    errors.push("First name must be between 2 and 50 characters");
  } else if (!/^[a-zA-Z\s\-']+$/.test(firstname.trim())) {
    errors.push(
      "First name can only contain letters, spaces, hyphens, and apostrophes"
    );
  }

  // Validate lastname
  if (!lastname || typeof lastname !== "string") {
    errors.push("Last name is required");
  } else if (lastname.length < 2 || lastname.length > 50) {
    errors.push("Last name must be between 2 and 50 characters");
  } else if (!/^[a-zA-Z\s\-']+$/.test(lastname.trim())) {
    errors.push(
      "Last name can only contain letters, spaces, hyphens, and apostrophes"
    );
  }

  // Validate phoneNumber (optional)
  if (phoneNumber) {
    // Basic phone number validation - allows various international formats
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ""))) {
      errors.push("Please enter a valid phone number");
    }
  }

  return errors;
};

// Helper function to sanitize input data
const sanitizeInput = (str) => {
  if (!str) return "";
  return str.trim().replace(/[<>]/g, ""); // Basic XSS prevention
};

// Soft-deleted = inactive with a deletion timestamp
function isSoftDeleted(userDoc) {
  return userDoc?.status === "inactive" && !!userDoc?.deletedAt;
}

/**
 * Free the unique email on a soft-deleted user so a new account can use it.
 * Renames to local+Deleted_{timestamp}@domain and clears appleId if set.
 * Related data stays attached to this user _id.
 */
async function freeSoftDeletedUserEmail(userDoc) {
  const originalEmail = userDoc.email;
  const atIndex = originalEmail.lastIndexOf("@");

  if (atIndex === -1) {
    userDoc.email = `${originalEmail}+Deleted_${Date.now()}`;
  } else {
    const local = originalEmail.slice(0, atIndex);
    const domain = originalEmail.slice(atIndex + 1);
    userDoc.email = `${local}+Deleted_${Date.now()}@${domain}`;
  }

  // Allow Apple re-registration to claim the same appleId on a new account
  if (userDoc.appleId) {
    userDoc.appleId = undefined;
  }

  await userDoc.save();
  return originalEmail;
}

// Helper function to check rate limiting
const checkProfileUpdateRateLimit = (user) => {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Reset count if it's been more than an hour since last update
  if (!user.profileLastUpdated || user.profileLastUpdated < oneHourAgo) {
    return { allowed: true, resetCount: true };
  }

  // Check if user has exceeded the limit
  if (user.profileUpdateCount >= 10) {
    return {
      allowed: false,
      resetCount: false,
      timeUntilReset: Math.ceil(
        (user.profileLastUpdated.getTime() + 60 * 60 * 1000 - now.getTime()) /
          60000
      ),
    };
  }

  return { allowed: true, resetCount: false };
};

module.exports = {
  checkAndUpdateProStatus,
  verifyAppleToken,
  validateProfileData,
  sanitizeInput,
  checkProfileUpdateRateLimit,
  isSoftDeleted,
  freeSoftDeletedUserEmail,
};

