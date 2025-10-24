const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class EmotionalRuleService {
  /**
   * Get all emotional rules
   */
  static async getAllEmotionalRules() {
    const emotionalRules = await prisma.EmotionalRule.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });

    if (!emotionalRules || emotionalRules.length === 0) {
      return {
        message: "No emotional rules found.",
        success: false,
        data: null,
      };
    }

    return {
      message: "Emotional rules retrieved successfully.",
      success: true,
      data: emotionalRules,
    };
  }

  /**
   * Get single emotional rule by ID
   */
  static async getEmotionalRuleById(id) {
    const emotionalRule = await prisma.EmotionalRule.findUnique({
      where: { id },
    });

    if (!emotionalRule) {
      return {
        message: "Emotional rule not found.",
        success: false,
        data: null,
      };
    }

    return {
      message: "Emotional rule retrieved successfully.",
      success: true,
      data: emotionalRule,
    };
  }

  /**
   * Create new emotional rule
   */
  static async createEmotionalRule(data) {
    const {
      trigger,
      responseType,
      tone,
      description,
      priority = 1,
      isActive = true,
    } = data;

    // Validate required fields
    if (!trigger || !responseType || !tone || !description) {
      return {
        message:
          "Missing required fields: trigger, responseType, tone, and description are required.",
        success: false,
        data: null,
      };
    }

    const emotionalRule = await prisma.EmotionalRule.create({
      data: {
        trigger,
        responseType,
        tone,
        description,
        priority,
        isActive,
      },
    });

    return {
      message: "Emotional rule created successfully.",
      success: true,
      data: emotionalRule,
    };
  }

  /**
   * Update emotional rule
   */
  static async updateEmotionalRule(id, data) {
    const existingRule = await prisma.EmotionalRule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return {
        message: "Emotional rule not found.",
        success: false,
        data: null,
      };
    }

    const emotionalRule = await prisma.EmotionalRule.update({
      where: { id },
      data,
    });

    return {
      message: "Emotional rule updated successfully.",
      success: true,
      data: emotionalRule,
    };
  }

  /**
   * Delete emotional rule
   */
  static async deleteEmotionalRule(id) {
    const existingRule = await prisma.EmotionalRule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return {
        message: "Emotional rule not found.",
        success: false,
        data: null,
      };
    }

    await prisma.EmotionalRule.delete({
      where: { id },
    });

    return {
      message: "Emotional rule deleted successfully.",
      success: true,
      data: null,
    };
  }

  /**
   * Toggle emotional rule active status
   */
  static async toggleEmotionalRuleStatus(id) {
    const existingRule = await prisma.EmotionalRule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return {
        message: "Emotional rule not found.",
        success: false,
        data: null,
      };
    }

    const emotionalRule = await prisma.EmotionalRule.update({
      where: { id },
      data: { isActive: !existingRule.isActive },
    });

    return {
      message: `Emotional rule ${
        emotionalRule.isActive ? "activated" : "deactivated"
      } successfully.`,
      success: true,
      data: emotionalRule,
    };
  }

  /**
   * Get emotional rules by trigger
   */
  static async getEmotionalRulesByTrigger(trigger) {
    const emotionalRules = await prisma.EmotionalRule.findMany({
      where: {
        trigger: {
          contains: trigger,
          mode: "insensitive",
        },
        isActive: true,
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });

    if (!emotionalRules || emotionalRules.length === 0) {
      return {
        message: `No active emotional rules found for trigger: ${trigger}`,
        success: false,
        data: null,
      };
    }

    return {
      message: "Emotional rules retrieved successfully.",
      success: true,
      data: emotionalRules,
    };
  }

  /**
   * Get active emotional rules
   */
  static async getActiveEmotionalRules() {
    const emotionalRules = await prisma.EmotionalRule.findMany({
      where: { isActive: true },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });

    return {
      message: "Active emotional rules retrieved successfully.",
      success: true,
      data: emotionalRules,
    };
  }
}

module.exports = EmotionalRuleService;
