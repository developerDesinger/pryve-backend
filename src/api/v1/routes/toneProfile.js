const express = require("express");
const ToneProfileController = require("../controller/ToneProfileController");
const { isAuthenticated } = require("../middlewares/auth.middleware");

const router = express.Router();

// Tone Profile Routes
router.get("/", isAuthenticated, ToneProfileController.getAllToneProfiles);
router.get("/:id", isAuthenticated, ToneProfileController.getToneProfileById);
router.post("/", isAuthenticated, ToneProfileController.createToneProfile);
router.patch("/:id", isAuthenticated, ToneProfileController.updateToneProfile);
router.delete("/:id", isAuthenticated, ToneProfileController.deleteToneProfile);
router.patch(
  "/:id/toggle",
  isAuthenticated,
  ToneProfileController.toggleToneProfileStatus
);

module.exports = router;
