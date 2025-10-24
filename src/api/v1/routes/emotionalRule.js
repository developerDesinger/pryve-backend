const express = require("express");
const EmotionalRuleController = require("../controller/EmotionalRuleController");
const { isAuthenticated } = require("../middlewares/auth.middleware");

const router = express.Router();

// Emotional Rule Routes
router.get("/", isAuthenticated, EmotionalRuleController.getAllEmotionalRules);
router.get(
  "/:id",
  isAuthenticated,
  EmotionalRuleController.getEmotionalRuleById
);
router.post("/", isAuthenticated, EmotionalRuleController.createEmotionalRule);
router.patch(
  "/:id",
  isAuthenticated,
  EmotionalRuleController.updateEmotionalRule
);
router.delete(
  "/:id",
  isAuthenticated,
  EmotionalRuleController.deleteEmotionalRule
);
router.patch(
  "/:id/toggle",
  isAuthenticated,
  EmotionalRuleController.toggleEmotionalRuleStatus
);
router.get(
  "/trigger/:trigger",
  isAuthenticated,
  EmotionalRuleController.getEmotionalRulesByTrigger
);

module.exports = router;
