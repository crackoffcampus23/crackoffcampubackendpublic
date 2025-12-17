const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';
const ADMIN_EMAIL = 'admin@crackoffcampus.com';
const ADMIN_PASSWORD = 'crack@202526#';

// Test data for creating a service
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

async function getAdminToken() {
  try {
    console.log('🔐 Getting admin authentication token...');
    const response = await axios.post(`${BASE_URL}/cms-auth`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    console.log('✅ Admin authentication successful');
    return response.data.token;
  } catch (error) {
    console.error('❌ Admin authentication failed:', error.response?.data || error.message);
    throw error;
  }
}

async function createService(token, serviceData) {
  try {
    console.log('\n📝 Creating new service...');
    console.log('Service data:', JSON.stringify(serviceData, null, 2));
    
    const response = await axios.post(`${BASE_URL}/service`, serviceData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Service created successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Service creation failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
    throw error;
  }
}

async function testServiceAPI() {
  try {
    console.log('🚀 Starting Service API Test');
    console.log('================================');
    
    // Check if admin password is set
    if (!ADMIN_PASSWORD) {
      throw new Error('Admin password not found. Please set VITE_ADMIN_PASSWORD or ADMIN_PASSWORD in environment variables.');
    }
    
    // Step 1: Get admin token
    const token = await getAdminToken();
    
    // Step 2: Create a service
    const createdService = await createService(token, testService);
    
    console.log('\n🎉 Test completed successfully!');
    console.log('Service ID:', createdService.serviceid || createdService.serviceId);
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  }
}

// Additional test with different service data
async function createMultipleServices(token) {
  const services = [
    {
      serviceTitle: "Resume Review & Optimization",
      shortDescription: "Professional resume review and ATS optimization",
      durationMeeting: "30m",
      serviceCharge: 299,
      moreDetailsSection: "Get your resume reviewed by industry experts. Includes ATS optimization, keyword enhancement, and formatting improvements.",
      whatBookingIncludes: [
        "Detailed resume analysis",
        "ATS optimization",
        "Keyword suggestions",
        "Format improvements",
        "Before/after comparison"
      ],
      userRegistered: 0,
      published: true
    },
    {
      serviceTitle: "System Design Interview Prep",
      shortDescription: "System design interview preparation session",
      durationMeeting: "60m",
      serviceCharge: 999,
      moreDetailsSection: "Master system design interviews with hands-on practice. Cover scalability, database design, and architecture patterns.",
      whatBookingIncludes: [
        "60-minute system design session",
        "Architecture diagrams",
        "Scalability discussion",
        "Database design review",
        "Real-world examples"
      ],
      userRegistered: 0,
      published: false // This one is not published
    }
  ];
  
  for (let i = 0; i < services.length; i++) {
    console.log(`\n📝 Creating service ${i + 1}/${services.length}...`);
    await createService(token, services[i]);
  }
}

// Enhanced test function
async function runComprehensiveTest() {
  try {
    console.log('🚀 Starting Comprehensive Service API Test');
    console.log('==========================================');
    
    if (!ADMIN_PASSWORD) {
      throw new Error('Admin password not found. Please set VITE_ADMIN_PASSWORD or ADMIN_PASSWORD in environment variables.');
    }
    
    const token = await getAdminToken();
    
    // Test 1: Create main service
    console.log('\n📋 Test 1: Creating main service');
    await createService(token, testService);
    
    // Test 2: Create multiple services
    console.log('\n📋 Test 2: Creating additional services');
    await createMultipleServices(token);
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('\n💥 Comprehensive test failed:', error.message);
    process.exit(1);
  }
}

// Check command line arguments
const args = process.argv.slice(2);
if (args.includes('--comprehensive') || args.includes('-c')) {
  runComprehensiveTest();
} else {
  testServiceAPI();
}

console.log('\n💡 Usage:');
console.log('  node test-service-api.js                    # Run basic test');
console.log('  node test-service-api.js --comprehensive    # Run comprehensive test');
console.log('  node test-service-api.js -c                 # Run comprehensive test (short)');