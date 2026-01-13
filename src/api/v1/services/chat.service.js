const OpenAI = require("openai");
const prisma = require("../../../lib/prisma");
const AppError = require("../utils/AppError");
const HttpStatusCodes = require("../enums/httpStatusCode");
const MediaLibraryService = require("./mediaLibrary.service");
const EmotionDetectionService = require("../utils/emotionDetection");
const Logger = require("../utils/logger");
const RevenueCatService = require("./revenuecat.service");
const { createCleanTitle } = require("../utils/textProcessor");
const cacheService = require("../utils/cache.service");
const responseCacheService = require("./responseCache.service");

// Initialize OpenAI client with connection pooling for faster requests
const https = require('https');
const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000,
  freeSocketTimeout: 30000
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  httpAgent: httpsAgent, // Reuse connections for faster requests
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

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const BREAKTHROUGH_MIN_TOTAL = 5;
const BREAKTHROUGH_MIN_POSITIVE = 2;

const JOURNEY_CATEGORY_FILTERS = {
  "heart-to-hearts": {
    where: {
      isFromAI: false,
      isDeleted: false,
      emotion: { not: null },
      emotionConfidence: { gte: 0.6 },
    },
  },
  "growth-moments": {
    where: {
      isFromAI: false,
      isDeleted: false,
      emotion: { in: ["joy", "surprise"] },
      emotionConfidence: { gte: 0.7 },
    },
  },
};

const toDateKey = (date) => new Date(date).toISOString().split("T")[0];

const getWeekKey = (date) => {
  const d = new Date(date);
  const startOfYear = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const diffDays = Math.floor((d - startOfYear) / MS_PER_DAY);
  const week = Math.floor((diffDays + startOfYear.getUTCDay()) / 7);
  return `${d.getUTCFullYear()}-W${week}`;
};

const consecutiveWindow = (dates, streakLength) => {
  if (!dates.length) return null;
  const unique = [...new Set(dates.map(toDateKey))].sort();

  for (let i = 0; i <= unique.length - streakLength; i++) {
    let consecutive = true;
    for (let j = 1; j < streakLength; j++) {
      const prev = new Date(unique[i + j - 1]);
      const curr = new Date(unique[i + j]);
      if (curr - prev !== MS_PER_DAY) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) {
      return {
        start: new Date(unique[i]),
        end: new Date(unique[i + streakLength - 1]),
      };
    }
  }

  return null;
};

const getMaxTokenParam = (model, defaultTokens = 1000) => {
  if (model?.toLowerCase().startsWith("gpt-5")) {
    return { max_completion_tokens: defaultTokens };
  }
  return { max_tokens: defaultTokens };
};

// OPTIMIZATION: Smart model selection based on query complexity
const getOptimalModel = (content, defaultModel) => {
  if (!content) return defaultModel;
  
  // Simple queries - use faster, cheaper model
  if (content.length < 50 || isSimpleQuery(content)) {
    return 'gpt-4o-mini'; // Faster model for simple queries
  }
  
  // Complex queries - use powerful model
  return defaultModel || 'gpt-4o';
};

const isSimpleQuery = (content) => {
  const simplePatterns = [
    /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|bye|goodbye)$/i,
    /^how are you\??$/i,
    /^(good morning|good night|good evening)$/i,
    /^.{1,30}$/  // Very short messages
  ];
  return simplePatterns.some(pattern => pattern.test(content.trim()));
};

// OPTIMIZATION: Smart prompt selection based on query type
const getOptimalPrompt = (content, fullPrompt) => {
  if (!content || !fullPrompt) return fullPrompt;
  
  const QUICK_PROMPTS = {
    greeting: "You are a helpful, friendly assistant. Be warm and concise.",
    simple: "You are a helpful assistant. Give clear, concise answers.",
    encouragement: "You are a supportive friend. Be encouraging and uplifting.",
    question: "You are a knowledgeable assistant. Answer clearly and helpfully."
  };
  
  const contentLower = content.toLowerCase();
  
  // Use shorter prompts for simple interactions
  if (content.length < 20) return QUICK_PROMPTS.simple;
  if (contentLower.includes('hi') || contentLower.includes('hello') || contentLower.includes('hey')) {
    return QUICK_PROMPTS.greeting;
  }
  if (contentLower.includes('encourage') || contentLower.includes('support') || contentLower.includes('help me feel')) {
    return QUICK_PROMPTS.encouragement;
  }
  if (contentLower.includes('what') || contentLower.includes('how') || contentLower.includes('why')) {
    return QUICK_PROMPTS.question;
  }
  
  // For complex queries, use full prompt but truncate if too long
  if (fullPrompt.length > 2000) {
    return fullPrompt.substring(0, 2000) + "\n\nProvide helpful, accurate responses.";
  }
  
  return fullPrompt;
};

const formatDuration = (start, end) => {
  if (!start || !end) return "Completed";
  const days = Math.max(1, Math.round((end - start) / MS_PER_DAY));
  if (days >= 56) return `Took ${Math.round(days / 30)} months`;
  if (days >= 14) return `Took ${Math.round(days / 7)} weeks`;
  return days > 1 ? `Took ${days} days` : "Completed";
};

const mapChatTypeToSource = (chatType = "") => {
  const map = {
    PERSONAL_AI: "Reflection",
    VOICE_NOTE: "Voice Moment",
    CONVERSATION: "Conversation",
  };

  return map[chatType.toUpperCase()] || "Reflection";
};

const mapEmotionToTag = (emotion, confidence = 0) => {
  const lookup = {
    joy:
      confidence >= 0.9
        ? "Empowered"
        : confidence >= 0.75
        ? "Hopeful"
        : "Joyful",
    surprise: confidence >= 0.8 ? "Insight" : "Curious",
    sadness: confidence >= 0.7 ? "Reflective" : "Tender",
    anger: confidence >= 0.7 ? "Honest" : "Reflective",
    fear: confidence >= 0.7 ? "Brave" : "Curious",
    disgust: "Firm",
    neutral: "Grounded",
  };

  return lookup[emotion?.toLowerCase()] || "Reflective";
};

const buildSecondaryTags = (msg) => {
  const tags = new Set();
  const emotion = msg?.emotion?.toLowerCase();
  const confidence = msg?.emotionConfidence || 0;

  if (emotion === "joy") {
    if (confidence >= 0.9) tags.add("Proud");
    tags.add("Grateful");
    if (confidence >= 0.85) tags.add("Strong");
  }

  if (emotion === "surprise") {
    tags.add("Curious");
    if (confidence >= 0.85) tags.add("Insight");
  }

  if (emotion === "sadness") {
    tags.add("Reflective");
    if (confidence >= 0.8) tags.add("Healing");
  }

  if (emotion === "fear") {
    tags.add("Brave");
    if (confidence >= 0.85) tags.add("Resilient");
  }

  if (emotion === "anger") {
    tags.add("Honest");
    if (confidence >= 0.8) tags.add("Boundaries");
  }

  if (!tags.size) {
    tags.add("Still Growing");
  }

  return Array.from(tags);
};

