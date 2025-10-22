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
    
    // Check for multer errors
    if (req.fileValidationError) {
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
    
    const result = await ChatService.sendMessage(chatId, userId, messageData);
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
}

module.exports = ChatController;
