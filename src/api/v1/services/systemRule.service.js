const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

class SystemRuleService {
  /**
   * Get all system rules
   */
  static async getAllSystemRules() {
    const systemRules = await prisma.SystemRule.findMany({
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });

    if (!systemRules || systemRules.length === 0) {
      return {
        message: "No system rules found.",
        success: false,
        data: null,
      };
    }

    return {
      message: "System rules retrieved successfully.",
      success: true,
      data: systemRules,
    };
  }

  /**
   * Get single system rule by ID
   */
  static async getSystemRuleById(id) {
    const systemRule = await prisma.SystemRule.findUnique({
      where: { id },
    });

    if (!systemRule) {
      return {
        message: "System rule not found.",
        success: false,
        data: null,
      };
    }

    return {
      message: "System rule retrieved successfully.",
      success: true,
      data: systemRule,
    };
  }

  /**
   * Create new system rule
   */
  static async createSystemRule(data) {
    const {
      name,
      category,
      ruleType,
      content,
      description,
      priority = 1,
      severity = "MEDIUM",
      isActive = true,
    } = data;

    // Validate required fields
    if (!name || !category || !ruleType || !content || !description) {
      return {
        message:
          "Missing required fields: name, category, ruleType, content, and description are required.",
        success: false,
        data: null,
      };
    }

    // Validate category
    const validCategories = ["CONTENT_FILTER", "IDENTITY", "BEHAVIOR", "SAFETY", "GENERAL"];
    if (!validCategories.includes(category)) {
      return {
        message: `Invalid category. Must be one of: ${validCategories.join(", ")}`,
        success: false,
        data: null,
      };
    }

    // Validate ruleType
    const validRuleTypes = ["RESTRICTION", "INSTRUCTION", "IDENTITY", "GUIDELINE"];
    if (!validRuleTypes.includes(ruleType)) {
      return {
        message: `Invalid ruleType. Must be one of: ${validRuleTypes.join(", ")}`,
        success: false,
        data: null,
      };
    }

    // Validate severity
    const validSeverities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    if (!validSeverities.includes(severity)) {
      return {
        message: `Invalid severity. Must be one of: ${validSeverities.join(", ")}`,
        success: false,
        data: null,
      };
    }

    const systemRule = await prisma.SystemRule.create({
      data: {
        name,
        category,
        ruleType,
        content,
        description,
        priority,
        severity,
        isActive,
      },
    });

    return {
      message: "System rule created successfully.",
      success: true,
      data: systemRule,
    };
  }

  /**
   * Update system rule
   */
  static async updateSystemRule(id, data) {
    const existingRule = await prisma.SystemRule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return {
        message: "System rule not found.",
        success: false,
        data: null,
      };
    }

    const systemRule = await prisma.SystemRule.update({
      where: { id },
      data,
    });

