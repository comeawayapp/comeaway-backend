const express = require("express");
const router = express.Router();
const adminDashboardController = require("../controllers/adminDashboardController");
const auth = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const staffDashboard = requireRole("owner", "admin");

router.get(
  "/dashboard",
  auth,
  staffDashboard,
  adminDashboardController.getDashboard
);

module.exports = router;
