const http = require('http');

// Test HTTP endpoints
async function testHTTPEndpoints() {
  console.log("🌐 Testing System Rules HTTP Endpoints...\n");

  // Test if server is running on port 3000
  const testEndpoint = (path, method = 'GET', data = null) => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3400, // Backend runs on port 3400
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          // Note: In real scenario, you'd need a valid JWT token
          'Authorization': 'Bearer test-token'
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            data: responseData,
            headers: res.headers
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  };

  try {
    console.log("1. Testing GET /api/v1/system-rules...");
    
    const response = await testEndpoint('/api/v1/system-rules');
    console.log("   Status Code:", response.statusCode);
    
    if (response.statusCode === 200) {
      console.log("   ✅ Endpoint is working!");
      const data = JSON.parse(response.data);
      console.log("   Rules count:", data.data?.length || 0);
    } else if (response.statusCode === 401) {
      console.log("   ⚠️  Authentication required (expected)");
      console.log("   ✅ Endpoint is accessible but needs auth token");
    } else {
      console.log("   ❌ Unexpected status code");
      console.log("   Response:", response.data);
    }
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log("   ❌ Server is not running on port 3000");
      console.log("   💡 Please start the server with: npm start or node server.js");
    } else {
      console.log("   ❌ Connection error:", error.message);
    }
  }
}

testHTTPEndpoints();