const deriveGoalsFromActivity = (messages, favorites = []) => {
  const goals = [];

  const reflections = messages.filter(
    (msg) => msg.chat?.type === "PERSONAL_AI"
  );
  const streak = consecutiveWindow(
    reflections.map((msg) => msg.createdAt),
    7
  );

  if (streak) {
    const highlight = reflections.find(
      (msg) => toDateKey(msg.createdAt) === toDateKey(streak.end)
    );

    goals.push({
      id: "goal_consistency",
      title: "Started journaling daily.",
      summary: "Logged reflections 7 days in a row.",
      themes: ["Reflection", "Resilience"],
      startedAt: streak.start,
      completedAt: streak.end,
      highlight,
    });
  }

  const connectionMessages = messages.filter((msg) => {
    const emotion = msg.emotion?.toLowerCase();
    return (
      msg.chat?.type === "CONVERSATION" &&
      (emotion === "joy" || emotion === "surprise") &&
      msg.emotionConfidence >= 0.7
    );
  });

  if (connectionMessages.length >= 3) {
    for (let i = 0; i < connectionMessages.length; i++) {
      const start = new Date(connectionMessages[i].createdAt);
      const windowEnd = new Date(start.getTime() + 30 * MS_PER_DAY);
      let count = 1;
      let last = connectionMessages[i];

      for (let j = i + 1; j < connectionMessages.length; j++) {
        const currentDate = new Date(connectionMessages[j].createdAt);
        if (currentDate <= windowEnd) {
          count += 1;
          last = connectionMessages[j];
        } else {
          break;
        }
      }

      if (count >= 3) {
        goals.push({
          id: "goal_connection",
          title: "Reached out to a friend.",
          summary: "Shared 3 uplifting conversations within 30 days.",
          themes: ["Courage", "Connection"],
          startedAt: start,
          completedAt: new Date(last.createdAt),
          highlight: last,
        });
        break;
      }
    }
  }

  const boundaryTriggers = messages.filter((msg) => {
    const emotion = msg.emotion?.toLowerCase();
    return (
      (emotion === "anger" || emotion === "fear") &&
      msg.emotionConfidence >= 0.8
    );
  });

  for (const trigger of boundaryTriggers) {
    const start = new Date(trigger.createdAt);
    const windowEnd = new Date(start.getTime() + 14 * MS_PER_DAY);
    const followUps = messages.filter((msg) => {
      const date = new Date(msg.createdAt);
      const emotion = msg.emotion?.toLowerCase();
      return (
        date > start &&
        date <= windowEnd &&
        (emotion === "joy" || emotion === "surprise")
      );
    });

    if (followUps.length >= 2) {
      const last = followUps[followUps.length - 1];
      goals.push({
        id: "goal_boundaries",
        title: "Implemented new boundaries.",
        summary: "Turned tough emotions into empowered action.",
        themes: ["Development", "Confidence"],
        startedAt: start,
        completedAt: new Date(last.createdAt),
        highlight: last,
      });
      break;
    }
  }

  const voiceWeeks = new Map();
  messages
    .filter((msg) => msg.chat?.type === "VOICE_NOTE")
    .forEach((msg) => {
      const key = getWeekKey(msg.createdAt);
      if (!voiceWeeks.has(key)) voiceWeeks.set(key, msg);
    });

  if (voiceWeeks.size >= 3) {
    const weeks = Array.from(voiceWeeks.values()).sort(
      (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
    );
    const last = weeks[weeks.length - 1];
    goals.push({
      id: "goal_meditation",
      title: "Set a weekly meditation practice.",
      summary: "Voice notes became a steady mindfulness ritual.",
      themes: ["Routine", "Peace"],
      startedAt: new Date(weeks[0].createdAt),
      completedAt: new Date(last.createdAt),
      highlight: last,
    });
  }

  if (favorites.length >= 5) {
    const newest = new Date(favorites[0].createdAt);
    const oldest = new Date(favorites[favorites.length - 1].createdAt);
    const highlight = favorites[0].message;
    goals.push({
      id: "goal_learning",
      title: "Finished a course.",
      summary: "Saved 5 insights worth remembering.",
      themes: ["Growth", "Learning"],
      startedAt: oldest,
      completedAt: newest,
      highlight,
    });
  }

  goals.sort(
    (a, b) =>
      new Date(b.completedAt || b.startedAt) -
      new Date(a.completedAt || a.startedAt)
  );

  return goals;
};

class ChatService {
  /**
   * Create a new AI chat
   */
  static async createChat(userId, data) {
    const { name, description, aiModel, systemPrompt, temperature } = data;

    // Resolve system prompt: prefer request payload, otherwise pull from global AI config if active
    let resolvedSystemPrompt = systemPrompt;
    if (!resolvedSystemPrompt) {
      const aiConfig = await prisma.aIConfig.findFirst({
        select: { systemPrompt: true, systemPromptActive: true },
      });

      if (aiConfig?.systemPromptActive && aiConfig.systemPrompt) {
        resolvedSystemPrompt = aiConfig.systemPrompt;
      }
    }

    const finalSystemPrompt = resolvedSystemPrompt || "You are a helpful AI assistant.";
    
    const chat = await prisma.chat.create({
      data: {
        name: name || `Chat ${new Date().toLocaleDateString()}`,
        description,
        type: "PERSONAL_AI",
        userId,
        aiModel: aiModel || "gpt-5.1",
        systemPrompt: finalSystemPrompt,
        temperature: temperature || 0.7,
      },
    });

    // Log the system prompt being set
    Logger.info("Chat Created with System Prompt", {
      chatId: chat.id,
      userId,
      systemPrompt: finalSystemPrompt,
      systemPromptSource: systemPrompt ? "user-provided" : (resolvedSystemPrompt ? "global-config" : "default"),
      aiModel: aiModel || "gpt-5.1",
      temperature: temperature || 0.7,
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

    // OPTIMIZATION: Check cache for AI config first
    const AI_CONFIG_CACHE_KEY = "ai_config";
    let aiConfig = cacheService.get(AI_CONFIG_CACHE_KEY);
    
    // OPTIMIZATION: Parallelize independent database queries
    // Run chat lookup, user lookup, AI config (if not cached), and zodiac lookup in parallel
    const dbQueries = [
      // Get chat details
      prisma.chat.findFirst({
        where: { id: chatId, userId },
      }),
      // Check user's query count before processing (skip for premium users)
      prisma.user.findUnique({
        where: { id: userId },
        select: { queryCount: true },
      }),
      // Get AI config from cache or database
      aiConfig
        ? Promise.resolve(aiConfig)
        : prisma.aIConfig.findFirst({
            select: { systemPrompt: true, systemPromptActive: true, id: true },
          }).then((config) => {
            // Cache the AI config for 5 minutes
            if (config) {
              cacheService.set(AI_CONFIG_CACHE_KEY, config, 5 * 60 * 1000);
            }
            return config;
          }),
      // Inject zodiac from user's birthday (fetch early for later use)
      prisma.user.findUnique({
        where: { id: userId },
        select: { dateOfBirth: true },
      }),
    ];

    const [chat, userForQueryCheck, fetchedAiConfig, userForZodiac] = await Promise.all(dbQueries);
    
    // Use fetched AI config (either from cache or database)
    aiConfig = fetchedAiConfig;

    // Validate chat exists
    if (!chat) {
      throw new AppError("Chat not found.", HttpStatusCodes.NOT_FOUND);
    }

    // Validate user exists
    if (!userForQueryCheck) {
      throw new AppError("User not found.", HttpStatusCodes.NOT_FOUND);
    }

    // Check if user has active subscription (premium users bypass query limit)
    const subscriptionCheck = await RevenueCatService.getActiveSubscription(userId);
    const hasActiveSubscription = subscriptionCheck.hasActiveSubscription;

    // Only check query limit for free users
    if (!hasActiveSubscription) {
      // Check if user has queries remaining
      if (userForQueryCheck.queryCount <= 0) {
        throw new AppError(
          "You have reached your free query limit. Please upgrade to continue.",
          HttpStatusCodes.FORBIDDEN
        );
      }

      // Decrement query count by 1 for free users
      await prisma.user.update({
        where: { id: userId },
        data: { queryCount: { decrement: 1 } },
      });
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
    // IMPORTANT: Save a copy of the buffer before saving to disk, as we need it for OpenAI API
    let mediaRecord = null;
    let fileBufferForOpenAI = null;
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
      
      // Preserve buffer for OpenAI API before saving to disk
      if (fileToSave?.buffer) {
        fileBufferForOpenAI = Buffer.from(fileToSave.buffer);
      }
      
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

    // Convert to OpenAI format, filtering out messages with null/empty content
    // This prevents errors when image-only or media-only messages are in the history
    const messages = previousMessages
      .filter((msg) => msg.content && msg.content.trim().length > 0)
      .map((msg) => ({
        role: msg.isFromAI ? "assistant" : "user",
        content: msg.content,
      }));

    // System prompt and AI config already fetched in parallel above
    let systemPromptToUse = null;

    // Safety flag to disable vector-based prompt replacement for stability
    const DISABLE_VECTOR_RETRIEVAL = false;
    
    // OPTIMIZATION: Timeout for Vector DB operations (1 second max)
    const VECTOR_DB_TIMEOUT_MS = 1000;
    
    // Helper function to add timeout to promises
    const withTimeout = (promise, timeoutMs, operationName) => {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)),
            timeoutMs
          )
        ),
      ]);
    };

    // Try to get relevant prompt chunks from Supabase Vector DB
    let usingVectorDB = false;
    console.log('\n' + '='.repeat(80));
    console.log('🚀 SYSTEM PROMPT RESOLUTION - Starting...');
    console.log('='.repeat(80));
    console.log(`📋 AI Config exists: ${!!aiConfig}`);
    console.log(`📋 systemPromptActive: ${aiConfig?.systemPromptActive}`);
    console.log(`📋 systemPrompt exists: ${!!aiConfig?.systemPrompt}`);
    console.log(`📋 User message: "${content?.substring(0, 50)}..."`);
    console.log(`🔒 DISABLE_VECTOR_RETRIEVAL: ${DISABLE_VECTOR_RETRIEVAL}`);
    console.log(`⏱️  Vector DB Timeout: ${VECTOR_DB_TIMEOUT_MS}ms`);

    if (!DISABLE_VECTOR_RETRIEVAL && aiConfig?.systemPromptActive && aiConfig?.systemPrompt && content) {
      try {
        const SupabaseVectorService = require("./supabaseVector.service");
        
        // OPTIMIZATION: Add timeout to vector DB checks
        const [hasChunks, chunkCount] = await Promise.all([
          withTimeout(
            SupabaseVectorService.hasChunks(),
            VECTOR_DB_TIMEOUT_MS,
            'hasChunks check'
          ).catch(() => {
            console.warn('⚠️  Vector DB hasChunks check timed out, assuming no chunks');
            return false;
          }),
          withTimeout(
            SupabaseVectorService.getChunkCount(),
            VECTOR_DB_TIMEOUT_MS,
            'getChunkCount check'
          ).catch(() => {
            console.warn('⚠️  Vector DB getChunkCount check timed out, assuming 0 chunks');
            return 0;
          }),
        ]);
        
        console.log(`\n🗄️  Supabase Vector DB Check:`);
        console.log(`   Has chunks: ${hasChunks}`);
        console.log(`   Total active chunks: ${chunkCount}`);
        
        if (hasChunks) {
          // OPTIMIZATION: Add timeout to vector context retrieval
          const relevantContext = await withTimeout(
            SupabaseVectorService.getRelevantPromptContext(
              content,
              3,    // topK: Get top 3 most relevant chunks
              0.3   // minSimilarity: Minimum 30% similarity (lowered for broader matching)
            ),
            VECTOR_DB_TIMEOUT_MS,
            'getRelevantPromptContext'
          ).catch((error) => {
            console.warn(`⚠️  Vector DB context retrieval timed out or failed: ${error.message}`);
            return null;
          });

          if (relevantContext) {
            systemPromptToUse = `
Based on the following relevant context from the knowledge base:

${relevantContext}

Use this context to provide accurate and helpful responses to the user's questions.
            `.trim();
            usingVectorDB = true;
            
            console.log("\n" + "=".repeat(80));
            console.log("✅ SUCCESS: USING SUPABASE VECTOR DB CHUNKS!");
            console.log("=".repeat(80));
            console.log(`📊 Context length: ${relevantContext.length} characters`);
            console.log(`📊 Full prompt length would be: ${aiConfig.systemPrompt.length} characters`);
            console.log(`📊 Savings: ${((1 - relevantContext.length / aiConfig.systemPrompt.length) * 100).toFixed(1)}% smaller`);
            console.log("=".repeat(80) + "\n");
          } else {
            console.log('\n⚠️  No relevant chunks returned - will use full prompt');
          }
        } else {
          console.log('\n⚠️  No chunks in Supabase - will use full prompt');
        }
      } catch (error) {
        console.error('❌ Error retrieving from Supabase Vector DB:', error);
        // Fall through to use full prompt
      }
    } else {
      console.log('\n⚠️  Conditions not met for vector DB:');
      if (DISABLE_VECTOR_RETRIEVAL) console.log('   - Vector retrieval is disabled by safety flag');
      if (!aiConfig?.systemPromptActive) console.log('   - systemPromptActive is false');
      if (!aiConfig?.systemPrompt) console.log('   - No system prompt configured');
      if (!content) console.log('   - No user content provided');
    }

    // Fallback: Use full prompt if vector DB didn't work or isn't available
    if (!usingVectorDB) {
      if (aiConfig?.systemPrompt) {
        systemPromptToUse = aiConfig.systemPrompt;
      } else if (chat.systemPrompt) {
        // Fall back to chat-specific prompt if no AI config exists
        systemPromptToUse = chat.systemPrompt;
      }

      // Add system prompt from database
      if (systemPromptToUse) {
        console.log("\n" + "=".repeat(80));
        console.log("📝 SYSTEM PROMPT BEING USED (FULL PROMPT):");
        console.log("=".repeat(80));
        console.log(systemPromptToUse.substring(0, 500) + (systemPromptToUse.length > 500 ? "..." : ""));
        console.log("=".repeat(80));
        console.log(`Source: ${aiConfig?.systemPrompt ? "AI Config Table (Database)" : "Chat-specific"}`);
        console.log(`Full prompt length: ${systemPromptToUse.length} characters`);
        console.log("=".repeat(80) + "\n");
      } else {
        console.log("\n" + "=".repeat(80));
        console.log("⚠️  NO SYSTEM PROMPT SET");
        console.log("=".repeat(80));
        console.log("AI Config Prompt:", aiConfig?.systemPrompt || "None");
        console.log("Chat System Prompt:", chat.systemPrompt || "None");
        console.log("=".repeat(80) + "\n");
      }
    }

    // Add system prompt to messages with optimization
    if (systemPromptToUse) {
      // OPTIMIZATION: Use shorter prompt for simple queries
      const optimizedPrompt = getOptimalPrompt(content, systemPromptToUse);
      console.log(`🚀 PROMPT OPTIMIZATION: ${optimizedPrompt.length} chars vs ${systemPromptToUse.length} chars (${((1 - optimizedPrompt.length / systemPromptToUse.length) * 100).toFixed(1)}% reduction)`);
      
      messages.unshift({
        role: "system",
        content: optimizedPrompt,
      });
    }

    // Inject zodiac from user's birthday (already fetched in parallel above)
    // NOTE: This is needed for OpenAI call, so it must happen before
    const zodiac = getZodiacSign(userForZodiac?.dateOfBirth);
    if (zodiac) {
      messages.unshift({ role: "system", content: `User Zodiac: ${zodiac} ` });
    }
    if (userForZodiac?.dateOfBirth) {
      messages.unshift({
        role: "system",
        content: `User Birthdate: ${userForZodiac.dateOfBirth}`,
      });
    }

    // OPTIMIZATION: Store logging data for later (non-blocking)
    // These logging operations will be executed after OpenAI response
    const loggingData = {
      chatId,
      userId,
      systemPrompts: messages
        .filter((msg) => msg.role === "system")
        .map((msg) => msg.content),
      systemPromptCount: messages.filter((msg) => msg.role === "system").length,
      mainSystemPrompt: systemPromptToUse || "No system prompt set",
      promptSource: aiConfig?.systemPrompt ? "ai-config-table" : (chat.systemPrompt ? "chat-specific" : "none"),
      aiConfigPrompt: aiConfig?.systemPrompt || null,
      aiConfigActive: aiConfig?.systemPromptActive || false,
      chatSystemPrompt: chat.systemPrompt || null,
      zodiac: zodiac || null,
      birthdate: userForZodiac?.dateOfBirth || null,
      vectorRetrievalUsed: usingVectorDB,
      messagesPreview: messages.map((msg) => ({
        role: msg.role,
        contentLength: msg.content?.length || 0,
        contentPreview: msg.role === "system" 
          ? msg.content?.substring(0, 200) + (msg.content?.length > 200 ? "..." : "")
          : msg.content?.substring(0, 100) + (msg.content?.length > 100 ? "..." : ""),
      })),
    };

    let aiResponse = null;
    let tokensUsed = 0;
    let processingTime = 0;

    try {
      const startTime = Date.now();

      // OPTIMIZATION: Check cache for similar queries (only for text messages)
      if (!imageFile && !audioFile && !videoFile && content && content.trim().length > 0) {
        const cachedResponse = await responseCacheService.getCachedResponse(
          content,
          chatId,
          userId
        );

        if (cachedResponse) {
          // Use cached response
          processingTime = 10; // Cache lookup is very fast
          tokensUsed = 0; // No tokens used for cached response
          const aiContent = cachedResponse.content;

          if (aiContent) {
            aiResponse = await prisma.message.create({
              data: {
                content: aiContent,
                type: "TEXT",
                chatId,
                senderId: userId,
                isFromAI: true,
                aiModel: chat.aiModel,
                tokensUsed: 0,
                processingTime: 10,
              },
            });
          }

          // Update chat metadata
          await prisma.chat.update({
            where: { id: chatId },
            data: {
              lastMessageAt: new Date(),
              lastMessage: aiResponse?.content || userMessage.content,
              messageCount: { increment: 2 },
            },
          });

          return {
            message: "Message sent successfully (from cache).",
            success: true,
            data: {
              userMessage,
              aiResponse,
              fromCache: true,
              similarity: cachedResponse.similarity,
            },
          };
        }
      }

      // Call OpenAI API based on message type
      let completion;

      if (imageFile) {
        // Use OpenAI Vision API for images
        // Use preserved buffer or fallback to imageFile.buffer
        const bufferToUse = fileBufferForOpenAI || imageFile.buffer;
        
        if (!bufferToUse) {
          throw new Error("Image buffer is not available for OpenAI API call");
        }
        
        // Convert file buffer to base64 for OpenAI
        const base64Image = bufferToUse.toString("base64");
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

        console.log("Calling OpenAI Vision API with model: gpt-4o");
        completion = await openai.chat.completions.create({
          model: "gpt-4o", // Updated to use the current vision model
          messages: visionMessages,
          max_tokens: 1000,
        });
      } else if (audioFile) {
        // Use OpenAI Whisper API for audio transcription
        // Use preserved buffer or fallback to audioFile.buffer
        const bufferToUse = fileBufferForOpenAI || audioFile.buffer;
        
        if (!bufferToUse) {
          throw new Error("Audio buffer is not available for OpenAI API call");
        }
        
        console.log("Calling OpenAI Whisper API for transcription");
        const transcription = await openai.audio.transcriptions.create({
          file: bufferToUse, // Use preserved buffer
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
          ...getMaxTokenParam(chat.aiModel),
        });
      } else {
        // Regular text completion with model optimization
        messages.push({
          role: "user",
          content: content,
        });

        // OPTIMIZATION: Select optimal model based on query complexity
        const selectedModel = getOptimalModel(content, chat.aiModel);
        console.log(`🚀 MODEL OPTIMIZATION: Using ${selectedModel} for query length: ${content?.length} chars`);

        completion = await openai.chat.completions.create({
          model: selectedModel, // Optimized model selection
          messages: messages,
          temperature: chat.temperature,
          ...getMaxTokenParam(selectedModel), // Use selected model for token params
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

        // OPTIMIZATION: Cache the response for future similar queries
        // Only cache text responses (not media)
        if (!imageFile && !audioFile && !videoFile && content && content.trim().length > 0) {
          // Cache in background (non-blocking)
          setImmediate(async () => {
            try {
              await responseCacheService.setCachedResponse(
                content,
                chatId,
                userId,
                {
                  content: aiContent,
                  aiModel: chat.aiModel,
                  tokensUsed,
                  processingTime,
                }
              );
            } catch (cacheError) {
              // Non-critical - don't affect user experience
              console.error("Error caching response:", cacheError);
            }
          });
        }
      }

      // OPTIMIZATION: Execute non-critical logging operations after OpenAI response
      // This doesn't block the response from being sent to the user
      setImmediate(() => {
        try {
          // Log all system prompts being used
          Logger.info("System Prompts Being Used", {
            chatId: loggingData.chatId,
            userId: loggingData.userId,
            systemPrompts: loggingData.systemPrompts,
            systemPromptCount: loggingData.systemPromptCount,
            mainSystemPrompt: loggingData.mainSystemPrompt,
            promptSource: loggingData.promptSource,
            aiConfigPrompt: loggingData.aiConfigPrompt,
            aiConfigActive: loggingData.aiConfigActive,
            chatSystemPrompt: loggingData.chatSystemPrompt,
            zodiac: loggingData.zodiac,
            birthdate: loggingData.birthdate,
          });

          // Log full messages array (for debugging)
          Logger.debug("Full Messages Array Being Sent to OpenAI", {
            chatId: loggingData.chatId,
            messageCount: loggingData.messagesPreview.length,
            messages: loggingData.messagesPreview,
          });

          // Debug logging for prompt composition (gated by environment variable)
          if (process.env.DEBUG_RAG_PROMPT === 'true') {
            const baseSystemPromptSource = loggingData.aiConfigPrompt ? "ai-config" : 
                                         loggingData.chatSystemPrompt ? "chat-specific" : "none";
            const baseSystemPromptLength = (loggingData.aiConfigPrompt || loggingData.chatSystemPrompt || "").length;
            const finalSystemPromptLength = loggingData.mainSystemPrompt !== "No system prompt set" 
              ? loggingData.mainSystemPrompt.length : 0;
            
            Logger.info("RAG Prompt Composition Debug", {
              chatId: loggingData.chatId,
              userId: loggingData.userId,
              vectorRetrievalUsed: loggingData.vectorRetrievalUsed,
              baseSystemPromptSource,
              baseSystemPromptLength,
              retrievalContextAppended: loggingData.vectorRetrievalUsed,
              finalSystemPromptLength,
              DISABLE_VECTOR_RETRIEVAL,
            });
          }
        } catch (loggingError) {
          // Non-blocking logging error - don't affect user experience
          console.error("Logging error (non-critical):", loggingError);
        }
      });
    } catch (error) {
      console.error("OpenAI API Error:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        response: error.response?.data || error.response,
        code: error.code,
        type: error.type,
        stack: error.stack,
      });

      // Create error message with more details for debugging
      const errorMessage = error.message || "Unknown error occurred";
      const errorDetails = error.response?.data || error.response || {};
      
      console.error("Full error object:", JSON.stringify(errorDetails, null, 2));

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
   * Send message to AI and stream response in real-time
   * OPTIMIZATION: Streams response as it's generated for better UX
   */
  static async sendMessageStream(chatId, userId, data, res) {
    const { content, replyToId, imageFile, audioFile, videoFile } = data;

    try {
      // Set up Server-Sent Events headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      // Send initial connection message
      res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

      // OPTIMIZATION: Check cache for AI config first
      const AI_CONFIG_CACHE_KEY = "ai_config";
      let aiConfig = cacheService.get(AI_CONFIG_CACHE_KEY);
      
      // OPTIMIZATION: Parallelize independent database queries
      const dbQueries = [
        prisma.chat.findFirst({
          where: { id: chatId, userId },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { queryCount: true },
        }),
        aiConfig
          ? Promise.resolve(aiConfig)
          : prisma.aIConfig.findFirst({
              select: { systemPrompt: true, systemPromptActive: true, id: true },
            }).then((config) => {
              if (config) {
                cacheService.set(AI_CONFIG_CACHE_KEY, config, 5 * 60 * 1000);
              }
              return config;
            }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { dateOfBirth: true },
        }),
      ];

      const [chat, userForQueryCheck, fetchedAiConfig, userForZodiac] = await Promise.all(dbQueries);
      aiConfig = fetchedAiConfig;

      if (!chat) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Chat not found' })}\n\n`);
        res.end();
        return;
      }

      if (!userForQueryCheck) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'User not found' })}\n\n`);
        res.end();
        return;
      }

      // Check subscription and query count
      const subscriptionCheck = await RevenueCatService.getActiveSubscription(userId);
      const hasActiveSubscription = subscriptionCheck.hasActiveSubscription;

      if (!hasActiveSubscription) {
        if (userForQueryCheck.queryCount <= 0) {
          res.write(`data: ${JSON.stringify({ type: 'error', message: 'You have reached your free query limit. Please upgrade to continue.' })}\n\n`);
          res.end();
          return;
        }
        await prisma.user.update({
          where: { id: userId },
          data: { queryCount: { decrement: 1 } },
        });
      }

      // Handle file uploads (for now, streaming only supports text - can extend later)
      if (imageFile || audioFile || videoFile) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Streaming not yet supported for media files. Use regular endpoint.' })}\n\n`);
        res.end();
        return;
      }

      // Create user message
      const userMessage = await prisma.message.create({
        data: {
          content,
          type: "TEXT",
          chatId,
          senderId: userId,
          replyToId,
          isFromAI: false,
        },
      });

      // Send user message confirmation
      res.write(`data: ${JSON.stringify({ type: 'user_message', messageId: userMessage.id })}\n\n`);

      // Prepare messages for OpenAI context
      const previousMessages = await prisma.message.findMany({
        where: { chatId },
        orderBy: { createdAt: "asc" },
        take: 20,
      });

      const messages = previousMessages
        .filter((msg) => msg.content && msg.content.trim().length > 0)
        .map((msg) => ({
          role: msg.isFromAI ? "assistant" : "user",
          content: msg.content,
        }));

      // Add system prompt with optimization
      let systemPromptToUse = null;
      if (aiConfig?.systemPrompt) {
        systemPromptToUse = aiConfig.systemPrompt;
      } else if (chat.systemPrompt) {
        systemPromptToUse = chat.systemPrompt;
      }

      if (systemPromptToUse) {
        // OPTIMIZATION: Use shorter prompt for simple queries in streaming too
        const optimizedPrompt = getOptimalPrompt(content, systemPromptToUse);
        console.log(`🚀 STREAMING PROMPT OPTIMIZATION: ${optimizedPrompt.length} chars vs ${systemPromptToUse.length} chars`);
        
        messages.unshift({
          role: "system",
          content: optimizedPrompt,
        });
      }

      // Add zodiac
      const zodiac = getZodiacSign(userForZodiac?.dateOfBirth);
      if (zodiac) {
        messages.unshift({ role: "system", content: `User Zodiac: ${zodiac} ` });
      }
      if (userForZodiac?.dateOfBirth) {
        messages.unshift({
          role: "system",
          content: `User Birthdate: ${userForZodiac.dateOfBirth}`,
        });
      }

      // Add current user message
      messages.push({
        role: "user",
        content: content,
      });

      // Send processing started message
      res.write(`data: ${JSON.stringify({ type: 'processing' })}\n\n`);

      // Call OpenAI with streaming and model optimization
      const startTime = Date.now();
      let fullResponse = '';
      let tokensUsed = 0;

      // OPTIMIZATION: Select optimal model for streaming too
      const selectedModel = getOptimalModel(content, chat.aiModel);
      console.log(`🚀 STREAMING MODEL OPTIMIZATION: Using ${selectedModel} for query length: ${content?.length} chars`);

      const stream = await openai.chat.completions.create({
        model: selectedModel, // Optimized model selection
        messages: messages,
        temperature: chat.temperature,
        stream: true, // Enable streaming
        ...getMaxTokenParam(selectedModel), // Use selected model for token params
      });

      // Stream chunks to client
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          // Send chunk to client
          res.write(`data: ${JSON.stringify({ type: 'chunk', content })}\n\n`);
        }

        // Track token usage if available
        if (chunk.usage) {
          tokensUsed = chunk.usage.total_tokens || 0;
        }
      }

      const processingTime = Date.now() - startTime;

      // Save complete response to database
      let aiResponse = null;
      if (fullResponse) {
        aiResponse = await prisma.message.create({
          data: {
            content: fullResponse,
            type: "TEXT",
            chatId,
            senderId: userId,
            isFromAI: true,
            aiModel: chat.aiModel,
            tokensUsed,
            processingTime,
          },
        });
      }

      // Update chat metadata
      await prisma.chat.update({
        where: { id: chatId },
        data: {
          lastMessageAt: new Date(),
          lastMessage: fullResponse || userMessage.content,
          messageCount: { increment: 2 },
        },
      });

      // Send completion message
      res.write(`data: ${JSON.stringify({ 
        type: 'done', 
        messageId: aiResponse?.id,
        tokensUsed,
        processingTime 
      })}\n\n`);

      res.end();
    } catch (error) {
      console.error("Streaming error:", error);
      res.write(`data: ${JSON.stringify({ 
        type: 'error', 
        message: error.message || 'An error occurred while processing your request' 
      })}\n\n`);
      res.end();
    }
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

    // Log if system prompt was updated
    if (systemPrompt !== undefined) {
      Logger.info("Chat System Prompt Updated", {
        chatId,
        userId,
        oldSystemPrompt: chat.systemPrompt,
        newSystemPrompt: systemPrompt,
        aiModel: aiModel || chat.aiModel,
        temperature: temperature !== undefined ? temperature : chat.temperature,
      });
    }

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
        {
          id: "gpt-5.1",
          name: "GPT-5.1",
          description: "Next generation AI model",
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
   * Remove favorite message (delete from favorites)
   * DELETE /api/v1/chats/:chatId/messages/:messageId/remove-favorite
   */
  static async removeFavoriteMessage(chatId, messageId, userId) {
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
      throw new AppError(
        "Message is not in favorites.",
        HttpStatusCodes.BAD_REQUEST
      );
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
      message: "Favorite message removed successfully.",
      success: true,
      isFavorite: false,
    };
  }

  /**
   * Remove all favorite messages for a user
   * DELETE /api/v1/chats/favorites/remove-all
   */
  static async removeAllFavoriteMessages(userId) {
    // Count existing favorites before deletion
    const favoriteCount = await prisma.userMessageFavorite.count({
      where: { userId },
    });

    if (favoriteCount === 0) {
      return {
        message: "No favorite messages found to remove.",
        success: true,
        deletedCount: 0,
      };
    }

    // Delete all favorite messages for the user
    const deleteResult = await prisma.userMessageFavorite.deleteMany({
      where: { userId },
    });

    Logger.info("All favorite messages removed", {
      userId,
      deletedCount: deleteResult.count,
    });

    return {
      message: `Successfully removed ${deleteResult.count} favorite message(s).`,
      success: true,
      deletedCount: deleteResult.count,
    };
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
   * Get journey feed messages by category
   * GET /api/v1/journey/messages
   * 
   * UPDATED: Now returns only favorite messages
   */
  static async getJourneyMessages(userId, query = {}) {
    const { category, limit = 20, cursor } = query;
    const normalized = category?.toLowerCase();

    if (!normalized) {
      throw new AppError(
        "Journey category is required.",
        HttpStatusCodes.BAD_REQUEST
      );
    }

    if (normalized === "goals-achieved") {
      // UPDATED: Get only FAVORITED emotional messages for goal derivation
      const favorites = await prisma.userMessageFavorite.findMany({
        where: {
          userId,
          message: {
            isDeleted: false,
            isFromAI: false,
            emotion: { not: null },
            chat: { userId, isDeleted: false },
          },
        },
        include: {
          message: {
            include: {
              chat: { select: { id: true, name: true, type: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 500,
      });

      // Filter to only emotional user messages
      const emotionalMessages = favorites
        .filter(fav => fav.message && !fav.message.isFromAI && fav.message.emotion)
        .map(fav => fav.message);

      const detectedGoals = deriveGoalsFromActivity(emotionalMessages, favorites);
      const boundedGoals = detectedGoals.slice(0, Number(limit) || 20);

      return {
        success: true,
        data: {
          category: normalized,
          items: boundedGoals.map((goal) => ({
            id: goal.id,
            title: goal.title,
            summary: goal.summary,
            tags: goal.themes,
            duration: formatDuration(goal.startedAt, goal.completedAt),
            timestamp: goal.completedAt || goal.startedAt,
            emotion: goal.highlight
              ? {
                  label: goal.highlight.emotion,
                  confidence: goal.highlight.emotionConfidence,
                }
              : null,
            highlightMessage: goal.highlight
              ? {
                  id: goal.highlight.id,
                  content: goal.highlight.content,
                  emotion: goal.highlight.emotion,
                  emotionConfidence: goal.highlight.emotionConfidence,
                  source: mapChatTypeToSource(goal.highlight.chat?.type),
                  timestamp: goal.highlight.createdAt,
                }
              : null,
          })),
          nextCursor: null,
        },
      };
    }

    if (normalized === "growth-moments") {
      // UPDATED: Get only FAVORITED growth messages
      const favorites = await prisma.userMessageFavorite.findMany({
        where: {
          userId,
          message: {
            isDeleted: false,
            isFromAI: false,
            emotion: { in: ["joy", "surprise"] },
            emotionConfidence: { gte: 0.7 },
            chat: { userId, isDeleted: false },
          },
        },
        include: {
          message: {
            include: {
              chat: { select: { id: true, name: true, type: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: Number(limit) || 20,
      });

      const growthMessages = favorites.map(fav => fav.message).filter(Boolean);

      return {
        success: true,
        data: {
          category: normalized,
          items: growthMessages.map((msg) => ({
            id: msg.id,
            title: createCleanTitle(msg.content),
            primaryTag: mapEmotionToTag(msg.emotion, msg.emotionConfidence),
            tags: buildSecondaryTags(msg),
            source: mapChatTypeToSource(msg.chat?.type),
            timestamp: msg.createdAt,
            emotion: {
              label: msg.emotion,
              confidence: msg.emotionConfidence,
            },
            chat: {
              id: msg.chat?.id,
              name: msg.chat?.name,
            },
          })),
          nextCursor: null,
        },
      };
    }

    if (normalized === "heart-to-hearts") {
      // IMPORTANT: Get ONLY FAVORITED messages from chats with >= 3 favorited emotional messages
      // This query only returns messages that are in the userMessageFavorite table
      const favorites = await prisma.userMessageFavorite.findMany({
        where: {
          userId,
          message: {
            isDeleted: false,
            isFromAI: false,
            emotion: { not: null },
            emotionConfidence: { gte: 0.6 },
            chat: { userId, isDeleted: false },
          },
        },
        include: {
          message: {
            include: {
              chat: { select: { id: true, name: true, type: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Extract only favorited messages (double-check to ensure we only use favorites)
      const favoritedMessages = favorites
        .map(fav => fav.message)
        .filter(msg => msg !== null && msg !== undefined);

      // Group by chat and filter chats with >= 3 favorited emotional messages
      const chatMap = new Map();
      favoritedMessages.forEach(msg => {
        if (msg && msg.chat) {
          const chatId = msg.chat.id;
          if (!chatMap.has(chatId)) {
            chatMap.set(chatId, {
              chat: msg.chat,
              messages: [],
            });
          }
          chatMap.get(chatId).messages.push(msg);
        }
      });

      // Filter to chats with >= 3 favorited emotional messages
      const qualifiedChats = Array.from(chatMap.values())
        .filter(item => item.messages.length >= 3);

      // Get ONLY favorited messages from qualified chats
      const heartToHeartMessages = qualifiedChats
        .flatMap(item => item.messages)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, Number(limit) || 20);

      return {
        success: true,
        data: {
          category: normalized,
          items: heartToHeartMessages.map((msg) => ({
            id: msg.id,
            title: createCleanTitle(msg.content),
            primaryTag: mapEmotionToTag(msg.emotion, msg.emotionConfidence),
            tags: buildSecondaryTags(msg),
            source: mapChatTypeToSource(msg.chat?.type),
            timestamp: msg.createdAt,
            emotion: {
              label: msg.emotion,
              confidence: msg.emotionConfidence,
            },
            chat: {
              id: msg.chat?.id,
              name: msg.chat?.name,
            },
          })),
          nextCursor: null,
        },
      };
    }

    if (normalized === "breakthrough-days") {
      // UPDATED: Get only FAVORITED emotional messages with confidence >= 0.7
      const favorites = await prisma.userMessageFavorite.findMany({
        where: {
          userId,
          message: {
            isDeleted: false,
            isFromAI: false,
            emotion: { not: null },
            emotionConfidence: { gte: 0.7 },
            chat: { userId, isDeleted: false },
          },
        },
        include: {
          message: {
            include: {
              chat: { select: { id: true, name: true, type: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const rawMessages = favorites.map(fav => fav.message).filter(Boolean);

      const grouped = rawMessages.reduce((acc, msg) => {
        const key = toDateKey(msg.createdAt);
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(msg);
        return acc;
      }, {});

      const items = Object.entries(grouped)
        .map(([dateKey, list]) => {
          const total = list.length;
          const positive = list.filter((message) =>
            ["joy", "surprise"].includes(message.emotion?.toLowerCase())
          ).length;

          if (
            total < BREAKTHROUGH_MIN_TOTAL ||
            positive < BREAKTHROUGH_MIN_POSITIVE
          ) {
            return null;
          }

          const highlight = list.reduce(
            (best, current) =>
              !best || current.emotionConfidence > best.emotionConfidence
                ? current
                : best,
            null
          );

          return {
            id: dateKey,
            title: createCleanTitle(highlight?.content) || "Breakthrough captured.",
            primaryTag: mapEmotionToTag(
              highlight?.emotion,
              highlight?.emotionConfidence
            ),
            tags: buildSecondaryTags(highlight || {}),
            source: mapChatTypeToSource(highlight?.chat?.type),
            timestamp: highlight?.createdAt || dateKey,
            emotion: {
              label: highlight?.emotion,
              confidence: highlight?.emotionConfidence,
            },
            metrics: {
              messageCount: total,
              positiveCount: positive,
            },
            messages: list.slice(0, 3).map((message) => ({
              id: message.id,
              content: message.content,
              timestamp: message.createdAt,
              emotion: {
                label: message.emotion,
                confidence: message.emotionConfidence,
              },
              source: mapChatTypeToSource(message.chat?.type),
            })),
          };
        })
        .filter(Boolean)
        .sort((a, b) => new Date(b.id) - new Date(a.id))
        .slice(0, Number(limit) || 20);

      return {
        success: true,
        data: {
          category: normalized,
          items,
          nextCursor: null,
        },
      };
    }

    // UPDATED: For any other categories, use only FAVORITED messages
    const filterConfig = JOURNEY_CATEGORY_FILTERS[normalized];

    if (!filterConfig) {
      throw new AppError(
        "Invalid journey category.",
        HttpStatusCodes.BAD_REQUEST
      );
    }

    const take = Math.min(Number(limit) || 20, 50);
    
    // Handle cursor pagination for messages
    let cursorFilter = {};
    if (cursor) {
      const cursorMessage = await prisma.message.findUnique({
        where: { id: cursor },
      });
      
      if (cursorMessage) {
        cursorFilter = {
          createdAt: { lt: cursorMessage.createdAt },
        };
      }
    }
    
    // UPDATED: Get only FAVORITED emotional messages
    const favorites = await prisma.userMessageFavorite.findMany({
      where: {
        userId,
        message: {
          chat: { userId, isDeleted: false },
          isDeleted: false,
          isFromAI: false,
          emotion: { not: null },
          ...cursorFilter,
          ...filterConfig.where,
        },
      },
      include: {
        message: {
          include: {
            chat: { select: { id: true, name: true, type: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take,
    });

    const messages = favorites.map(fav => fav.message).filter(Boolean);

    return {
      success: true,
      data: {
        category: normalized,
        items: messages.map((msg) => ({
          id: msg.id,
          title: createCleanTitle(msg.content),
          primaryTag: mapEmotionToTag(msg.emotion, msg.emotionConfidence),
          tags: buildSecondaryTags(msg),
          source: mapChatTypeToSource(msg.chat?.type),
          timestamp: msg.createdAt,
          emotion: {
            label: msg.emotion,
            confidence: msg.emotionConfidence,
          },
          chat: {
            id: msg.chat?.id,
            name: msg.chat?.name,
          },
        })),
        nextCursor:
          messages.length === take ? messages[messages.length - 1].id : null,
      },
    };
  }

  /**
   * Get journey page data for user
   * GET /api/v1/journey
   * UPDATED: Now returns only favorite messages
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

      // UPDATED: Calculate all metrics using only favorite messages
      let heartToHeartsResult, growthMomentsCount, growthMomentsList, breakthroughDaysData;
      let totalChats, totalMessages, totalFavorites, totalMedia, favoriteMessages;
      
      try {
        [
          // Statistics (unchanged)
          totalChats,
          totalMessages,
          totalFavorites,
          totalMedia,
          // Favorite messages for vault
          favoriteMessages,
        ] = await Promise.all([
        // Statistics (unchanged)
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

      } catch (promiseError) {
        console.error("Error in Promise.all execution:", promiseError);
        // Set default values if Promise.all fails
        totalChats = 0;
        totalMessages = 0;
        totalFavorites = 0;
        totalMedia = 0;
        favoriteMessages = [];
      }

      // Ensure all variables are defined with fallbacks
      totalChats = totalChats || 0;
      totalMessages = totalMessages || 0;
      totalFavorites = totalFavorites || 0;
      totalMedia = totalMedia || 0;
      favoriteMessages = favoriteMessages || [];

      // Get all favorited emotional messages for processing categories
      const allFavoritedEmotionalMessages = await prisma.userMessageFavorite.findMany({
        where: {
          userId,
          message: {
            isDeleted: false,
            isFromAI: false,
            emotion: { not: null },
            chat: { userId, isDeleted: false },
          },
        },
        include: {
          message: {
            include: {
              chat: { select: { id: true, name: true, type: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Extract messages from favorites
      const favoritedMessages = allFavoritedEmotionalMessages
        .map(fav => fav.message)
        .filter(msg => msg !== null);

      // Goals Achieved: Only use favorited messages for goal derivation
      const messagesForGoals = favoritedMessages;
      const favoritesForGoals = allFavoritedEmotionalMessages;

      const derivedGoals = deriveGoalsFromActivity(
        messagesForGoals,
        favoritesForGoals
      );
      const goalsAchieved = derivedGoals.length;

      // Process Heart-to-Hearts: Group favorited messages by chat
      const chatFavoritesMap = new Map();
      favoritedMessages
        .filter(msg => msg.emotionConfidence >= 0.6)
        .forEach(msg => {
          const chatId = msg.chat?.id;
          if (chatId) {
            if (!chatFavoritesMap.has(chatId)) {
              chatFavoritesMap.set(chatId, {
                id: chatId,
                name: msg.chat.name,
                type: msg.chat.type,
                count: 0,
                updatedAt: msg.createdAt,
              });
            }
            chatFavoritesMap.get(chatId).count++;
            // Update updatedAt to most recent message
            if (new Date(msg.createdAt) > new Date(chatFavoritesMap.get(chatId).updatedAt)) {
              chatFavoritesMap.get(chatId).updatedAt = msg.createdAt;
            }
          }
        });

      // Filter chats with >= 3 favorited emotional messages
      const heartToHeartsQualified = Array.from(chatFavoritesMap.values())
        .filter(chat => chat.count >= 3)
        .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      
      const heartToHearts = heartToHeartsQualified.length;
      const heartToHeartsList = heartToHeartsQualified
        .slice(0, chatLimit)
        .map((chat) => ({
          chatId: chat.id,
          chatName: chat.name,
          chatType: chat.type,
          emotionalMessageCount: chat.count,
          lastUpdatedAt: chat.updatedAt,
        }));

      // Process Growth Moments: Only favorited messages with joy/surprise
      const growthMomentsFavorited = favoritedMessages.filter(
        msg => 
          ["joy", "surprise"].includes(msg.emotion) && 
          msg.emotionConfidence >= 0.7
      );
      
      growthMomentsCount = growthMomentsFavorited.length;
      const growthMomentsDetailList = growthMomentsFavorited
        .slice(0, messageLimit)
        .map((msg) => ({
          id: msg.id,
          content: msg.content,
          emotion: msg.emotion,
          emotionConfidence: msg.emotionConfidence,
          createdAt: msg.createdAt,
          chat: {
            id: msg.chat?.id,
            name: msg.chat?.name,
            type: msg.chat?.type,
          },
        }));

      // Process Breakthrough Days: Group favorited messages by date
      const breakthroughMessages = favoritedMessages.filter(
        msg => msg.emotionConfidence >= 0.7
      );

      const dailyEmotions = {};
      breakthroughMessages.forEach((msg) => {
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

      // Weekly Journey: Only count favorited messages
      const currentDate = new Date();
      const weeksSinceRegistration = Math.floor(
        (currentDate - new Date(user.createdAt)) / (7 * 24 * 60 * 60 * 1000)
      );

      // Fetch favorited messages for last 4 weeks
      const fourWeeksAgo = new Date(currentDate);
      fourWeeksAgo.setDate(currentDate.getDate() - 28);

      const weeklyFavorites = await prisma.userMessageFavorite.findMany({
        where: {
          userId,
          createdAt: { gte: fourWeeksAgo },
          message: {
            isDeleted: false,
            isFromAI: false,
            chat: { userId, isDeleted: false },
            emotion: { not: null },
          },
        },
        include: {
          message: {
            select: {
              emotion: true,
              emotionConfidence: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const weeklyMessages = weeklyFavorites.map(fav => fav.message);

      // Process weekly data
      // Week 1 = current week (includes today), Week 2-4 = previous weeks
      const weeklyJourneys = [];
      for (let i = 0; i < 4; i++) {
        let weekStart, weekEnd;
        
        if (i === 0) {
          // Current week: from last Sunday to TODAY
          const daysSinceSunday = currentDate.getDay(); // 0=Sun, 1=Mon, etc.
          weekStart = new Date(currentDate);
          weekStart.setDate(currentDate.getDate() - daysSinceSunday);
          weekStart.setHours(0, 0, 0, 0);
          
          weekEnd = new Date(currentDate);
          weekEnd.setHours(23, 59, 59, 999);
        } else {
          // Previous complete weeks (Sun-Sat)
          const daysSinceSunday = currentDate.getDay();
          weekEnd = new Date(currentDate);
          weekEnd.setDate(currentDate.getDate() - daysSinceSunday - (i - 1) * 7 - 1);
          weekEnd.setHours(23, 59, 59, 999);

          weekStart = new Date(weekEnd);
          weekStart.setDate(weekEnd.getDate() - 6);
          weekStart.setHours(0, 0, 0, 0);
        }

        // Filter messages for this week
        const weekMsgs = weeklyMessages.filter((msg) => {
          const msgDate = new Date(msg.createdAt);
          return msgDate >= weekStart && msgDate <= weekEnd;
        });

        // Calculate progress: 20 favorited emotional messages = 100%
        const rawProgress = (weekMsgs.length / 20) * 100;
        const progress = Math.min(100, Math.max(0, Math.floor(rawProgress)));

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

        const emotionTag = mapEmotionToTag(
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

        const emotionTag = mapEmotionToTag(
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
            heartToHearts: {
              count: heartToHearts,
              items: heartToHeartsList,
            },
            growthMoments: {
              count: growthMomentsCount || 0,
              items: growthMomentsDetailList || [],
            },
            breakthroughDays,
            goalsAchieved,
          },
          recentGoals: derivedGoals.slice(0, 5).map((goal) => ({
            id: goal.id,
            title: goal.title,
            summary: goal.summary,
            themes: goal.themes,
            duration: formatDuration(goal.startedAt, goal.completedAt),
            completedAt: goal.completedAt,
            highlightMessage: goal.highlight
              ? {
                  id: goal.highlight.id,
                  content: goal.highlight.content,
                  emotion: goal.highlight.emotion,
                  emotionConfidence: goal.highlight.emotionConfidence,
                  source: mapChatTypeToSource(goal.highlight.chat?.type),
                  timestamp: goal.highlight.createdAt,
                }
              : null,
          })),
          weeklyJourney: weeklyJourneys,
          vaultOfSecrets,
          recentChats,
          statistics: {
            totalChats,
            totalMessages,
            totalFavorites,
            totalMedia,
            heartToHearts: heartToHearts,
            growthMoments: growthMomentsCount || 0,
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
