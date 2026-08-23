const express = require("express");
const router = express.Router();
const teamController = require("../controllers/teamController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

// Public: set password from invite email
router.post("/accept-invite", teamController.acceptInvite);

// Owner or Admin can invite (controller enforces admin cannot invite admins)
router.post(
  "/invite",
  authMiddleware,
  requireRole("owner", "admin"),
  teamController.inviteTeamMember
);

// Owner only
router.get(
  "/",
  authMiddleware,
  requireRole("owner"),
  teamController.listTeam
);

router.delete(
  "/:userId",
  authMiddleware,
  requireRole("owner"),
  teamController.removeTeamMember
);

module.exports = router;
