const express = require("express");
const router = express.Router();
const mixController = require("../controllers/mixController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");
const { checkProStatus } = require("../middleware/index");

const contentWrite = requireRole("owner", "admin", "content_manager");
const contentDelete = requireRole("owner", "admin");

router.post("/add-mix", authMiddleware, contentWrite, mixController.createMix);
router.put(
  "/updateMix/:id",
  authMiddleware,
  contentWrite,
  mixController.updateMix
);
router.delete(
  "/deleteMix/:id",
  authMiddleware,
  contentDelete,
  mixController.deleteMix
);

router.get(
  "/getMixes",
  authMiddleware,
  checkProStatus,
  mixController.getMixes
);
router.get("/getSingleMix/:id", authMiddleware, mixController.getMixById);

module.exports = router;
