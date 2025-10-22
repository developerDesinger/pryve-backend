const express = require("express");
const MediaLibraryController = require("../controller/MediaLibraryController");
const { isAuthenticated } = require("../middlewares/auth.middleware");

const router = express.Router();

// Media Library Routes
router.get("/", isAuthenticated, MediaLibraryController.getUserMedia);
router.get("/stats", isAuthenticated, MediaLibraryController.getMediaStats);
router.get("/chat/:chatId", isAuthenticated, MediaLibraryController.getChatMedia);
router.delete("/:mediaId", isAuthenticated, MediaLibraryController.deleteMedia);

module.exports = router;
