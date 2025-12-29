/**
 * Syntax validation script for production deployment
 */

const fs = require('fs');
const path = require('path');

function validateSyntax() {
  console.log('🔍 Validating chat.service.js syntax...\n');
  
  const filePath = path.join(__dirname, 'src/api/v1/services/chat.service.js');
  
  try {
    // Read the file
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for common syntax issues
    const issues = [];
    
    // Check for unmatched try blocks
    const tryMatches = content.match(/\btry\s*{/g) || [];
    const catchMatches = content.match(/}\s*catch\s*\(/g) || [];
    
    if (tryMatches.length !== catchMatches.length) {
      issues.push(`❌ Unmatched try-catch blocks: ${tryMatches.length} try, ${catchMatches.length} catch`);
    }
    
    // Check for stray closing brackets/parentheses
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed === '}));' && !line.includes('map(') && !line.includes('filter(')) {
        issues.push(`❌ Suspicious stray '}));' at line ${index + 1}: ${trimmed}`);
      }
    });
    
    // Check for undefined variable references
    const growthMomentsRefs = content.match(/\bgrowthMoments\b(?!Count|List|DetailList)/g) || [];
    if (growthMomentsRefs.length > 0) {
      issues.push(`❌ Found ${growthMomentsRefs.length} potential undefined 'growthMoments' references`);
    }
    
    // Check for lastUpdatedAt references (should be updatedAt)
    const lastUpdatedAtRefs = content.match(/lastUpdatedAt/g) || [];
    if (lastUpdatedAtRefs.length > 0) {
      issues.push(`❌ Found ${lastUpdatedAtRefs.length} 'lastUpdatedAt' references (should be 'updatedAt')`);
    }
    
    if (issues.length === 0) {
      console.log('✅ No syntax issues detected!');
      console.log('✅ Try-catch blocks are balanced');
      console.log('✅ No stray closing brackets found');
      console.log('✅ No undefined growthMoments references');
      console.log('✅ No incorrect field references');
    } else {
      console.log('❌ Issues found:');
      issues.forEach(issue => console.log(`  ${issue}`));
    }
    
    // Try to parse with Node.js
    console.log('\n🔍 Running Node.js syntax check...');
    require('child_process').execSync(`node -c "${filePath}"`, { stdio: 'inherit' });
    console.log('✅ Node.js syntax check passed!');
    
  } catch (error) {
    console.error('❌ Syntax validation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  validateSyntax();
}

module.exports = { validateSyntax };