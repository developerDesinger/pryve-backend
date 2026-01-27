const SystemRuleService = require('./src/api/v1/services/systemRule.service');
const EmotionalPromptService = require('./src/api/v1/services/emotionalPrompt.service');

async function showPrompt() {
  try {
    console.log("🔍 FETCHING GUIDELINES FROM DATABASE...\n");
    
    // Get system rules prompt
    console.log("📋 SYSTEM RULES PROMPT:");
    console.log("=" .repeat(80));
    const systemRulesPrompt = await SystemRuleService.getSystemRulesForPrompt();
    
    if (systemRulesPrompt) {
      console.log(systemRulesPrompt);
    } else {
      console.log("❌ No system rules found in database");
    }
    
    console.log("\n" + "=" .repeat(80));
    
    // Get emotional rules prompt
    console.log("\n📋 EMOTIONAL RULES PROMPT:");
    console.log("=" .repeat(80));
    const emotionalRulesPrompt = await EmotionalPromptService.getEmotionalRulesForPrompt();
    
    if (emotionalRulesPrompt) {
      console.log(emotionalRulesPrompt);
    } else {
      console.log("❌ No emotional rules found in database");
    }
    
    console.log("\n" + "=" .repeat(80));
    
    // Get combined enhanced prompt
    console.log("\n📋 COMPLETE ENHANCED PROMPT:");
    console.log("=" .repeat(80));
    
    const basePrompt = "You are Pryve AI, a supportive mental health companion.";
    const enhancedPrompt = await EmotionalPromptService.buildEnhancedSystemPrompt(
      basePrompt, 
      "I'm feeling anxious about work today"
    );
    
    console.log(enhancedPrompt);
    console.log("\n" + "=" .repeat(80));
    
    // Show statistics
    console.log("\n📊 PROMPT STATISTICS:");
    console.log(`- System Rules Prompt Length: ${systemRulesPrompt?.length || 0} characters`);
    console.log(`- Emotional Rules Prompt Length: ${emotionalRulesPrompt?.length || 0} characters`);
    console.log(`- Complete Enhanced Prompt Length: ${enhancedPrompt?.length || 0} characters`);
    
    // Show active rules count
    const activeRules = await SystemRuleService.getActiveSystemRules();
    console.log(`- Active System Rules Count: ${activeRules.data?.length || 0}`);
    
  } catch (error) {
    console.error("❌ Error fetching prompt:", error);
  } finally {
    process.exit(0);
  }
}

showPrompt();