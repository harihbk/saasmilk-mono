#!/usr/bin/env node

/**
 * Test Order Update with Stock Management
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

async function testOrderUpdate() {
  console.log(`${colors.magenta}Testing Order Update with Stock Management${colors.reset}`);
  
  // Authenticate
  const token = await authenticate();
  if (!token) {
    console.error(`${colors.red}Failed to authenticate${colors.reset}`);
    return;
  }
  console.log(`${colors.green}✓ Authentication successful${colors.reset}`);
  
  try {
    // First, get available products and customers
    console.log(`\n${colors.cyan}Getting available products and customers...${colors.reset}`);
    
    const [productsResponse, customersResponse] = await Promise.all([
      axios.get(`${BASE_URL}/products?limit=5`, { headers: getAuthHeaders(token) }),
      axios.get(`${BASE_URL}/customers?limit=1`, { headers: getAuthHeaders(token) })
    ]);

    const products = productsResponse.data.data.products;
    const customers = customersResponse.data.data.customers;

    if (products.length < 2) {
      console.log(`${colors.red}✗ Need at least 2 products to test order update${colors.reset}`);
      return;
    }

    if (customers.length < 1) {
      console.log(`${colors.red}✗ Need at least 1 customer to test order update${colors.reset}`);
      return;
    }

    console.log(`${colors.green}✓ Found ${products.length} products and ${customers.length} customers${colors.reset}`);

    // Create initial order
    console.log(`\n${colors.cyan}Creating initial order...${colors.reset}`);
    
    const orderData = {
      customer: customers[0]._id,
      items: [
        {
          product: products[0]._id,
          quantity: 2,
          pricePerUnit: 10
        },
        {
          product: products[1]._id,
          quantity: 1,
          pricePerUnit: 20
        }
      ],
      shipping: {
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          warehouse: 'Warehouse A'
        }
      }
    };

    const createResponse = await axios.post(`${BASE_URL}/orders`, orderData, {
      headers: getAuthHeaders(token)
    });

    if (createResponse.status !== 201) {
      console.log(`${colors.red}✗ Failed to create order${colors.reset}`);
      return;
    }

    const orderId = createResponse.data.data.order._id;
    console.log(`${colors.green}✓ Order created successfully (ID: ${orderId})${colors.reset}`);

    // Test 1: Update order with valid stock
    console.log(`\n${colors.cyan}Test 1: Updating order with valid quantities...${colors.reset}`);
    
    const updateData1 = {
      items: [
        {
          product: products[0]._id,
          quantity: 3,  // Increased from 2 to 3
          pricePerUnit: 10
        },
        {
          product: products[1]._id,
          quantity: 2,  // Increased from 1 to 2
          pricePerUnit: 20
        }
      ]
    };

    try {
      const updateResponse1 = await axios.put(`${BASE_URL}/orders/${orderId}`, updateData1, {
        headers: getAuthHeaders(token)
      });
      
      if (updateResponse1.status === 200) {
        console.log(`${colors.green}✓ Order updated successfully with new quantities${colors.reset}`);
      }
    } catch (error) {
      if (error.response?.status === 400 && error.response.data.message.includes('insufficient stock')) {
        console.log(`${colors.yellow}⚠ Order update blocked due to insufficient stock (expected behavior)${colors.reset}`);
        console.log(`   ${error.response.data.message}`);
      } else {
        console.log(`${colors.red}✗ Unexpected error during order update:${colors.reset}`, error.response?.data || error.message);
      }
    }

    // Test 2: Update order with excessive stock requirements
    console.log(`\n${colors.cyan}Test 2: Updating order with excessive quantities...${colors.reset}`);
    
    const updateData2 = {
      items: [
        {
          product: products[0]._id,
          quantity: 1000,  // Deliberately excessive
          pricePerUnit: 10
        }
      ]
    };

    try {
      const updateResponse2 = await axios.put(`${BASE_URL}/orders/${orderId}`, updateData2, {
        headers: getAuthHeaders(token)
      });
      
      console.log(`${colors.red}✗ Order update should have failed due to insufficient stock${colors.reset}`);
    } catch (error) {
      if (error.response?.status === 400 && error.response.data.message.includes('insufficient stock')) {
        console.log(`${colors.green}✓ Order update properly blocked due to insufficient stock${colors.reset}`);
        console.log(`   Message: ${error.response.data.message}`);
      } else {
        console.log(`${colors.red}✗ Unexpected error:${colors.reset}`, error.response?.data || error.message);
      }
    }

    // Test 3: Update order with non-item fields (should work)
    console.log(`\n${colors.cyan}Test 3: Updating order notes (non-inventory field)...${colors.reset}`);
    
    const updateData3 = {
      notes: 'Updated order notes - this should work'
    };

    try {
      const updateResponse3 = await axios.put(`${BASE_URL}/orders/${orderId}`, updateData3, {
        headers: getAuthHeaders(token)
      });
      
      if (updateResponse3.status === 200) {
        console.log(`${colors.green}✓ Non-inventory fields updated successfully${colors.reset}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Failed to update non-inventory fields:${colors.reset}`, error.response?.data || error.message);
    }

    // Cleanup: Delete the test order
    console.log(`\n${colors.cyan}Cleaning up test order...${colors.reset}`);
    try {
      await axios.delete(`${BASE_URL}/orders/${orderId}`, {
        headers: getAuthHeaders(token)
      });
      console.log(`${colors.green}✓ Test order deleted successfully${colors.reset}`);
    } catch (error) {
      console.log(`${colors.yellow}⚠ Could not delete test order (may need manual cleanup)${colors.reset}`);
    }

  } catch (error) {
    console.error(`${colors.red}Test failed:${colors.reset}`, error.response?.data || error.message);
  }
}

async function main() {
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}           Order Update Stock Management Test${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  
  await testOrderUpdate();
  
  console.log(`\n${colors.magenta}Test completed!${colors.reset}`);
}

main().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});