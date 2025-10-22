const MediaLibraryService = require("../services/mediaLibrary.service");
const catchAsyncHandler = require("../utils/catchAsyncHandler");

class MediaLibraryController {
  /**
   * Get all media files for the authenticated user
   * GET /api/v1/media
   */
  static getUserMedia = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const result = await MediaLibraryService.getUserMedia(userId, req.query);
    return res.status(200).json(result);
  });

  /**
   * Get media files for a specific chat
   * GET /api/v1/media/chat/:chatId
   */
  static getChatMedia = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const { chatId } = req.params;
    const result = await MediaLibraryService.getChatMedia(chatId, userId, req.query);
    return res.status(200).json(result);
  });

  /**
   * Delete a media file
   * DELETE /api/v1/media/:mediaId
   */
  static deleteMedia = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const { mediaId } = req.params;
    const result = await MediaLibraryService.deleteMedia(mediaId, userId);
    return res.status(200).json(result);
  });

  /**
   * Get media statistics for the user
   * GET /api/v1/media/stats
   */
  static getMediaStats = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const result = await MediaLibraryService.getMediaStats(userId);
    return res.status(200).json(result);
  });
}

module.exports = MediaLibraryController;