    return {
      message: "System rule updated successfully.",
      success: true,
      data: systemRule,
    };
  }

  /**
   * Delete system rule
   */
  static async deleteSystemRule(id) {
    const existingRule = await prisma.SystemRule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return {
        message: "System rule not found.",
        success: false,
        data: null,
      };
    }

    await prisma.SystemRule.delete({
      where: { id },
    });

    return {
      message: "System rule deleted successfully.",
      success: true,
      data: null,
    };
  }

  /**
   * Toggle system rule active status
   */
  static async toggleSystemRuleStatus(id) {
    const existingRule = await prisma.SystemRule.findUnique({
      where: { id },
    });

    if (!existingRule) {
      return {
        message: "System rule not found.",
        success: false,
        data: null,
      };
    }

    const systemRule = await prisma.SystemRule.update({
      where: { id },
      data: { isActive: !existingRule.isActive },
    });

    return {
      message: `System rule ${
        systemRule.isActive ? "activated" : "deactivated"
      } successfully.`,
      success: true,
      data: systemRule,
    };
  }

  /**
   * Get system rules by category
   */
  static async getSystemRulesByCategory(category) {
    const systemRules = await prisma.SystemRule.findMany({
      where: {
        category: category.toUpperCase(),
        isActive: true,
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });

    if (!systemRules || systemRules.length === 0) {
      return {
        message: `No active system rules found for category: ${category}`,
        success: false,
        data: null,
      };
    }

    return {
      message: "System rules retrieved successfully.",
      success: true,
      data: systemRules,
    };
  }

  /**
   * Get active system rules
   */
  static async getActiveSystemRules() {
    const systemRules = await prisma.SystemRule.findMany({
      where: { isActive: true },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });

    return {
      message: "Active system rules retrieved successfully.",
      success: true,
      data: systemRules,
    };
  }

  /**
   * Get system rules formatted for AI prompt
   */
  static async getSystemRulesForPrompt() {
    try {
      const activeRules = await prisma.SystemRule.findMany({
        where: { isActive: true },
        orderBy: [{ severity: "desc" }, { priority: "desc" }, { createdAt: "asc" }],
      });

      if (!activeRules || activeRules.length === 0) {
        return null;
      }

      // Group rules by category for better organization
      const rulesByCategory = activeRules.reduce((acc, rule) => {
        if (!acc[rule.category]) {
          acc[rule.category] = [];
        }
        acc[rule.category].push(rule);
        return acc;
      }, {});

      // Format rules for AI prompt
      let formattedRules = "";

      // Critical and High severity rules first
      const criticalRules = activeRules.filter(rule => 
        rule.severity === "CRITICAL" || rule.severity === "HIGH"
      );
      
      if (criticalRules.length > 0) {
        formattedRules += "CRITICAL SYSTEM RULES (MUST FOLLOW):\n";
        criticalRules.forEach(rule => {
          formattedRules += `- ${rule.content}\n`;
        });
        formattedRules += "\n";
      }

      // Content restrictions
      if (rulesByCategory.CONTENT_FILTER) {
        formattedRules += "CONTENT RESTRICTIONS:\n";
        rulesByCategory.CONTENT_FILTER.forEach(rule => {
          if (rule.severity !== "CRITICAL" && rule.severity !== "HIGH") {
            formattedRules += `- ${rule.content}\n`;
          }
        });
        formattedRules += "\n";
      }

      // Identity rules
      if (rulesByCategory.IDENTITY) {
        formattedRules += "IDENTITY & INFORMATION:\n";
        rulesByCategory.IDENTITY.forEach(rule => {
          if (rule.severity !== "CRITICAL" && rule.severity !== "HIGH") {
            formattedRules += `- ${rule.content}\n`;
          }
        });
        formattedRules += "\n";
      }

      // Behavioral guidelines
      if (rulesByCategory.BEHAVIOR) {
        formattedRules += "BEHAVIORAL GUIDELINES:\n";
        rulesByCategory.BEHAVIOR.forEach(rule => {
          if (rule.severity !== "CRITICAL" && rule.severity !== "HIGH") {
            formattedRules += `- ${rule.content}\n`;
          }
        });
        formattedRules += "\n";
      }

      // Safety rules
      if (rulesByCategory.SAFETY) {
        formattedRules += "SAFETY GUIDELINES:\n";
        rulesByCategory.SAFETY.forEach(rule => {
          if (rule.severity !== "CRITICAL" && rule.severity !== "HIGH") {
            formattedRules += `- ${rule.content}\n`;
          }
        });
        formattedRules += "\n";
      }

      // General rules
      if (rulesByCategory.GENERAL) {
        formattedRules += "GENERAL GUIDELINES:\n";
        rulesByCategory.GENERAL.forEach(rule => {
          if (rule.severity !== "CRITICAL" && rule.severity !== "HIGH") {
            formattedRules += `- ${rule.content}\n`;
          }
        });
        formattedRules += "\n";
      }

      const systemPrompt = `
SYSTEM RULES AND GUIDELINES:
${formattedRules}
IMPORTANT: These system rules are mandatory and must be followed at all times. They take precedence over all other instructions.
      `.trim();

      return systemPrompt;
    } catch (error) {
      console.error("Error fetching system rules for prompt:", error);
      return null;
    }
  }
}

module.exports = SystemRuleService;