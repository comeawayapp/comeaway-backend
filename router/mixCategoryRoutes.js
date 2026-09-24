const express = require("express");
const router = express.Router();
const mixCategoryController = require("../controllers/mixCategoryController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const contentWrite = requireRole("owner", "admin", "content_manager");
const contentDelete = requireRole("owner", "admin");

router.post(
  "/create",
  authMiddleware,
  contentWrite,
  mixCategoryController.createMixCategory
);

router.get("/", authMiddleware, mixCategoryController.getMixCategories);

// Nested mixes before bare :id
router.get(
  "/:id/mixes",
  authMiddleware,
  mixCategoryController.getMixCategoryWithMixes
);

router.get("/:id", authMiddleware, mixCategoryController.getMixCategoryById);

router.put(
  "/:id",
  authMiddleware,
  contentWrite,
  mixCategoryController.updateMixCategory
);

router.delete(
  "/:id",
  authMiddleware,
  contentDelete,
  mixCategoryController.deleteMixCategory
);

module.exports = router;
