const express = require("express");
const MediaLibraryController = require("../controller/MediaLibraryController");
const { isAuthenticated } = require("../middlewares/auth.middleware");

const router = express.Router();

// Media Library Routes
router.get("/", isAuthenticated, MediaLibraryController.getUserMedia);
router.get("/stats", isAuthenticated, MediaLibraryController.getMediaStats);
router.get("/chat/:chatId", isAuthenticated, MediaLibraryController.getChatMedia);
router.delete("/:mediaId", isAuthenticated, MediaLibraryController.deleteMedia);

// Debug endpoint to check database directly
router.get("/debug", isAuthenticated, async (req, res) => {
  try {
    const { id: userId } = req.user;
    const prisma = require("../../lib/prisma");
    
    console.log('=== Debug Media Library ===');
    console.log('UserId:', userId);
    
    // Get all media records for this user
    const allMedia = await prisma.mediaLibrary.findMany({
      where: { userId },
      include: {
        chat: {
          select: { id: true, name: true }
        }
      },
      orderBy: { uploadedAt: 'desc' }
    });
    
    console.log('All media records:', allMedia);
    
    // Get count
    const count = await prisma.mediaLibrary.count({ where: { userId } });
    console.log('Total count:', count);
    
    res.json({
      status: true,
      message: "Debug data retrieved",
      data: {
        userId,
        totalCount: count,
        mediaRecords: allMedia
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    res.status(500).json({
      status: false,
      message: error.message,
      data: []
    });
  }
});

module.exports = router;
