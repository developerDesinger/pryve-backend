const express = require("express");
const SettingsController = require("../controller/SettingsController");
const { isAuthenticated, restrictTo } = require("../middlewares/auth.middleware");

const router = express.Router();

// All settings routes require authentication
// Optionally restrict to ADMIN role for certain operations
// router.use(isAuthenticated, restrictTo("ADMIN"));

// Settings Routes
router.get("/", isAuthenticated, SettingsController.getCompleteSettings);

// Feature Toggles Routes
router.get("/feature-toggles", isAuthenticated, SettingsController.getAllFeatureToggles);
router.get("/feature-toggles/:name", isAuthenticated, SettingsController.getFeatureToggleByName);
router.patch("/feature-toggles/:name", isAuthenticated, SettingsController.updateFeatureToggle);
router.patch("/feature-toggles/:name/toggle", isAuthenticated, SettingsController.toggleFeature);
router.post("/feature-toggles/initialize", isAuthenticated, SettingsController.initializeFeatureToggles);

// System Settings Routes
router.get("/system", isAuthenticated, SettingsController.getAllSystemSettings);
router.get("/system-language", isAuthenticated, SettingsController.getSystemLanguage);
router.patch("/system-language", isAuthenticated, SettingsController.updateSystemLanguage);

module.exports = router;

