const OpenAI = require('openai');
const prisma = require("../../../lib/prisma");
const AppError = require("../utils/AppError");
const HttpStatusCodes = require("../enums/httpStatusCode");
const MediaLibraryService = require("./mediaLibrary.service");

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
      orderBy: { lastMessageAt: 'desc' },
      include: {
        _count: {
          select: { messages: true }
        }
      }
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
          orderBy: { createdAt: 'asc' },
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
      console.log('=== ChatService.sendMessage - File Upload ===');
      console.log('File to save:', {
        originalname: fileToSave?.originalname,
        mimetype: fileToSave?.mimetype,
        size: fileToSave?.size,
        hasBuffer: !!fileToSave?.buffer
      });
      console.log('File type detected:', messageType);
      mediaRecord = await MediaLibraryService.saveFile(fileToSave, userId, chatId, null);
      console.log('Media record created:', mediaRecord);
    } else {
      console.log('No file provided for upload');
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
      orderBy: { createdAt: 'asc' },
      take: 20, // Get last 20 messages for context
    });

    // Convert to OpenAI format
    const messages = previousMessages.map(msg => ({
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
        const base64Image = imageFile.buffer.toString('base64');
        const imageUrl = `data:${imageFile.mimetype};base64,${base64Image}`;
        
        completion = await openai.chat.completions.create({
          model: "gpt-4o", // Updated to use the current vision model
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: content || "What do you see in this image?"
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl
                  }
                }
              ]
            }
          ],
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
              content: `Transcription: ${transcription.text}\n\n${content || "Please analyze this audio transcription."}`
            }
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
          content: "Sorry, I encountered an error processing your request. Please try again.",
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
      orderBy: { createdAt: 'desc' },
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
    const searchTerm = (query.q || '').trim();
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
      content: { contains: searchTerm, mode: 'insensitive' },
    };

    const totalItems = await prisma.message.count({ where });
    const results = await prisma.message.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
    const searchTerm = (query.q || '').trim();
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
      content: { contains: searchTerm, mode: 'insensitive' },
    };

    const totalItems = await prisma.message.count({ where });
    const results = await prisma.message.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
    const searchTerm = (query.q || '').trim();
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;
    const type = query.type || 'all'; // 'chats', 'messages', 'all'

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
    if (type === 'chats' || type === 'all') {
      const chatWhere = {
        userId,
        isActive: true,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
        ],
      };

      const totalChats = await prisma.chat.count({ where: chatWhere });
      const chats = await prisma.chat.findMany({
        where: chatWhere,
        skip: type === 'chats' ? skip : 0,
        take: type === 'chats' ? limit : 10, // Limit to 10 if searching both
        orderBy: { lastMessageAt: 'desc' },
        include: {
          _count: {
            select: { messages: true }
          }
        }
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
    if (type === 'messages' || type === 'all') {
      const messageWhere = {
        chat: { userId },
        content: { contains: searchTerm, mode: 'insensitive' },
      };

      const totalMessages = await prisma.message.count({ where: messageWhere });
      const messages = await prisma.message.findMany({
        where: messageWhere,
        skip: type === 'messages' ? skip : 0,
        take: type === 'messages' ? limit : 10, // Limit to 10 if searching both
        orderBy: { createdAt: 'desc' },
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
    if (type === 'all') {
      const totalItems = (results.chatPagination?.totalItems || 0) + (results.messagePagination?.totalItems || 0);
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
      pagination: combinedPagination || results.chatPagination || results.messagePagination,
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
        { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "Fast and efficient" },
        { id: "gpt-4", name: "GPT-4", description: "Most capable model" },
        { id: "gpt-4o", name: "GPT-4o", description: "Latest model with vision support" },
        { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "Faster and cheaper GPT-4o" },
      ],
    };
  }
}

module.exports = ChatService;
