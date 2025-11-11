const express = require("express");
const ChatSettingsController = require("../controller/ChatSettingsController");
const { isAuthenticated } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", isAuthenticated, ChatSettingsController.getChatSettings);
router.patch("/", isAuthenticated, ChatSettingsController.updateChatSettings);

module.exports = router;
