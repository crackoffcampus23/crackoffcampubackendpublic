const https = require('https');
const http = require('http');

// Configuration
const BASE_URL = 'http://localhost:5000';
const ADMIN_EMAIL = 'admin@crackoffcampus.com';
const ADMIN_PASSWORD = process.env.VITE_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

// Test service data
const testService = {
  serviceTitle: "Mock Technical Interview",
  shortDescription: "45-minute technical interview simulation",
  durationMeeting: "45m",
  serviceCharge: 699,
  moreDetailsSection: "Comprehensive technical interview covering DSA, system design, and behavioral questions. Includes detailed feedback and improvement suggestions.",
  whatBookingIncludes: [
    "45-minute technical interview",
    "Detailed feedback report", 
    "Resume review",
    "Interview tips and strategies",
    "Recording of the session"
  ],
  userRegistered: 0,
  published: true
};

function makeRequest(url, options, postData = null) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', reject);
    
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    
    req.end();
  });
}

async function getAdminToken() {
  console.log('🔐 Getting admin authentication token...');
  
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  const authData = {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD
  };

  try {
    const response = await makeRequest(`${BASE_URL}/cms-auth`, options, authData);
    
    if (response.status === 200) {
      console.log('✅ Admin authentication successful');
      return response.data.token;
    } else {
      throw new Error(`Authentication failed: ${response.status} - ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error('❌ Admin authentication failed:', error.message);
    throw error;
  }
}

async function createService(token) {
  console.log('\n📝 Creating new service...');
  console.log('Service data:', JSON.stringify(testService, null, 2));
  
  const options = {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  try {
    const response = await makeRequest(`${BASE_URL}/service`, options, testService);
    
    if (response.status === 201 || response.status === 200) {
      console.log('✅ Service created successfully!');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      return response.data;
    } else {
      throw new Error(`Service creation failed: ${response.status} - ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    console.error('❌ Service creation failed:', error.message);
    throw error;
  }
}

async function testServiceAPI() {
  try {
    console.log('🚀 Starting Service API Test (Built-in HTTP)');
    console.log('=============================================');
    
    // Check if admin password is set
    if (!ADMIN_PASSWORD) {
      throw new Error('Admin password not found. Please set VITE_ADMIN_PASSWORD or ADMIN_PASSWORD in environment variables.');
    }
    
    console.log('📋 Test Configuration:');
    console.log('- Base URL:', BASE_URL);
    console.log('- Admin Email:', ADMIN_EMAIL);
    console.log('- Password Set:', !!ADMIN_PASSWORD);
    
    // Step 1: Get admin token
    const token = await getAdminToken();
    
    // Step 2: Create a service
    const createdService = await createService(token);
    
    console.log('\n🎉 Test completed successfully!');
    console.log('📋 Summary:');
    console.log('- Service ID:', createdService.serviceid || createdService.serviceId || 'Not provided');
    console.log('- Service Title:', testService.serviceTitle);
    console.log('- Service Charge:', testService.serviceCharge);
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure the server is running on port 5000');
    console.log('2. Check if ADMIN_PASSWORD environment variable is set');
    console.log('3. Verify the admin credentials in your .env file');
    process.exit(1);
  }
}

// Run the test
testServiceAPI();