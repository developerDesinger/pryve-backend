const express = require("express");
const multer = require("multer");
const path = require("path");
const ChatController = require("../controller/ChatController");
const { isAuthenticated } = require("../middlewares/auth.middleware");

const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage(); // Store files in memory for OpenAI processing
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit (OpenAI's limit)
  },
  fileFilter: (req, file, cb) => {
    // Allow images, audio, and video files
    const allowedExtensions =
      /\.(jpeg|jpg|png|gif|webp|mp3|wav|m4a|ogg|mp4|avi|mov|webm)$/i;
    const allowedMimeTypes = /^(image|audio|video)\//;

    const hasValidExtension = allowedExtensions.test(file.originalname);
    const hasValidMimeType = allowedMimeTypes.test(file.mimetype);

    // Accept file if either extension or mime type is valid
    if (hasValidExtension || hasValidMimeType) {
      return cb(null, true);
    } else {
      console.log("File rejected:", {
        originalname: file.originalname,
        mimetype: file.mimetype,
        hasValidExtension,
        hasValidMimeType,
      });
      cb(new Error("Only images, audio, and video files are allowed!"));
    }
  },
});

// Chat Management Routes
router.post("/", isAuthenticated, ChatController.createChat);
router.get("/", isAuthenticated, ChatController.getUserChats);
router.get("/search", isAuthenticated, ChatController.searchConversations);
router.get("/ai/models", ChatController.getAvailableModels);
router.get(
  "/favorites/messages",
  isAuthenticated,
  ChatController.getFavoriteMessages
);
router.get(
  "/favorites/messages/:userId",
  isAuthenticated,
  ChatController.getFavoriteMessagesByUserId
);
router.get(
  "/journey/messages",
  isAuthenticated,
  ChatController.getJourneyMessages
);
router.get("/journey", isAuthenticated, ChatController.getJourneyPageData);
router.get("/:chatId", isAuthenticated, ChatController.getChatDetails);
router.patch("/:chatId", isAuthenticated, ChatController.updateChat);
router.delete("/:chatId", isAuthenticated, ChatController.deleteChat);

// Message Routes - Handle text, image, audio, video in one endpoint
router.post(
  "/:chatId/messages",
  isAuthenticated,
  (req, res, next) => {
    console.log("=== Multer Upload Middleware ===");
    console.log("Request headers:", req.headers);
    console.log("Content-Type:", req.headers["content-type"]);

    upload.single("file")(req, res, (err) => {
      if (err) {
        console.log("Multer error:", err);
        return res.status(400).json({
          status: false,
          message: err.message,
          data: [],
        });
      }
      console.log("Multer processing completed successfully");
      console.log("File after multer:", req.file);
      next();
    });
  },
  ChatController.sendMessage
);

// OPTIMIZATION: Streaming endpoint for real-time AI responses
// POST /api/v1/chats/:chatId/messages/stream
router.post(
  "/:chatId/messages/stream",
  isAuthenticated,
  (req, res, next) => {
    // Handle file uploads (though streaming currently only supports text)
    upload.single("file")(req, res, (err) => {
      if (err) {
        res.write(`data: ${JSON.stringify({ 
          type: 'error', 
          message: err.message 
        })}\n\n`);
        res.end();
        return;
      }
      next();
    });
  },
  ChatController.sendMessageStream
);

router.get(
  "/:chatId/messages",
  isAuthenticated,
  ChatController.getChatMessages
);

// Favorite Routes for specific chats and messages
router.get(
  "/:chatId/favorites",
  isAuthenticated,
  ChatController.getChatFavorites
);
router.post(
  "/:chatId/messages/:messageId/favorite",
  isAuthenticated,
  ChatController.addToFavorites
);
router.delete(
  "/:chatId/messages/:messageId/favorite",
  isAuthenticated,
  ChatController.removeFromFavorites
);
router.post(
  "/:chatId/messages/:messageId/toggle-favorite",
  isAuthenticated,
  ChatController.toggleFavorite
);
router.delete(
  "/:chatId/messages/:messageId/remove-favorite",
  isAuthenticated,
  ChatController.removeFavoriteMessage
);

// Remove all favorite messages
router.delete(
  "/favorites/remove-all",
  isAuthenticated,
  ChatController.removeAllFavoriteMessages
);

// Test endpoint for file upload debugging
router.post("/test-upload", isAuthenticated, (req, res, next) => {
  console.log("=== Test Upload Endpoint ===");
  console.log("Request body:", req.body);
  console.log("Request file:", req.file);
  console.log("Request files:", req.files);

  upload.single("file")(req, res, (err) => {
    if (err) {
      console.log("Multer error in test:", err);
      return res.status(400).json({
        status: false,
        message: err.message,
        data: [],
      });
    }

    console.log("Test upload successful");
    res.json({
      status: true,
      message: "File upload test successful",
      data: {
        file: req.file
          ? {
              originalname: req.file.originalname,
              mimetype: req.file.mimetype,
              size: req.file.size,
              hasBuffer: !!req.file.buffer,
            }
          : null,
      },
    });
  });
});

module.exports = router;
