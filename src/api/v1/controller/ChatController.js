const ChatService = require("../services/chat.service");
const catchAsyncHandler = require("../utils/catchAsyncHandler");

class ChatController {
  /**
   * Create a new AI chat
   * POST /api/v1/chats
   */
  static createChat = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const result = await ChatService.createChat(userId, req.body);
    return res.status(201).json(result);
  });

  /**
   * Get all chats for the authenticated user
   * GET /api/v1/chats
   */
  static getUserChats = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const result = await ChatService.getUserChats(userId, req.query);
    return res.status(200).json(result);
  });

  /**
   * Get chat details with messages
   * GET /api/v1/chats/:chatId
   */
  static getChatDetails = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const { chatId } = req.params;
    const result = await ChatService.getChatDetails(chatId, userId);
    return res.status(200).json(result);
  });

  /**
   * Send message to AI (text, image, audio, video)
   * POST /api/v1/chats/:chatId/messages
   */
  static sendMessage = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const { chatId } = req.params;
    
    console.log('=== ChatController.sendMessage START ===');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    console.log('Request files:', req.files);
    console.log('User ID:', userId);
    console.log('Chat ID:', chatId);
    
    // Check for multer errors
    if (req.fileValidationError) {
      console.log('Multer validation error:', req.fileValidationError);
      return res.status(400).json({
        status: false,
        message: req.fileValidationError,
        data: []
      });
    }
    
    // Handle different types of messages
    const messageData = {
      content: req.body.content,
      replyToId: req.body.replyToId,
      imageFile: req.files?.image?.[0] || req.file, // Handle single file or array
      audioFile: req.files?.audio?.[0],
      videoFile: req.files?.video?.[0],
    };
    
    console.log('Message data prepared:', {
      content: messageData.content,
      hasImageFile: !!messageData.imageFile,
      hasAudioFile: !!messageData.audioFile,
      hasVideoFile: !!messageData.videoFile,
      imageFileDetails: messageData.imageFile ? {
        originalname: messageData.imageFile.originalname,
        mimetype: messageData.imageFile.mimetype,
        size: messageData.imageFile.size
      } : null
    });
    
    const result = await ChatService.sendMessage(chatId, userId, messageData);
    console.log('=== ChatController.sendMessage SUCCESS ===', result);
    return res.status(200).json(result);
  });

  /**
   * Get messages for a chat
   * GET /api/v1/chats/:chatId/messages
   */
  static getChatMessages = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const { chatId } = req.params;
    const result = await ChatService.getChatMessages(chatId, userId, req.query);
    return res.status(200).json(result);
  });

  /**
   * Update chat settings
   * PATCH /api/v1/chats/:chatId
   */
  static updateChat = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const { chatId } = req.params;
    const result = await ChatService.updateChat(chatId, userId, req.body);
    return res.status(200).json(result);
  });

  /**
   * Delete chat
   * DELETE /api/v1/chats/:chatId
   */
  static deleteChat = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const { chatId } = req.params;
    const result = await ChatService.deleteChat(chatId, userId);
    return res.status(200).json(result);
  });

  /**
   * Search conversations (chats and messages)
   * GET /api/v1/chats/search
   */
  static searchConversations = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const result = await ChatService.searchConversations(userId, req.query);
    return res.status(200).json(result);
  });

  /**
   * Get available AI models
   * GET /api/v1/ai/models
   */
  static getAvailableModels = catchAsyncHandler(async (req, res) => {
    const result = await ChatService.getAvailableModels();
    return res.status(200).json(result);
  });

  /**
   * Add message to favorites
   * POST /api/v1/chats/:chatId/messages/:messageId/favorite
   */
  static addToFavorites = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const { chatId, messageId } = req.params;
    const result = await ChatService.addToFavorites(chatId, messageId, userId);
    return res.status(200).json(result);
  });

  /**
   * Remove message from favorites
   * DELETE /api/v1/chats/:chatId/messages/:messageId/favorite
   */
  static removeFromFavorites = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const { chatId, messageId } = req.params;
    const result = await ChatService.removeFromFavorites(chatId, messageId, userId);
    return res.status(200).json(result);
  });

  /**
   * Toggle message favorite status
   * POST /api/v1/chats/:chatId/messages/:messageId/toggle-favorite
   */
  static toggleFavorite = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const { chatId, messageId } = req.params;
    const result = await ChatService.toggleFavorite(chatId, messageId, userId);
    return res.status(200).json(result);
  });

  /**
   * Get all favorite messages for a user
   * GET /api/v1/favorites/messages
   */
  static getFavoriteMessages = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const result = await ChatService.getFavoriteMessages(userId, req.query);
    return res.status(200).json(result);
  });

  /**
   * Get all favorite messages for a specific user (by userId)
   * GET /api/v1/favorites/messages/:userId
   */
  static getFavoriteMessagesByUserId = catchAsyncHandler(async (req, res) => {
    const { userId } = req.params;
    const result = await ChatService.getFavoriteMessages(userId, req.query);
    return res.status(200).json(result);
  });

  /**
   * Get favorite messages for a specific chat
   * GET /api/v1/chats/:chatId/favorites
   */
  static getChatFavorites = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const { chatId } = req.params;
    const result = await ChatService.getChatFavorites(chatId, userId, req.query);
    return res.status(200).json(result);
  });

  /**
   * Get journey page data
   * GET /api/v1/journey
   */
  static getJourneyPageData = catchAsyncHandler(async (req, res) => {
    const { id: userId } = req.user;
    const result = await ChatService.getJourneyPageData(userId, req.query);
    return res.status(200).json(result);
  });
}

module.exports = ChatController;
