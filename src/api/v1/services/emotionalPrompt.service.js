const { PrismaClient } = require("@prisma/client");
const SystemRuleService = require("./systemRule.service");
const prisma = new PrismaClient();

class EmotionalPromptService {
  /**
   * Get active emotional rules and format them for AI prompt
   */
  static async getEmotionalRulesForPrompt() {
    try {
      const activeRules = await prisma.EmotionalRule.findMany({
        where: { isActive: true },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      });

      if (!activeRules || activeRules.length === 0) {
        return null;
      }

      // Format rules for AI prompt
      const formattedRules = activeRules.map(rule => {
        return `- When user expresses "${rule.trigger}": Use ${rule.responseType} with ${rule.tone} tone. ${rule.description}`;
      }).join('\n');

      const emotionalPrompt = `
EMOTIONAL RESPONSE GUIDELINES:
You must follow these emotional response rules when interacting with users:

${formattedRules}

IMPORTANT: These rules take priority over general conversation guidelines. Always match your response tone and type to the user's emotional state as defined above.
      `.trim();

      return emotionalPrompt;
    } catch (error) {
      console.error("Error fetching emotional rules for prompt:", error);
      return null;
    }
  }

  /**
   * Get emotional rules that match a specific trigger/emotion
   */
  static async getMatchingEmotionalRules(userMessage) {
    try {
      if (!userMessage || typeof userMessage !== 'string') {
        return [];
      }

      const activeRules = await prisma.EmotionalRule.findMany({
        where: { isActive: true },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      });

      // Find rules that match the user's message content
      const matchingRules = activeRules.filter(rule => {
        const trigger = rule.trigger.toLowerCase();
        const message = userMessage.toLowerCase();
        
        // Check if trigger appears in the message
        return message.includes(trigger);
      });

      return matchingRules;
    } catch (error) {
      console.error("Error finding matching emotional rules:", error);
      return [];
    }
  }

  /**
   * Build enhanced system prompt with emotional rules and system rules
   */
  static async buildEnhancedSystemPrompt(baseSystemPrompt, userMessage = null) {
    try {
      // Get both emotional rules and system rules
      const [emotionalRulesPrompt, systemRulesPrompt] = await Promise.all([
        this.getEmotionalRulesForPrompt(),
        SystemRuleService.getSystemRulesForPrompt()
      ]);
      
      let enhancedPrompt = baseSystemPrompt;

      // Add system rules first (they have higher priority)
      if (systemRulesPrompt) {
        enhancedPrompt += `\n\n${systemRulesPrompt}`;
      }

      // Add emotional rules
      if (emotionalRulesPrompt) {
        enhancedPrompt += `\n\n${emotionalRulesPrompt}`;
      }

      // If we have a user message, check for specific matching emotional rules
      let specificRulesPrompt = '';
      if (userMessage && emotionalRulesPrompt) {
        const matchingRules = await this.getMatchingEmotionalRules(userMessage);
        
        if (matchingRules.length > 0) {
          const specificRules = matchingRules.map(rule => {
            return `- PRIORITY RULE: User is expressing "${rule.trigger}" - Respond with ${rule.responseType} using ${rule.tone} tone. ${rule.description}`;
          }).join('\n');

          specificRulesPrompt = `

IMMEDIATE PRIORITY RULES FOR THIS MESSAGE:
${specificRules}
`;
          enhancedPrompt += specificRulesPrompt;
        }
      }

      return enhancedPrompt.trim();
    } catch (error) {
      console.error("Error building enhanced system prompt:", error);
      return baseSystemPrompt; // Fallback to base prompt
    }
  }

  /**
   * Cache emotional rules for performance (optional optimization)
   */
  static async getCachedEmotionalRules() {
    // This could be enhanced with Redis or in-memory caching
    // For now, we'll fetch from database each time
    return await this.getEmotionalRulesForPrompt();
  }
}

module.exports = EmotionalPromptService;