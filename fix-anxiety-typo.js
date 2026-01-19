const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function fixAnxietyTypo() {
  try {
    console.log("🔧 Fixing 'anxity' typo to 'anxiety'...");
    
    const result = await prisma.EmotionalRule.updateMany({
      where: {
        trigger: "anxity"
      },
      data: {
        trigger: "anxiety"
      }
    });
    
    console.log(`✅ Updated ${result.count} record(s)`);
    
    // Verify the fix
    const updatedRule = await prisma.EmotionalRule.findFirst({
      where: {
        trigger: "anxiety"
      }
    });
    
    if (updatedRule) {
      console.log("✅ Verification successful:");
      console.log(`   Trigger: ${updatedRule.trigger}`);
      console.log(`   Response Type: ${updatedRule.responseType}`);
      console.log(`   Tone: ${updatedRule.tone}`);
    }
    
  } catch (error) {
    console.error("❌ Error fixing typo:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixAnxietyTypo();