const SystemRuleService = require('./src/api/v1/services/systemRule.service');

// Test the API services directly
async function testAPIEndpoints() {
  console.log("🧪 Testing System Rules API Services...\n");

  try {
    // Test getAllSystemRules
    console.log("1. Testing getAllSystemRules service...");
    const allRules = await SystemRuleService.getAllSystemRules();
    console.log("✅ getAllSystemRules:", allRules.success ? "Success" : "Failed");
    console.log("   Rules count:", allRules.data?.length || 0);
    
    if (!allRules.success) {
      console.log("   Error:", allRules.message);
    }
    
    // Test getActiveSystemRules
    console.log("\n2. Testing getActiveSystemRules service...");
    const activeRules = await SystemRuleService.getActiveSystemRules();
    console.log("✅ getActiveSystemRules:", activeRules.success ? "Success" : "Failed");
    console.log("   Active rules count:", activeRules.data?.length || 0);
    
    if (!activeRules.success) {
      console.log("   Error:", activeRules.message);
    }
    
    // Test createSystemRule
    console.log("\n3. Testing createSystemRule service...");
    const testRule = {
      name: "API Test Rule",
      category: "GENERAL",
      ruleType: "GUIDELINE",
      content: "This is a test rule for API testing",
      description: "Test rule for API endpoint verification",
      priority: 1,
      severity: "LOW",
      isActive: true
    };
    
    const createResult = await SystemRuleService.createSystemRule(testRule);
    console.log("✅ createSystemRule:", createResult.success ? "Success" : "Failed");
    
    if (!createResult.success) {
      console.log("   Error:", createResult.message);
    }
    
    if (createResult.success) {
      const ruleId = createResult.data.id;
      console.log("   Created rule ID:", ruleId);
      
      // Test getSystemRuleById
      console.log("\n4. Testing getSystemRuleById service...");
      const getResult = await SystemRuleService.getSystemRuleById(ruleId);
      console.log("✅ getSystemRuleById:", getResult.success ? "Success" : "Failed");
      
      if (!getResult.success) {
        console.log("   Error:", getResult.message);
      }
      
      // Test updateSystemRule
      console.log("\n5. Testing updateSystemRule service...");
      const updateResult = await SystemRuleService.updateSystemRule(ruleId, {
        content: "Updated test rule content"
      });
      console.log("✅ updateSystemRule:", updateResult.success ? "Success" : "Failed");
      
      if (!updateResult.success) {
        console.log("   Error:", updateResult.message);
      }
      
      // Test toggleSystemRuleStatus
      console.log("\n6. Testing toggleSystemRuleStatus service...");
      const toggleResult = await SystemRuleService.toggleSystemRuleStatus(ruleId);
      console.log("✅ toggleSystemRuleStatus:", toggleResult.success ? "Success" : "Failed");
      
      if (toggleResult.success) {
        console.log("   Rule is now:", toggleResult.data?.isActive ? "Active" : "Inactive");
      } else {
        console.log("   Error:", toggleResult.message);
      }
      
      // Test deleteSystemRule
      console.log("\n7. Testing deleteSystemRule service...");
      const deleteResult = await SystemRuleService.deleteSystemRule(ruleId);
      console.log("✅ deleteSystemRule:", deleteResult.success ? "Success" : "Failed");
      
      if (!deleteResult.success) {
        console.log("   Error:", deleteResult.message);
      }
    }
    
    // Test getSystemRulesByCategory
    console.log("\n8. Testing getSystemRulesByCategory service...");
    const categoryResult = await SystemRuleService.getSystemRulesByCategory("CONTENT_FILTER");
    console.log("✅ getSystemRulesByCategory:", categoryResult.success ? "Success" : "Failed");
    console.log("    Content filter rules:", categoryResult.data?.length || 0);
    
    if (!categoryResult.success) {
      console.log("   Error:", categoryResult.message);
    }
    
    console.log("\n🎉 All API service tests completed!");
    
  } catch (error) {
    console.error("❌ API test error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack
    });
  }
}

testAPIEndpoints();