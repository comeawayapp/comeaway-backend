const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const emailService = require("../services/emailService");
const {
  normalizeEmail,
  findUserByEmailCI,
} = require("./user/entitlementHelper");

const STAFF_ROLES = ["owner", "admin", "content_manager"];
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function accountTypeFromIsPro(isPro) {
  return isPro ? "pro" : "standard";
}

function buildInviteToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      purpose: "team_invite",
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function staffPayload(user) {
  return {
    _id: user._id,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    role: user.role,
    accountType: user.accountType,
    status: user.status,
    isEmailVerified: user.isEmailVerified,
    isPro: user.isPro,
    teamDateAdded: user.teamDateAdded,
  };
}

/**
 * POST /api/team/invite
 * Owner: admin | content_manager
 * Admin: content_manager only
 */
exports.inviteTeamMember = async (req, res) => {
  try {
    const { email, firstname, lastname, role } = req.body;
    const callerRole = req.user.role;

    if (!email || !firstname || !lastname || !role) {
      return res.status(400).json({
        message: "email, firstname, lastname, and role are required",
      });
    }

    if (!["admin", "content_manager"].includes(role)) {
      return res.status(400).json({
        message: 'role must be "admin" or "content_manager"',
      });
    }

    if (callerRole === "admin" && role === "admin") {
      return res.status(403).json({
        message: "Admins cannot invite other Admins",
        code: "FORBIDDEN_ROLE",
      });
    }

    if (callerRole !== "owner" && callerRole !== "admin") {
      return res.status(403).json({
        message: "Insufficient permissions",
        code: "FORBIDDEN_ROLE",
      });
    }

    if (!process.env.ADMIN_APP_URL) {
      return res.status(500).json({
        message: "ADMIN_APP_URL is not configured",
      });
    }

    const normalizedEmail = normalizeEmail(email);
    let existing = await findUserByEmailCI(normalizedEmail);

    if (existing && STAFF_ROLES.includes(existing.role)) {
      return res.status(409).json({
        message: "This email is already a team member",
        code: "ALREADY_ON_TEAM",
      });
    }

    const needsSetPassword =
      !existing ||
      existing.status === "inactive" ||
      !existing.isEmailVerified;

    if (!existing) {
      const placeholder = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
      existing = new User({
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        email: normalizedEmail,
        password: placeholder,
        accountType: "team_member",
        role,
        status: "inactive",
        isEmailVerified: false,
        teamDateAdded: new Date(),
        authProvider: "email",
      });
    } else {
      // Promote existing customer in place — keep isPro / password / status
      existing.firstname = firstname.trim() || existing.firstname;
      existing.lastname = lastname.trim() || existing.lastname;
      existing.email = normalizedEmail;
      existing.accountType = "team_member";
      existing.role = role;
      existing.teamDateAdded = existing.teamDateAdded || new Date();
    }

    let inviteToken = null;
    if (needsSetPassword) {
      inviteToken = buildInviteToken(existing);
      existing.inviteToken = inviteToken;
      existing.inviteTokenExpires = new Date(Date.now() + INVITE_TTL_MS);
    } else {
      existing.inviteToken = undefined;
      existing.inviteTokenExpires = undefined;
    }

    await existing.save();

    if (needsSetPassword) {
      await emailService.sendTeamInviteEmail({
        email: normalizedEmail,
        firstName: existing.firstname,
        role,
        inviteToken,
      });
    } else {
      await emailService.sendTeamAccessGrantedEmail({
        email: normalizedEmail,
        firstName: existing.firstname,
        role,
      });
    }

    return res.status(201).json({
      message: needsSetPassword
        ? "Invitation sent. Team member must set a password."
        : "Team access granted. Member can sign in with their existing password.",
      user: staffPayload(existing),
      inviteType: needsSetPassword ? "set_password" : "access_granted",
    });
  } catch (error) {
    console.error("inviteTeamMember error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * POST /api/team/accept-invite (public)
 */
exports.acceptInvite = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ message: "token and password are required" });
    }
    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (_) {
      return res.status(400).json({ message: "Invalid or expired invite token" });
    }

    if (decoded.purpose !== "team_invite") {
      return res.status(400).json({ message: "Invalid invite token" });
    }

    const found = await User.findById(decoded.userId);
    if (!found) {
      return res.status(404).json({ message: "User not found" });
    }
    if (found.inviteToken !== token) {
      return res.status(400).json({ message: "Invite token is invalid or already used" });
    }
    if (
      !found.inviteTokenExpires ||
      new Date(found.inviteTokenExpires) < new Date()
    ) {
      return res.status(400).json({ message: "Invite token has expired" });
    }
    if (!STAFF_ROLES.includes(found.role)) {
      return res.status(400).json({ message: "This invite is no longer valid" });
    }

    found.password = await bcrypt.hash(password, 10);
    found.status = "active";
    found.isEmailVerified = true;
    found.inviteToken = undefined;
    found.inviteTokenExpires = undefined;
    found.accountType = "team_member";
    await found.save();

    const jwtToken = jwt.sign({ _id: found._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    return res.status(200).json({
      message: "Password set successfully. You are now signed in.",
      token: jwtToken,
      user: staffPayload(found),
    });
  } catch (error) {
    console.error("acceptInvite error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * GET /api/team — Owner only
 */
exports.listTeam = async (req, res) => {
  try {
    const owner = await User.findOne({ role: "owner" }).select(
      "-password -inviteToken -resetPasswordToken -emailVerificationOTP"
    );

    const members = await User.find({
      accountType: "team_member",
      role: { $in: ["admin", "content_manager"] },
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    })
      .select("-password -inviteToken -resetPasswordToken -emailVerificationOTP")
      .sort({ teamDateAdded: -1 });

    const team = [];

    if (owner) {
      team.push({
        _id: owner._id,
        email: owner.email,
        firstname: owner.firstname,
        lastname: owner.lastname,
        role: "owner",
        accountType: owner.accountType,
        teamDateAdded: null,
        canRemove: false,
        status: owner.status,
      });
    }

    for (const m of members) {
      team.push({
        _id: m._id,
        email: m.email,
        firstname: m.firstname,
        lastname: m.lastname,
        role: m.role,
        accountType: m.accountType,
        teamDateAdded: m.teamDateAdded,
        canRemove: true,
        status: m.status,
      });
    }

    return res.status(200).json({
      team,
      total: team.length,
    });
  } catch (error) {
    console.error("listTeam error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * DELETE /api/team/:userId — Owner only
 */
exports.removeTeamMember = async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || !userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    if (req.user._id.toString() === userId) {
      return res.status(400).json({ message: "You cannot remove yourself" });
    }

    const target = await User.findById(userId);
    if (!target) {
      return res.status(404).json({ message: "User not found" });
    }
    if (target.role === "owner") {
      return res.status(400).json({ message: "Cannot remove the Owner" });
    }
    if (!["admin", "content_manager"].includes(target.role)) {
      return res.status(400).json({ message: "User is not a removable team member" });
    }

    target.role = null;
    target.accountType = accountTypeFromIsPro(target.isPro);
    target.teamDateAdded = null;
    target.inviteToken = undefined;
    target.inviteTokenExpires = undefined;
    // Keep status active as regular customer
    if (target.status !== "active") {
      target.status = "active";
    }
    await target.save();

    return res.status(200).json({
      message: "Team member removed. Account retained as a regular user.",
      user: {
        _id: target._id,
        email: target.email,
        role: target.role,
        accountType: target.accountType,
        isPro: target.isPro,
      },
    });
  } catch (error) {
    console.error("removeTeamMember error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};
