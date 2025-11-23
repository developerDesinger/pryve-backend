const prisma = require("../../../lib/prisma");
const AppError = require("../utils/AppError");
const HttpStatusCodes = require("../enums/httpStatusCode");
const Logger = require("../utils/logger");

class SupportService {
  /**
   * Create support message (Client)
   * POST /api/v1/support
   */
  static async createSupportMessage(userId, data) {
    const { subject, message, category } = data;

    if (!subject || !message) {
      throw new AppError(
        "Subject and message are required.",
        HttpStatusCodes.BAD_REQUEST
      );
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true },
    });

    if (!user) {
      throw new AppError("User not found.", HttpStatusCodes.NOT_FOUND);
    }

    // Create support message
    const supportMessage = await prisma.supportMessage.create({
      data: {
        subject,
        message,
        userId,
        category: category || null,
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            userName: true,
          },
        },
      },
    });

    Logger.info("Support message created", {
      supportMessageId: supportMessage.id,
      userId,
    });

    return {
      message: "Support message created successfully.",
      success: true,
      data: supportMessage,
    };
  }

  /**
   * Get all support messages (Admin sees all, Client sees only their own)
   * GET /api/v1/support
   */
  static async getSupportMessages(userId, userRole, query) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status, category } = query;

    // Build where clause
    const where = {};
    
    // Clients can only see their own messages
    if (userRole !== "ADMIN") {
      where.userId = userId;
    }

    // Apply filters
    if (status) where.status = status;
    if (category) where.category = category;

    // Get total count
    const total = await prisma.supportMessage.count({ where });

    // Get messages
    const messages = await prisma.supportMessage.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            userName: true,
            profilePhoto: true,
          },
        },
      },
    });

    return {
      message: "Support messages fetched successfully.",
      success: true,
      data: messages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        limit,
      },
    };
  }

  /**
   * Get single support message
   * GET /api/v1/support/:id
   */
  static async getSupportMessage(messageId, userId, userRole) {
    const message = await prisma.supportMessage.findUnique({
      where: { id: messageId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            userName: true,
            profilePhoto: true,
          },
        },
      },
    });

    if (!message) {
      throw new AppError("Support message not found.", HttpStatusCodes.NOT_FOUND);
    }

    // Clients can only view their own messages
    if (userRole !== "ADMIN" && message.userId !== userId) {
      throw new AppError(
        "Unauthorized access.",
        HttpStatusCodes.FORBIDDEN
      );
    }

    return {
      message: "Support message fetched successfully.",
      success: true,
      data: message,
    };
  }

  /**
   * Update support message (Admin can update status, Client can update their own)
   * PATCH /api/v1/support/:id
   */
  static async updateSupportMessage(messageId, userId, userRole, data) {
    const message = await prisma.supportMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new AppError("Support message not found.", HttpStatusCodes.NOT_FOUND);
    }

    // Clients can only update their own messages
    if (userRole !== "ADMIN" && message.userId !== userId) {
      throw new AppError("Unauthorized access.", HttpStatusCodes.FORBIDDEN);
    }

    const updateData = {};

    // Admin can update status
    if (userRole === "ADMIN" && data.status) {
      updateData.status = data.status;
    }

    // Clients can update their own messages (subject, message, category)
    if (data.subject) updateData.subject = data.subject;
    if (data.message) updateData.message = data.message;
    if (data.category !== undefined) updateData.category = data.category;

    const updatedMessage = await prisma.supportMessage.update({
      where: { id: messageId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
            userName: true,
          },
        },
      },
    });

    Logger.info("Support message updated", {
      supportMessageId: messageId,
      userId,
      userRole,
    });

    return {
      message: "Support message updated successfully.",
      success: true,
      data: updatedMessage,
    };
  }

  /**
   * Delete support message
   * DELETE /api/v1/support/:id
   */
  static async deleteSupportMessage(messageId, userId, userRole) {
    const message = await prisma.supportMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new AppError("Support message not found.", HttpStatusCodes.NOT_FOUND);
    }

    // Clients can only delete their own messages
    if (userRole !== "ADMIN" && message.userId !== userId) {
      throw new AppError("Unauthorized access.", HttpStatusCodes.FORBIDDEN);
    }

    await prisma.supportMessage.delete({
      where: { id: messageId },
    });

    Logger.info("Support message deleted", {
      supportMessageId: messageId,
      userId,
      userRole,
    });

    return {
      message: "Support message deleted successfully.",
      success: true,
    };
  }
}

module.exports = SupportService;

