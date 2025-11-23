const express = require("express");
const SupportController = require("../controller/SupportController");
const { isAuthenticated } = require("../middlewares/auth.middleware");

const router = express.Router();

// All support routes require authentication
router.post("/", isAuthenticated, SupportController.createSupportMessage);
router.get("/", isAuthenticated, SupportController.getSupportMessages);
router.get("/:id", isAuthenticated, SupportController.getSupportMessage);
router.patch("/:id", isAuthenticated, SupportController.updateSupportMessage);
router.delete("/:id", isAuthenticated, SupportController.deleteSupportMessage);

module.exports = router;

