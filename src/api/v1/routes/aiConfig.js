const express = require("express");
const AIConfigController = require("../controller/AIConfigController");
const { isAuthenticated } = require("../middlewares/auth.middleware");

const router = express.Router();

// AI Configuration routes
router.get("/", isAuthenticated, AIConfigController.getAIConfig);
router.patch("/", isAuthenticated, AIConfigController.updateAIConfig);
router.delete("/", isAuthenticated, AIConfigController.deleteAIConfig);

module.exports = router;
