const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/catagoryController");
const authMiddleware = require("../middleware/auth"); // Updated path
// Assuming you have an auth middleware to verify JWT

// Create category route
router.post("/create-catagory", authMiddleware, categoryController.createCategory);
// Get all categories route
router.get("/getCatagories", categoryController.getCategories);
// Get category by ID route
router.get("/getCatagory/:id", categoryController.getCategoryById);
// Update category route
router.put("/updateCatagory/:id",authMiddleware, categoryController.updateCategory);
// Delete category route
router.delete("/deleteCatagory/:id", authMiddleware, categoryController.deleteCategory);

module.exports = router;