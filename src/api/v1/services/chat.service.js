const OpenAI = require("openai");
const prisma = require("../../../lib/prisma");
const AppError = require("../utils/AppError");
const HttpStatusCodes = require("../enums/httpStatusCode");
const MediaLibraryService = require("./mediaLibrary.service");
const EmotionDetectionService = require("../utils/emotionDetection");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper to compute zodiac sign from birthday
function getZodiacSign(b) {
  if (!b) return null;
  const d = new Date(b);
  if (isNaN(d)) return null;
  const m = d.getUTCMonth() + 1,
    day = d.getUTCDate();
  if ((m === 1 && day >= 20) || (m === 2 && day <= 18)) return "Aquarius";
  if ((m === 2 && day >= 19) || (m === 3 && day <= 20)) return "Pisces";
  if ((m === 3 && day >= 21) || (m === 4 && day <= 19)) return "Aries";
  if ((m === 4 && day >= 20) || (m === 5 && day <= 20)) return "Taurus";
  if ((m === 5 && day >= 21) || (m === 6 && day <= 20)) return "Gemini";
  if ((m === 6 && day >= 21) || (m === 7 && day <= 22)) return "Cancer";
  if ((m === 7 && day >= 23) || (m === 8 && day <= 22)) return "Leo";
  if ((m === 8 && day >= 23) || (m === 9 && day <= 22)) return "Virgo";
  if ((m === 9 && day >= 23) || (m === 10 && day <= 22)) return "Libra";
  if ((m === 10 && day >= 23) || (m === 11 && day <= 21)) return "Scorpio";
  if ((m === 11 && day >= 22) || (m === 12 && day <= 21)) return "Sagittarius";
  return "Capricorn";
}

class ChatService {
  /**
   * Create a new AI chat
   */
  static async createChat(userId, data) {
    const { name, description, aiModel, systemPrompt, temperature } = data;

    const chat = await prisma.chat.create({
      data: {
        name: name || `Chat ${new Date().toLocaleDateString()}`,
        description,
        type: "PERSONAL_AI",
        userId,
        aiModel: aiModel || "gpt-4o",
        systemPrompt: systemPrompt || "You are a helpful AI assistant.",
        temperature: temperature || 0.7,
      },
    });

    return {
      message: "Chat created successfully.",
      success: true,
      chat,
    };
  }

