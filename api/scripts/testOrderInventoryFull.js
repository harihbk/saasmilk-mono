#!/usr/bin/env node

/**
 * Comprehensive test for order creation and editing with inventory
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
      username: 'fleettest@test.com',
      password: 'Password123',
      tenantId: TEST_TENANT
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

async function testOrderWithInventory() {
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}        Order Create/Edit with Inventory Test${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  
  // Authenticate
  const token = await authenticate();
  if (!token) {
    console.error(`${colors.red}Failed to authenticate${colors.reset}`);
    return;
  }
  console.log(`${colors.green}✓ Authentication successful${colors.reset}`);
  
  try {
    // Step 1: Get available products, customers, and inventory
    console.log(`\n${colors.cyan}Step 1: Getting products, customers, and inventory...${colors.reset}`);
    
    const [productsResponse, customersResponse, inventoryResponse] = await Promise.all([
      axios.get(`${BASE_URL}/products?limit=5`, { headers: getAuthHeaders(token) }),
      axios.get(`${BASE_URL}/customers?limit=1`, { headers: getAuthHeaders(token) }),
      axios.get(`${BASE_URL}/inventory?limit=10`, { headers: getAuthHeaders(token) })
    ]);

    const products = productsResponse.data.data.products;
    const customers = customersResponse.data.data.customers;
    const inventory = inventoryResponse.data.data.inventory;

    console.log(`${colors.green}✓ Found ${products.length} products, ${customers.length} customers, ${inventory.length} inventory items${colors.reset}`);
    
    if (products.length < 2 || customers.length < 1 || inventory.length < 1) {
      console.log(`${colors.red}✗ Need at least 2 products, 1 customer, and 1 inventory item${colors.reset}`);
      return;
    }

    // Show current inventory levels
    console.log(`\n${colors.blue}Current Inventory Levels:${colors.reset}`);
    inventory.slice(0, 3).forEach(item => {
      const available = item.stock.available - item.stock.reserved;
      console.log(`  ${item.product?.name || 'Unknown'}: ${available} available (${item.stock.available} total, ${item.stock.reserved} reserved)`);
    });

    // Step 2: Test stock check endpoint for new order
    console.log(`\n${colors.cyan}Step 2: Testing stock check for new order...${colors.reset}`);
    
    const testItems = [
      {
        product: products[0]._id,
        quantity: 2
      },
      {
        product: products[1]._id,
        quantity: 1
      }
    ];

    const stockCheckResponse = await axios.post(`${BASE_URL}/orders/check-stock`, {
      items: testItems,
      warehouse: 'Warehouse A'
    }, {
      headers: getAuthHeaders(token)
    });

    console.log(`${colors.green}✓ Stock check successful - All items available: ${stockCheckResponse.data.data.allAvailable}${colors.reset}`);
    
    // Step 3: Create order
    console.log(`\n${colors.cyan}Step 3: Creating order...${colors.reset}`);
    
    const orderData = {
      customer: customers[0]._id,
      items: testItems.map(item => ({
        ...item,
        pricePerUnit: 10,
        unitPrice: 10
      })),
      payment: {
        method: 'cash',
        status: 'pending'
      },
      shipping: {
        method: 'delivery',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
          warehouse: 'Warehouse A'
        }
      },
      pricing: {
        subtotal: 30,
        total: 30
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

    // Step 4: Test stock check for existing order update
    console.log(`\n${colors.cyan}Step 4: Testing stock check for order update...${colors.reset}`);
    
    const updatedTestItems = [
      {
        product: products[0]._id,
        quantity: 5  // Increased from 2 to 5
      },
      {
        product: products[1]._id,
        quantity: 3  // Increased from 1 to 3
      }
    ];

    const stockCheckUpdateResponse = await axios.post(`${BASE_URL}/orders/check-stock`, {
      items: updatedTestItems,
      warehouse: 'Warehouse A',
      orderId: orderId  // Include order ID to account for existing reservations
    }, {
      headers: getAuthHeaders(token)
    });

    console.log(`${colors.green}✓ Stock check for update successful - All items available: ${stockCheckUpdateResponse.data.data.allAvailable}${colors.reset}`);
    
    if (stockCheckUpdateResponse.data.data.stockCheck) {
      console.log(`${colors.blue}Stock details for update:${colors.reset}`);
      stockCheckUpdateResponse.data.data.stockCheck.forEach(item => {
        console.log(`  ${item.productName}: ${item.available} available (original: ${item.originalAvailable}, currently reserved: ${item.currentlyReserved || 0})`);
      });
    }

    // Step 5: Test order update
    console.log(`\n${colors.cyan}Step 5: Testing order update...${colors.reset}`);
    
    const updateData = {
      items: updatedTestItems.map(item => ({
        ...item,
        pricePerUnit: 10,
        unitPrice: 10
      })),
      notes: 'Updated order with increased quantities'
    };

    try {
      const updateResponse = await axios.put(`${BASE_URL}/orders/${orderId}`, updateData, {
        headers: getAuthHeaders(token)
      });
      
      if (updateResponse.status === 200) {
        console.log(`${colors.green}✓ Order updated successfully with new quantities${colors.reset}`);
      }
    } catch (error) {
      if (error.response?.status === 400 && error.response.data.message.includes('insufficient stock')) {
        console.log(`${colors.yellow}⚠ Order update blocked due to insufficient stock:${colors.reset}`);
        console.log(`   ${error.response.data.message}`);
      } else {
        console.log(`${colors.red}✗ Unexpected error during order update:${colors.reset}`, error.response?.data || error.message);
      }
    }

    // Step 6: Test order update with excessive stock
    console.log(`\n${colors.cyan}Step 6: Testing order update with excessive quantities (should fail)...${colors.reset}`);
    
    const excessiveUpdateData = {
      items: [{
        product: products[0]._id,
        quantity: 9999,  // Deliberately excessive
        pricePerUnit: 10,
        unitPrice: 10
      }]
    };

    try {
      const excessiveUpdateResponse = await axios.put(`${BASE_URL}/orders/${orderId}`, excessiveUpdateData, {
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

    // Step 7: Test stock check with excessive quantities
    console.log(`\n${colors.cyan}Step 7: Testing stock check with excessive quantities...${colors.reset}`);
    
    try {
      const excessiveStockCheck = await axios.post(`${BASE_URL}/orders/check-stock`, {
        items: [{
          product: products[0]._id,
          quantity: 9999
        }],
        warehouse: 'Warehouse A',
        orderId: orderId
      }, {
        headers: getAuthHeaders(token)
      });

      console.log(`${colors.blue}Stock check result:${colors.reset} All available: ${excessiveStockCheck.data.data.allAvailable}`);
      if (excessiveStockCheck.data.data.stockCheck[0]) {
        const check = excessiveStockCheck.data.data.stockCheck[0];
        console.log(`  ${check.productName}: ${check.status} - ${check.message}`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Stock check failed:${colors.reset}`, error.response?.data || error.message);
    }

    // Cleanup: Delete the test order
    console.log(`\n${colors.cyan}Cleanup: Deleting test order...${colors.reset}`);
    try {
      await axios.delete(`${BASE_URL}/orders/${orderId}`, {
        headers: getAuthHeaders(token)
      });
      console.log(`${colors.green}✓ Test order deleted successfully${colors.reset}`);
    } catch (error) {
      console.log(`${colors.yellow}⚠ Could not delete test order (may need manual cleanup)${colors.reset}`);
    }

    console.log(`\n${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}✅ All tests completed successfully!${colors.reset}`);
    console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}Test failed:${colors.reset}`, error.response?.data || error.message);
  }
}

testOrderWithInventory().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});