const express = require("express");
const ApiKeyController = require("../controller/ApiKeyController");
const { isAuthenticated, restrictTo } = require("../middlewares/auth.middleware");

const router = express.Router();

// All API key routes require authentication
// Optionally restrict to ADMIN role for security
// router.use(isAuthenticated, restrictTo("ADMIN"));

// API Key Routes
router.post("/", isAuthenticated, ApiKeyController.createOrUpdateApiKey);
router.get("/", isAuthenticated, ApiKeyController.getAllApiKeys);
router.get("/:id", isAuthenticated, ApiKeyController.getApiKeyById);
router.patch("/:id", isAuthenticated, ApiKeyController.updateApiKey);
router.delete("/:id", isAuthenticated, ApiKeyController.deleteApiKey);
router.patch("/:id/toggle", isAuthenticated, ApiKeyController.toggleApiKeyStatus);

module.exports = router;