  /**
   * Get all chats for a user
   */
  static async getUserChats(userId, query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    const totalChats = await prisma.chat.count({
      where: { userId, isActive: true },
    });

    const chats = await prisma.chat.findMany({
      where: { userId, isActive: true },
      skip,
      take: limit,
      orderBy: { lastMessageAt: "desc" },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });

    return {
      message: "Chats fetched successfully.",
      success: true,
      data: chats,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalChats / limit),
        totalItems: totalChats,
        limit,
      },
    };
  }

  /**
   * Get chat details with messages
   */
  static async getChatDetails(chatId, userId) {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 50, // Get last 50 messages
        },
      },
    });

    if (!chat) {
      throw new AppError("Chat not found.", HttpStatusCodes.NOT_FOUND);
    }

    return {
      message: "Chat details fetched successfully.",
      success: true,
      chat,
    };
  }

  /**
   * Send message to AI and get response
   */
  static async sendMessage(chatId, userId, data) {
    const { content, replyToId, imageFile, audioFile, videoFile } = data;

    // Get chat details
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      throw new AppError("Chat not found.", HttpStatusCodes.NOT_FOUND);
    }

    // Determine message type based on provided files
    let messageType = "TEXT";
    let mediaType = null;
    let mediaSize = null;
    let mediaName = null;

    if (imageFile) {
      messageType = "IMAGE";
      mediaType = imageFile.mimetype || "image/jpeg";
      mediaSize = imageFile.size || 1024000;
      mediaName = imageFile.originalname || "image.jpg";
    } else if (audioFile) {
      messageType = "AUDIO";
      mediaType = audioFile.mimetype || "audio/mpeg";
      mediaSize = audioFile.size || 2048000;
      mediaName = audioFile.originalname || "audio.mp3";
    } else if (videoFile) {
      messageType = "VIDEO";
      mediaType = videoFile.mimetype || "video/mp4";
      mediaSize = videoFile.size || 5120000;
      mediaName = videoFile.originalname || "video.mp4";
    }

    // Save file to media library if present
    let mediaRecord = null;
    if (imageFile || audioFile || videoFile) {
      const fileToSave = imageFile || audioFile || videoFile;
      console.log("=== ChatService.sendMessage - File Upload ===");
      console.log("File to save:", {
        originalname: fileToSave?.originalname,
        mimetype: fileToSave?.mimetype,
        size: fileToSave?.size,
        hasBuffer: !!fileToSave?.buffer,
      });
      console.log("File type detected:", messageType);
      mediaRecord = await MediaLibraryService.saveFile(
        fileToSave,
        userId,
        chatId,
        null
      );
      console.log("Media record created:", mediaRecord);
    } else {
      console.log("No file provided for upload");
    }

    // Start emotion detection in parallel (non-blocking)
    let emotionDetectionPromise = null;
    if (content && content.trim().length > 0) {
      emotionDetectionPromise = EmotionDetectionService.detectEmotion(content);
    }

    // Create user message with file metadata
    const userMessage = await prisma.message.create({
      data: {
        content,
        type: messageType,
        chatId,
        senderId: userId,
        replyToId,
        mediaType,
        mediaSize,
        mediaName,
        isFromAI: false,
        // Add file URLs if media was saved
        imageUrl: imageFile ? mediaRecord?.fileUrl : null,
        audioUrl: audioFile ? mediaRecord?.fileUrl : null,
        videoUrl: videoFile ? mediaRecord?.fileUrl : null,
      },
    });

    // Update media record with message ID
    if (mediaRecord) {
      await prisma.mediaLibrary.update({
        where: { id: mediaRecord.mediaId },
        data: { messageId: userMessage.id },
      });
    }

    // Prepare messages for OpenAI context
    const previousMessages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
      take: 20, // Get last 20 messages for context
    });

    // Convert to OpenAI format
    const messages = previousMessages.map((msg) => ({
      role: msg.isFromAI ? "assistant" : "user",
      content: msg.content,
    }));

    // Add system prompt
    if (chat.systemPrompt) {
      messages.unshift({
        role: "system",
        content: chat.systemPrompt,
      });
    }

    // Inject zodiac from user's birthday
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dateOfBirth: true },
    });
    const zodiac = getZodiacSign(user?.dateOfBirth);
    if (zodiac) {
      messages.unshift({ role: "system", content: `User Zodiac: ${zodiac} ` });
    }
    if (user?.dateOfBirth) {
      messages.unshift({
        role: "system",
        content: `User Birthdate: ${user.dateOfBirth}`,
      });
    }
    let aiResponse = null;
    let tokensUsed = 0;
    let processingTime = 0;

    try {
      const startTime = Date.now();

      // Call OpenAI API based on message type
      let completion;

      if (imageFile) {
        // Use OpenAI Vision API for images
        // Convert file buffer to base64 for OpenAI
        const base64Image = imageFile.buffer.toString("base64");
        const imageUrl = `data:${imageFile.mimetype};base64,${base64Image}`;

        const visionMessages = [
          ...messages,
          {
            role: "user",
            content: [
              {
                type: "text",
                text: content || "What do you see in this image?",
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ];

        completion = await openai.chat.completions.create({
          model: "gpt-4o", // Updated to use the current vision model
          messages: visionMessages,
          max_tokens: 1000,
        });
      } else if (audioFile) {
        // Use OpenAI Whisper API for audio transcription
        const transcription = await openai.audio.transcriptions.create({
          file: audioFile.buffer, // Use file buffer directly
          model: "whisper-1",
        });

        // Then use the transcription in a regular chat completion
        completion = await openai.chat.completions.create({
          model: chat.aiModel,
          messages: [
            ...messages, // Include all previous messages
            {
              role: "user",
              content: `Transcription: ${transcription.text}\n\n${
                content || "Please analyze this audio transcription."
              }`,
            },
          ],
          temperature: chat.temperature,
          max_tokens: 1000,
        });
      } else {
        // Regular text completion
        messages.push({
          role: "user",
          content: content,
        });

        completion = await openai.chat.completions.create({
          model: chat.aiModel,
          messages: messages,
          temperature: chat.temperature,
          max_tokens: 1000,
        });
      }

      processingTime = Date.now() - startTime;
      tokensUsed = completion.usage?.total_tokens || 0;
      const aiContent = completion.choices[0]?.message?.content;

      if (aiContent) {
        // Create AI response message
        aiResponse = await prisma.message.create({
          data: {
            content: aiContent,
            type: "TEXT",
            chatId,
            senderId: userId, // AI responses are associated with the user's chat
            isFromAI: true,
            aiModel: chat.aiModel,
            tokensUsed,
            processingTime,
          },
        });
      }
    } catch (error) {
      console.error("OpenAI API Error:", error);

      // Create error message
      aiResponse = await prisma.message.create({
        data: {
          content:
            "Sorry, I encountered an error processing your request. Please try again.",
          type: "TEXT",
          chatId,
          senderId: userId,
          isFromAI: true,
          aiModel: chat.aiModel,
          status: "FAILED",
        },
      });
    }

    // Update chat metadata
    await prisma.chat.update({
      where: { id: chatId },
      data: {
        lastMessageAt: new Date(),
        lastMessage: aiResponse?.content || userMessage.content,
        messageCount: { increment: 2 }, // User message + AI response
      },
    });

    // Update user message with emotion detection results (non-blocking)
    if (emotionDetectionPromise) {
      emotionDetectionPromise
        .then(async (emotionResult) => {
          try {
            await prisma.message.update({
              where: { id: userMessage.id },
              data: {
                emotion: emotionResult.emotion,
                emotionConfidence: emotionResult.confidence,
              },
            });
            console.log(
              `Emotion detected for message ${userMessage.id}:`,
              emotionResult
            );
          } catch (error) {
            console.error("Failed to update message with emotion:", error);
          }
        })
        .catch((error) => {
          console.error("Emotion detection failed:", error);
        });
    }

    return {
      message: "Message sent successfully.",
      success: true,
      data: {
        userMessage,
        aiResponse,
      },
    };
  }

  /**
   * Get messages for a chat
   */
  static async getChatMessages(chatId, userId, query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify chat belongs to user
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      throw new AppError("Chat not found.", HttpStatusCodes.NOT_FOUND);
    }

    const totalMessages = await prisma.message.count({
      where: { chatId },
    });

    const messages = await prisma.message.findMany({
      where: { chatId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return {
      message: "Messages fetched successfully.",
      success: true,
      data: messages.reverse(), // Reverse to show oldest first
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalItems: totalMessages,
        limit,
      },
    };
  }

  /**
   * Search messages within a specific chat by text content
   */
  static async searchChatMessages(chatId, userId, query) {
    const searchTerm = (query.q || "").trim();
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    // Verify chat belongs to user
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      throw new AppError("Chat not found.", HttpStatusCodes.NOT_FOUND);
    }

    if (!searchTerm) {
      return {
        message: "Search term is empty.",
        success: true,
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          limit,
        },
      };
    }

    const where = {
      chatId,
      content: { contains: searchTerm, mode: "insensitive" },
    };

    const totalItems = await prisma.message.count({ where });
    const results = await prisma.message.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    return {
      message: "Search results fetched successfully.",
      success: true,
      data: results,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        limit,
      },
    };
  }

  /**
   * Search across all user's chats by message content
   */
  static async searchAllChats(userId, query) {
    const searchTerm = (query.q || "").trim();
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    if (!searchTerm) {
      return {
        message: "Search term is empty.",
        success: true,
        data: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          limit,
        },
      };
    }

    // Only messages from chats owned by the user
    const where = {
      chat: { userId },
      content: { contains: searchTerm, mode: "insensitive" },
    };

    const totalItems = await prisma.message.count({ where });
    const results = await prisma.message.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        chat: {
          select: { id: true, name: true, lastMessageAt: true },
        },
      },
    });

    return {
      message: "Search results fetched successfully.",
      success: true,
      data: results,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        limit,
      },
    };
  }

  /**
   * Update chat settings
   */
  static async updateChat(chatId, userId, data) {
    const { name, description, aiModel, systemPrompt, temperature } = data;

    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      throw new AppError("Chat not found.", HttpStatusCodes.NOT_FOUND);
    }

    const updatedChat = await prisma.chat.update({
      where: { id: chatId },
      data: {
        name,
        description,
        aiModel,
        systemPrompt,
        temperature,
      },
    });

    return {
      message: "Chat updated successfully.",
      success: true,
      chat: updatedChat,
    };
  }

  /**
   * Delete chat
   */
  static async deleteChat(chatId, userId) {
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      throw new AppError("Chat not found.", HttpStatusCodes.NOT_FOUND);
    }

    await prisma.chat.update({
      where: { id: chatId },
      data: { isActive: false },
    });

    return {
      message: "Chat deleted successfully.",
      success: true,
    };
  }

  /**
   * Search conversations (chats and messages) for a user
   */
  static async searchConversations(userId, query) {
    const searchTerm = (query.q || "").trim();
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;
    const type = query.type || "all"; // 'chats', 'messages', 'all'

    if (!searchTerm) {
      return {
        message: "Search term is empty.",
        success: true,
        data: {
          chats: [],
          messages: [],
        },
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          limit,
        },
      };
    }

    const results = {
      chats: [],
      messages: [],
    };

    // Search chats if type is 'chats' or 'all'
    if (type === "chats" || type === "all") {
      const chatWhere = {
        userId,
        isActive: true,
        OR: [
          { name: { contains: searchTerm, mode: "insensitive" } },
          { description: { contains: searchTerm, mode: "insensitive" } },
        ],
      };

      const totalChats = await prisma.chat.count({ where: chatWhere });
      const chats = await prisma.chat.findMany({
        where: chatWhere,
        skip: type === "chats" ? skip : 0,
        take: type === "chats" ? limit : 10, // Limit to 10 if searching both
        orderBy: { lastMessageAt: "desc" },
        include: {
          _count: {
            select: { messages: true },
          },
        },
      });

      results.chats = chats;
      results.chatPagination = {
        currentPage: page,
        totalPages: Math.ceil(totalChats / limit),
        totalItems: totalChats,
        limit,
      };
    }

    // Search messages if type is 'messages' or 'all'
    if (type === "messages" || type === "all") {
      const messageWhere = {
        chat: { userId },
        content: { contains: searchTerm, mode: "insensitive" },
      };

      const totalMessages = await prisma.message.count({ where: messageWhere });
      const messages = await prisma.message.findMany({
        where: messageWhere,
        skip: type === "messages" ? skip : 0,
        take: type === "messages" ? limit : 10, // Limit to 10 if searching both
        orderBy: { createdAt: "desc" },
        include: {
          chat: {
            select: { id: true, name: true, lastMessageAt: true },
          },
        },
      });

      results.messages = messages;
      results.messagePagination = {
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalItems: totalMessages,
        limit,
      };
    }

    // Calculate combined pagination for 'all' type
    let combinedPagination = null;
    if (type === "all") {
      const totalItems =
        (results.chatPagination?.totalItems || 0) +
        (results.messagePagination?.totalItems || 0);
      combinedPagination = {
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
        totalItems,
        limit,
      };
    }

    return {
      message: "Search results fetched successfully.",
      success: true,
      data: results,
      pagination:
        combinedPagination ||
        results.chatPagination ||
        results.messagePagination,
    };
  }

  /**
   * Get available AI models
   */
  static async getAvailableModels() {
    return {
      message: "AI models fetched successfully.",
      success: true,
      data: [
        {
          id: "gpt-3.5-turbo",
          name: "GPT-3.5 Turbo",
          description: "Fast and efficient",
        },
        { id: "gpt-4", name: "GPT-4", description: "Most capable model" },
        {
          id: "gpt-4o",
          name: "GPT-4o",
          description: "Latest model with vision support",
        },
        {
          id: "gpt-4o-mini",
          name: "GPT-4o Mini",
          description: "Faster and cheaper GPT-4o",
        },
      ],
    };
  }

  /**
   * Add message to favorites
   * POST /api/v1/chats/:chatId/messages/:messageId/favorite
   */
  static async addToFavorites(chatId, messageId, userId) {
    // Verify message exists and belongs to user's chat
    const message = await prisma.message.findFirst({
      where: { id: messageId, chatId },
      include: { chat: true },
    });

    if (!message) {
      throw new AppError("Message not found.", HttpStatusCodes.NOT_FOUND);
    }

    // Verify chat belongs to user
    if (message.chat.userId !== userId) {
      throw new AppError("Unauthorized access.", HttpStatusCodes.FORBIDDEN);
    }

    // Check if already favorited
    const existingFavorite = await prisma.userMessageFavorite.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
    });

    if (existingFavorite) {
      return {
        message: "Message already in favorites.",
        success: true,
        isFavorite: true,
      };
    }

    // Add to favorites
    await prisma.userMessageFavorite.create({
      data: {
        messageId,
        userId,
      },
    });

    return {
      message: "Message added to favorites.",
      success: true,
      isFavorite: true,
    };
  }

  /**
   * Remove message from favorites
   * DELETE /api/v1/chats/:chatId/messages/:messageId/favorite
   */
  static async removeFromFavorites(chatId, messageId, userId) {
    // Verify message exists and belongs to user's chat
    const message = await prisma.message.findFirst({
      where: { id: messageId, chatId },
      include: { chat: true },
    });

    if (!message) {
      throw new AppError("Message not found.", HttpStatusCodes.NOT_FOUND);
    }

    // Verify chat belongs to user
    if (message.chat.userId !== userId) {
      throw new AppError("Unauthorized access.", HttpStatusCodes.FORBIDDEN);
    }

    // Check if favorited
    const existingFavorite = await prisma.userMessageFavorite.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
    });

    if (!existingFavorite) {
      return {
        message: "Message not in favorites.",
        success: true,
        isFavorite: false,
      };
    }

    // Remove from favorites
    await prisma.userMessageFavorite.delete({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
    });

    return {
      message: "Message removed from favorites.",
      success: true,
      isFavorite: false,
    };
  }

  /**
   * Toggle message favorite status
   * POST /api/v1/chats/:chatId/messages/:messageId/toggle-favorite
   */
  static async toggleFavorite(chatId, messageId, userId) {
    // Verify message exists and belongs to user's chat
    const message = await prisma.message.findFirst({
      where: { id: messageId, chatId },
      include: { chat: true },
    });

    if (!message) {
      throw new AppError("Message not found.", HttpStatusCodes.NOT_FOUND);
    }

    // Verify chat belongs to user
    if (message.chat.userId !== userId) {
      throw new AppError("Unauthorized access.", HttpStatusCodes.FORBIDDEN);
    }

    // Check if already favorited
    const existingFavorite = await prisma.userMessageFavorite.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId,
        },
      },
    });

    if (existingFavorite) {
      // Remove from favorites
      await prisma.userMessageFavorite.delete({
        where: {
          messageId_userId: {
            messageId,
            userId,
          },
        },
      });

      return {
        message: "Message removed from favorites.",
        success: true,
        isFavorite: false,
      };
    } else {
      // Add to favorites
      await prisma.userMessageFavorite.create({
        data: {
          messageId,
          userId,
        },
      });

      return {
        message: "Message added to favorites.",
        success: true,
        isFavorite: true,
      };
    }
  }

  /**
   * Get all favorite messages for a user
   * GET /api/v1/favorites/messages
   */
  static async getFavoriteMessages(userId, query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    const totalFavorites = await prisma.userMessageFavorite.count({
      where: { userId },
    });

    const favorites = await prisma.userMessageFavorite.findMany({
      where: { userId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        message: {
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                profilePhoto: true,
                userName: true,
              },
            },
            chat: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      },
    });

    return {
      message: "Favorite messages fetched successfully.",
      success: true,
      data: favorites.map((fav) => fav.message),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalFavorites / limit),
        totalItems: totalFavorites,
        limit,
      },
    };
  }

  /**
   * Get favorite messages for a specific chat
   * GET /api/v1/chats/:chatId/favorites
   */
  static async getChatFavorites(chatId, userId, query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    // Verify chat belongs to user
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      throw new AppError("Chat not found.", HttpStatusCodes.NOT_FOUND);
    }

    const totalFavorites = await prisma.userMessageFavorite.count({
      where: { userId, message: { chatId } },
    });

    const favorites = await prisma.userMessageFavorite.findMany({
      where: { userId, message: { chatId } },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        message: {
          include: {
            sender: {
              select: {
                id: true,
                fullName: true,
                profilePhoto: true,
                userName: true,
              },
            },
          },
        },
      },
    });

    return {
      message: "Favorite messages fetched successfully.",
      success: true,
      data: favorites.map((fav) => fav.message),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalFavorites / limit),
        totalItems: totalFavorites,
        limit,
      },
    };
  }

  /**
   * Get journey page data for user
   * GET /api/v1/journey
   */
  static async getJourneyPageData(userId, query) {
    const favoriteLimit = parseInt(query.favoriteLimit) || 10;
    const chatLimit = parseInt(query.chatLimit) || 5;
    const messageLimit = parseInt(query.messageLimit) || 10;
    const vaultLimit = parseInt(query.vaultLimit) || 20;

    try {
      // Get user data
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          fullName: true,
          email: true,
          profilePhoto: true,
          userName: true,
          bio: true,
          createdAt: true,
        },
      });

      if (!user) {
        throw new AppError("User not found.", HttpStatusCodes.NOT_FOUND);
      }

      // Helper function to map emotions to UI tags
      const getEmotionTag = (emotion, confidence = 0) => {
        const emotionMap = {
          joy: confidence >= 0.9 ? "Empowered" : "Joyful",
          sadness: "Reflective",
          anger: "Reflective",
          fear: "Curious",
          surprise: "Hopeful",
          disgust: "Reflective",
          neutral: "Reflective",
        };
        return emotionMap[emotion?.toLowerCase()] || "Reflective";
      };

      // Calculate all metrics in parallel
      const [
        // 1. Heart-to-hearts: Optimized query with aggregation
        heartToHeartsResult,
        // 2. Growth Moments: Direct count
        growthMoments,
        // 3. Breakthrough Days: Optimized with date grouping
        breakthroughDaysData,
        // 4. Statistics
        totalChats,
        totalMessages,
        totalFavorites,
        totalMedia,
        // 5. Favorite messages for vault
        favoriteMessages,
      ] = await Promise.all([
        // Heart-to-hearts: Count chats with >= 3 emotional messages
        prisma.chat.findMany({
          where: {
            userId,
            isDeleted: false,
          },
          select: {
            id: true,
            _count: {
              select: {
                messages: {
                  where: {
                    isDeleted: false,
                    isFromAI: false,
                    emotion: { not: null },
                    emotionConfidence: { gte: 0.6 },
                  },
                },
              },
            },
          },
        }),

        // Growth Moments
        prisma.message.count({
          where: {
            chat: { userId, isDeleted: false },
            isDeleted: false,
            isFromAI: false,
            emotion: { in: ["joy", "surprise"] },
            emotionConfidence: { gte: 0.7 },
          },
        }),

        // Breakthrough Days: Get messages grouped by date
        prisma.message.findMany({
          where: {
            chat: { userId, isDeleted: false },
            isDeleted: false,
            isFromAI: false,
            emotion: { not: null },
            emotionConfidence: { gte: 0.7 },
          },
          select: {
            createdAt: true,
            emotion: true,
          },
          // Limit to prevent memory issues
          take: 1000,
        }),

        // Statistics
        prisma.chat.count({
          where: { userId, isDeleted: false },
        }),
        prisma.message.count({
          where: {
            chat: { userId, isDeleted: false },
            isDeleted: false,
          },
        }),
        prisma.userMessageFavorite.count({
          where: { userId },
        }),
        prisma.mediaLibrary.count({
          where: { userId, isDeleted: false },
        }),

        // Favorite messages for vault
        prisma.userMessageFavorite.findMany({
          where: { userId },
          take: vaultLimit,
          orderBy: { createdAt: "desc" },
          include: {
            message: {
              include: {
                sender: {
                  select: {
                    id: true,
                    fullName: true,
                    profilePhoto: true,
                    userName: true,
                  },
                },
                chat: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
          },
        }),
      ]);

      // Process heart-to-hearts
      const heartToHearts = heartToHeartsResult.filter(
        (chat) => chat._count.messages >= 3
      ).length;

      // Process breakthrough days (group by date)
      const dailyEmotions = {};
      breakthroughDaysData.forEach((msg) => {
        const dateKey = new Date(msg.createdAt).toISOString().split("T")[0];
        if (!dailyEmotions[dateKey]) {
          dailyEmotions[dateKey] = {
            count: 0,
            positiveCount: 0,
          };
        }
        dailyEmotions[dateKey].count += 1;
        if (["joy", "surprise"].includes(msg.emotion)) {
          dailyEmotions[dateKey].positiveCount += 1;
        }
      });

      const breakthroughDays = Object.values(dailyEmotions).filter(
        (day) => day.count >= 5 && day.positiveCount >= 2
      ).length;

      // Goals achieved (placeholder)
      const goalsAchieved = 0;

      // Weekly Journey: Fetch all messages at once, then process in memory
      const currentDate = new Date();
      const weeksSinceRegistration = Math.floor(
        (currentDate - new Date(user.createdAt)) / (7 * 24 * 60 * 60 * 1000)
      );

      // Fetch messages for last 4 weeks in a single query
      const fourWeeksAgo = new Date(currentDate);
      fourWeeksAgo.setDate(currentDate.getDate() - 28);

      const weeklyMessages = await prisma.message.findMany({
        where: {
          chat: { userId, isDeleted: false },
          isDeleted: false,
          isFromAI: false,
          createdAt: { gte: fourWeeksAgo },
          emotion: { not: null },
        },
        select: {
          emotion: true,
          emotionConfidence: true,
          createdAt: true,
        },
      });

      // Process weekly data
      const weeklyJourneys = [];
      for (let i = 0; i < 4; i++) {
        const weekEnd = new Date(currentDate);
        const daysFromSunday = (currentDate.getDay() + 1) % 7;
        weekEnd.setDate(currentDate.getDate() - i * 7 - daysFromSunday);
        weekEnd.setHours(23, 59, 59, 999);

        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekEnd.getDate() - 6);
        weekStart.setHours(0, 0, 0, 0);

        // Filter messages for this week
        const weekMsgs = weeklyMessages.filter((msg) => {
          const msgDate = new Date(msg.createdAt);
          return msgDate >= weekStart && msgDate <= weekEnd;
        });

        const progress = Math.min(
          100,
          Math.floor((weekMsgs.length / 20) * 100)
        );

        // Get dominant emotion
        const emotionCounts = {};
        weekMsgs.forEach((msg) => {
          if (msg.emotionConfidence >= 0.6) {
            emotionCounts[msg.emotion] = (emotionCounts[msg.emotion] || 0) + 1;
          }
        });

        let dominantEmotion = "neutral";
        let maxCount = 0;
        Object.entries(emotionCounts).forEach(([emotion, count]) => {
          if (count > maxCount) {
            maxCount = count;
            dominantEmotion = emotion;
          }
        });

        const emotionTag = getEmotionTag(
          dominantEmotion,
          weekMsgs.length > 0 ? maxCount / weekMsgs.length : 0
        );

        // Generate dynamic description based on week activity
        const getWeekDescription = (
          progress,
          dominantEmotion,
          weekMsgs,
          weekNumber
        ) => {
          if (progress === 0) {
            return "Starting your journey";
          }

          // First week - special messaging
          if (weekNumber === 1) {
            if (progress >= 75) {
              return "Started strong with deep reflections";
            } else if (progress >= 50) {
              return "Began exploring your inner thoughts";
            } else {
              return "Took your first steps forward";
            }
          }

          // Based on dominant emotion
          const emotionDescriptions = {
            joy:
              progress >= 75
                ? "Filled with joy and positive energy"
                : progress >= 50
                ? "Experiencing moments of happiness"
                : "Finding reasons to smile",

            surprise:
              progress >= 75
                ? "Discovering unexpected insights about yourself"
                : progress >= 50
                ? "Encountering eye-opening realizations"
                : "Noticing new perspectives emerging",

            sadness:
              progress >= 75
                ? "Processing deep emotions with courage"
                : progress >= 50
                ? "Working through challenging feelings"
                : "Allowing yourself to feel and heal",

            fear:
              progress >= 75
                ? "Confronting fears and building resilience"
                : progress >= 50
                ? "Facing anxieties with determination"
                : "Taking small steps despite uncertainty",

            anger:
              progress >= 75
                ? "Channeling energy into positive growth"
                : progress >= 50
                ? "Expressing and understanding your needs"
                : "Acknowledging strong feelings",

            reflective:
              progress >= 75
                ? "Engaging in deep self-reflection"
                : progress >= 50
                ? "Taking time for introspection"
                : "Beginning to understand yourself better",

            neutral:
              progress >= 75
                ? "Maintaining steady progress and consistency"
                : progress >= 50
                ? "Building a steady rhythm of reflection"
                : "Establishing a practice of self-exploration",
          };

          // Check if emotion tag matches any key
          const emotionKey =
            emotionTag.toLowerCase() === "reflective"
              ? "reflective"
              : emotionTag.toLowerCase() === "curious"
              ? "neutral"
              : emotionTag.toLowerCase() === "hopeful"
              ? "surprise"
              : emotionTag.toLowerCase() === "empowered"
              ? "joy"
              : dominantEmotion || "neutral";

          return (
            emotionDescriptions[emotionKey] ||
            (progress >= 75
              ? "Showing strong commitment to growth"
              : progress >= 50
              ? "Making steady progress on your path"
              : "Continuing your journey of self-discovery")
          );
        };

        const weekNumber = weeksSinceRegistration - i;
        if (weekNumber >= 0) {
          const description = getWeekDescription(
            progress,
            dominantEmotion,
            weekMsgs,
            weekNumber + 1
          );

          weeklyJourneys.push({
            weekNumber: weekNumber + 1,
            title: `Week ${weekNumber + 1}`,
            description,
            progress,
            progressText: `Progress: ${progress}% complete`,
            emotionTag,
            startDate: weekStart,
            endDate: weekEnd,
          });
        }
      }

      weeklyJourneys.sort((a, b) => b.weekNumber - a.weekNumber);

      // Vault of Secrets: Optimize AI response fetching
      const favoriteChatIds = [
        ...new Set(favoriteMessages.map((fav) => fav.message.chatId)),
      ];
      const favoriteMessageDates = new Map(
        favoriteMessages.map((fav) => [
          fav.message.id,
          new Date(fav.message.createdAt),
        ])
      );

      // Fetch AI responses efficiently
      const aiResponses =
        favoriteChatIds.length > 0
          ? await prisma.message.findMany({
              where: {
                chatId: { in: favoriteChatIds },
                isFromAI: true,
                isDeleted: false,
                createdAt: {
                  gte:
                    favoriteMessageDates.size > 0
                      ? new Date(
                          Math.min(...Array.from(favoriteMessageDates.values()))
                        )
                      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
              },
              select: {
                id: true,
                content: true,
                createdAt: true,
                chatId: true,
              },
              orderBy: { createdAt: "asc" },
            })
          : [];

      // Create AI response map by chat and date
      const aiResponseMap = new Map();
      favoriteMessages.forEach((fav) => {
        const favMsg = fav.message;
        // Find first AI response after this message in the same chat
        const aiResponse = aiResponses.find(
          (ai) =>
            ai.chatId === favMsg.chatId &&
            new Date(ai.createdAt) > favoriteMessageDates.get(favMsg.id)
        );
        if (aiResponse) {
          aiResponseMap.set(favMsg.id, aiResponse.content);
        }
      });

      // Format vault entries
      const vaultOfSecrets = favoriteMessages.map((fav) => {
        const msg = fav.message;
        const aiInsight = aiResponseMap.get(msg.id);

        // Generate insight text
        let insightText = null;
        if (aiInsight) {
          if (aiInsight.length <= 100) {
            insightText = aiInsight;
          } else {
            // Use emotion-based insight
            const insights = {
              joy: "You're learning to advocate for yourself with confidence✨",
              surprise: "You're discovering new perspectives about yourself✨",
              sadness: "You're processing your feelings with courage✨",
              fear: "You're showing bravery by facing your concerns✨",
              anger: "You're expressing your needs authentically✨",
              neutral: "You're reflecting on your experiences✨",
            };
            insightText =
              insights[msg.emotion?.toLowerCase()] || insights.neutral;
          }
        } else {
          const defaultInsights = {
            joy: "You're learning to advocate for yourself with confidence✨",
            surprise: "You're discovering new perspectives about yourself✨",
            sadness: "You're processing your feelings with courage✨",
            fear: "You're showing bravery by facing your concerns✨",
            neutral: "You're reflecting on your experiences✨",
          };
          insightText =
            defaultInsights[msg.emotion?.toLowerCase()] ||
            defaultInsights.neutral;
        }

        const emotionTag = getEmotionTag(
          msg.emotion,
          msg.emotionConfidence || 0
        );

        return {
          id: msg.id,
          emotionTag,
          date: msg.createdAt,
          content: msg.content,
          attribution: msg.chat.name || "Pryve",
          aiInsight: insightText,
          chatId: msg.chat.id,
          chatName: msg.chat.name,
          favoritedAt: fav.createdAt,
          emotion: msg.emotion,
          emotionConfidence: msg.emotionConfidence,
        };
      });

      // Get recent chats
      const recentChats = await prisma.chat.findMany({
        where: {
          userId,
          isDeleted: false,
        },
        take: chatLimit,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          type: true,
          createdAt: true,
          updatedAt: true,
          lastMessage: true,
          lastMessageAt: true,
          messageCount: true,
        },
      });

      return {
        message: "Journey page data fetched successfully.",
        success: true,
        data: {
          user,
          journeyOverview: {
            heartToHearts,
            growthMoments,
            breakthroughDays,
            goalsAchieved,
          },
          weeklyJourney: weeklyJourneys,
          vaultOfSecrets,
          recentChats,
          statistics: {
            totalChats,
            totalMessages,
            totalFavorites,
            totalMedia,
            heartToHearts,
            growthMoments,
            breakthroughDays,
            goalsAchieved,
          },
        },
      };
    } catch (error) {
      console.error("Error fetching journey page data:", error);
      throw new AppError(
        "Failed to fetch journey page data.",
        HttpStatusCodes.INTERNAL_SERVER_ERROR
      );
    }
  }
}

module.exports = ChatService;
