const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/catagoryController");
const authMiddleware = require("../middleware/auth");
const requireRole = require("../middleware/requireRole");

const contentWrite = requireRole("owner", "admin", "content_manager");
const contentDelete = requireRole("owner", "admin");

router.post(
  "/create-catagory",
  authMiddleware,
  contentWrite,
  categoryController.createCategory
);
router.get("/getCatagories", categoryController.getCategories);
router.get("/getCatagory/:id", categoryController.getCategoryById);
router.put(
  "/updateCatagory/:id",
  authMiddleware,
  contentWrite,
  categoryController.updateCategory
);
router.delete(
  "/deleteCatagory/:id",
  authMiddleware,
  contentDelete,
  categoryController.deleteCategory
);

module.exports = router;
