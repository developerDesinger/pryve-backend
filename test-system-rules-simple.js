const axios = require('axios');

async function testSystemRulesSimple() {
  console.log("🔧 Testing System Rules API...\n");

  const baseURL = 'http://localhost:3400/api/v1';
  
  try {
    // Step 1: Login to get token
    console.log("1. Logging in to get authentication token...");
    const loginResponse = await axios.post(`${baseURL}/users/login`, {
      email: "bondingbowls@gmail.com",
      password: "Admin@123"
    });

    if (loginResponse.status !== 200) {
      console.log("❌ Login failed");
      return;
    }

    const token = loginResponse.data.data.token;
    console.log("✅ Login successful!");

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Step 2: Get all system rules
    console.log("\n2. Fetching all system rules...");
    const getRulesResponse = await axios.get(`${baseURL}/system-rules`, { headers });
    
    console.log("✅ System rules fetched successfully!");
    console.log(`   Found ${getRulesResponse.data.data.length} rules`);

    // Step 3: Test creating a new rule
    console.log("\n3. Creating a new system rule...");
    const newRule = {
      name: "Test Rule from Simple Test",
      category: "Content Filter",
      ruleType: "RESTRICTION",
      content: "This is a test rule to verify admin panel integration",
      description: "Test rule created by simple integration test",
      isActive: true,
      priority: 1,
      severity: "MEDIUM"
    };

    const createResponse = await axios.post(`${baseURL}/system-rules`, newRule, { headers });
    console.log("✅ System rule created successfully!");
    console.log(`   Created rule ID: ${createResponse.data.data.id}`);

    const ruleId = createResponse.data.data.id;

    // Step 4: Test updating the rule
    console.log("\n4. Updating the system rule...");
    const updateData = { description: "Updated by simple test" };
    const updateResponse = await axios.patch(`${baseURL}/system-rules/${ruleId}`, updateData, { headers });
    console.log("✅ System rule updated successfully!");

    // Step 5: Test toggling the rule
    console.log("\n5. Toggling system rule status...");
    const toggleResponse = await axios.patch(`${baseURL}/system-rules/${ruleId}/toggle`, {}, { headers });
    console.log("✅ System rule status toggled successfully!");

    // Step 6: Get active rules
    console.log("\n6. Fetching active system rules...");
    const activeRulesResponse = await axios.get(`${baseURL}/system-rules/active`, { headers });
    console.log(`✅ Found ${activeRulesResponse.data.data.length} active rules`);

    // Step 7: Clean up - delete test rule
    console.log("\n7. Cleaning up - deleting test rule...");
    const deleteResponse = await axios.delete(`${baseURL}/system-rules/${ruleId}`, { headers });
    console.log("✅ Test rule deleted successfully!");

    console.log("\n🎉 All System Rules API tests passed!");
    console.log("\n📋 Summary:");
    console.log("   ✅ Authentication working");
    console.log("   ✅ GET /system-rules working");
    console.log("   ✅ POST /system-rules working");
    console.log("   ✅ PATCH /system-rules/:id working");
    console.log("   ✅ PATCH /system-rules/:id/toggle working");
    console.log("   ✅ GET /system-rules/active working");
    console.log("   ✅ DELETE /system-rules/:id working");
    console.log("\n💡 The admin panel should now work correctly with the backend!");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    
    if (error.response) {
      console.log("   Status:", error.response.status);
      console.log("   Response:", error.response.data);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log("\n💡 Backend server is not running. Please start it with:");
      console.log("   cd pryve-backend");
      console.log("   npm start");
    }
  }
}

testSystemRulesSimple();