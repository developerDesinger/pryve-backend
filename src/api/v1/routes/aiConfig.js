const express = require("express");
const AIConfigController = require("../controller/AIConfigController");
const { isAuthenticated } = require("../middlewares/auth.middleware");

const router = express.Router();

// AI Configuration routes
// Progress route must come before the general routes to avoid route conflicts
router.get("/progress/:sessionId", AIConfigController.getAIConfigProgress);
router.get("/", isAuthenticated, AIConfigController.getAIConfig);
router.patch("/", isAuthenticated, AIConfigController.updateAIConfig);
router.delete("/", isAuthenticated, AIConfigController.deleteAIConfig);

module.exports = router;
