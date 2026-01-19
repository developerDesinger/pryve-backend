const express = require("express");
const SystemRuleController = require("../controller/SystemRuleController");
const { isAuthenticated } = require("../middlewares/auth.middleware");

const router = express.Router();

// System Rule Routes
router.get("/", isAuthenticated, SystemRuleController.getAllSystemRules);
router.get("/active", isAuthenticated, SystemRuleController.getActiveSystemRules);
router.get(
  "/:id",
  isAuthenticated,
  SystemRuleController.getSystemRuleById
);
router.post("/", isAuthenticated, SystemRuleController.createSystemRule);
router.patch(
  "/:id",
  isAuthenticated,
  SystemRuleController.updateSystemRule
);
router.delete(
  "/:id",
  isAuthenticated,
  SystemRuleController.deleteSystemRule
);
router.patch(
  "/:id/toggle",
  isAuthenticated,
  SystemRuleController.toggleSystemRuleStatus
);
router.get(
  "/category/:category",
  isAuthenticated,
  SystemRuleController.getSystemRulesByCategory
);

module.exports = router;