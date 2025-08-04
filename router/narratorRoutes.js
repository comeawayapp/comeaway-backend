const express = require("express");
const router = express.Router();
const narratorController = require("../controllers/narratorController");

// Get all narrators
router.get("/all", narratorController.getAllNarrators);
router.post("/create", narratorController.createNarrator);

module.exports = router;