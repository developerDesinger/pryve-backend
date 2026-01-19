const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabaseRules() {
  try {
    console.log("🔍 Checking database rules...");
    
    const rules = await prisma.SystemRule.findMany();
    console.log(`📊 Total rules in database: ${rules.length}`);
    
    if (rules.length > 0) {
      console.log("\n📋 Current rules:");
      rules.forEach((rule, i) => {
        console.log(`${i+1}. ${rule.name} (${rule.category}) - ${rule.severity} - ${rule.isActive ? 'Active' : 'Inactive'}`);
      });
    } else {
      console.log("❌ No rules found in database");
    }
    
    // Test creating a new rule
    console.log("\n🧪 Testing rule creation...");
    const testRule = {
      name: "Database Test Rule",
      category: "GENERAL",
      ruleType: "GUIDELINE", 
      content: "This is a test rule to verify database functionality",
      description: "Test rule for database verification",
      priority: 1,
      severity: "LOW",
      isActive: true
    };
    
    const newRule = await prisma.SystemRule.create({
      data: testRule
    });
    
    console.log("✅ Rule created successfully:", newRule.id);
    
    // Clean up test rule
    await prisma.SystemRule.delete({
      where: { id: newRule.id }
    });
    
    console.log("🧹 Test rule cleaned up");
    
  } catch (error) {
    console.error("❌ Database error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabaseRules();