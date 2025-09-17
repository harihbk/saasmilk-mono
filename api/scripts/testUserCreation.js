#!/usr/bin/env node

/**
 * Test User Creation with Tenant Isolation
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api';
const TEST_TENANT = 'TEST001';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

async function authenticate() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'fleettest@test.com',
      password: 'password123'
    }, {
      headers: {
        'x-tenant-id': TEST_TENANT
      }
    });
    
    return response.data.data?.token;
  } catch (error) {
    console.error(`${colors.red}Authentication failed:${colors.reset}`, error.response?.data || error.message);
    return null;
  }
}

function getAuthHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'x-tenant-id': TEST_TENANT,
    'Content-Type': 'application/json'
  };
}

async function testUserCreation() {
  console.log(`${colors.magenta}Testing User Creation with Tenant Isolation${colors.reset}`);
  
  // Authenticate
  const token = await authenticate();
  if (!token) {
    console.error(`${colors.red}Failed to authenticate${colors.reset}`);
    return;
  }
  console.log(`${colors.green}✓ Authentication successful${colors.reset}`);
  
  try {
    // Test 1: Create a new user
    const userData = {
      name: 'Test User',
      email: `testuser${Date.now()}@test.com`,
      password: 'Password123',
      phone: '+1234567890',
      role: 'employee',
      address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        zipCode: '12345'
      }
    };

    console.log(`\n${colors.cyan}Creating user...${colors.reset}`);
    const createResponse = await axios.post(`${BASE_URL}/users`, userData, {
      headers: getAuthHeaders(token)
    });
    
    if (createResponse.status === 201) {
      console.log(`${colors.green}✓ User created successfully${colors.reset}`);
      console.log(`  User ID: ${createResponse.data.data.user.id}`);
      console.log(`  Email: ${createResponse.data.data.user.email}`);
      console.log(`  Tenant ID: ${createResponse.data.data.user.tenantId}`);
      console.log(`  Company: ${createResponse.data.data.user.company}`);
    }

    // Test 2: Try to create duplicate user
    console.log(`\n${colors.cyan}Testing duplicate user creation...${colors.reset}`);
    try {
      await axios.post(`${BASE_URL}/users`, userData, {
        headers: getAuthHeaders(token)
      });
      console.log(`${colors.red}✗ Duplicate user creation should have failed${colors.reset}`);
    } catch (error) {
      if (error.response?.status === 400) {
        console.log(`${colors.green}✓ Duplicate user creation properly blocked${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ Unexpected error:${colors.reset}`, error.response?.data);
      }
    }

    // Test 3: Get all users to verify tenant isolation
    console.log(`\n${colors.cyan}Testing user listing with tenant isolation...${colors.reset}`);
    const usersResponse = await axios.get(`${BASE_URL}/users`, {
      headers: getAuthHeaders(token)
    });
    
    if (usersResponse.status === 200) {
      const users = usersResponse.data.data.users;
      console.log(`${colors.green}✓ Retrieved ${users.length} users${colors.reset}`);
      
      // Check if all users belong to the same tenant
      const allSameTenant = users.every(user => user.tenantId === TEST_TENANT);
      if (allSameTenant) {
        console.log(`${colors.green}✓ All users belong to tenant ${TEST_TENANT}${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ Tenant isolation failed - found users from other tenants${colors.reset}`);
      }
    }

  } catch (error) {
    console.error(`${colors.red}Test failed:${colors.reset}`, error.response?.data || error.message);
  }
}

async function main() {
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}           User Creation Tenant Test${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  
  await testUserCreation();
  
  console.log(`\n${colors.magenta}Test completed!${colors.reset}`);
}

main().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});