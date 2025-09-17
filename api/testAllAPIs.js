#!/usr/bin/env node

/**
 * Comprehensive API Testing Script
 * Tests all endpoints in the application and reports issues
 * Run with: node scripts/testAllAPIs.js
 */

require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const colors = require('colors');

// API Configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';
const TEST_TENANT_ID = 'TEST001';
const TEST_EMAIL = 'test@test.com';
const TEST_PASSWORD = 'Test@123';

// Test results storage
const testResults = {
  passed: [],
  failed: [],
  errors: []
};

// Helper function to make API requests
async function apiRequest(method, endpoint, data = null, token = null, tenantId = null) {
  try {
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {}
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    if (tenantId) {
      config.headers['x-tenant-id'] = tenantId;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Connect to database
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✓ Connected to MongoDB'.green);
  } catch (error) {
    console.error('✗ MongoDB connection error:'.red, error);
    process.exit(1);
  }
}

// Setup test data
async function setupTestData() {
  console.log('\n📦 Setting up test data...'.cyan);
  
  const Company = require('../api/models/Company');
  const User = require('../api/models/User');
  const Product = require('../api/models/Product');
  const Category = require('../api/models/Category');

  try {
    // Create test company
    let company = await Company.findOne({ tenantId: TEST_TENANT_ID });
    if (!company) {
      company = await Company.create({
        tenantId: TEST_TENANT_ID,
        name: 'Test Company',
        slug: 'test-company',
        contactInfo: {
          email: 'company@test.com',
          phone: '+1234567890'
        },
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'Test Country'
        },
        subscription: {
          plan: 'professional',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });
    }

    // Create test user
    let user = await User.findOne({ email: TEST_EMAIL });
    if (!user) {
      user = await User.create({
        name: 'Test User',
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        role: 'admin',
        tenantId: TEST_TENANT_ID,
        company: company._id
      });
    }

    // Create test category
    let category = await Category.findOne({ name: 'Test Category', tenantId: TEST_TENANT_ID });
    if (!category) {
      category = await Category.create({
        name: 'Test Category',
        description: 'Test category for API testing',
        tenantId: TEST_TENANT_ID,
        createdBy: user._id
      });
    }

    // Create test product
    let product = await Product.findOne({ name: 'Test Product', tenantId: TEST_TENANT_ID });
    if (!product) {
      product = await Product.create({
        name: 'Test Product',
        sku: 'TEST-001',
        category: category._id,
        brand: 'Test Brand',
        description: 'Test product for API testing',
        unit: 'liters',
        packSize: 1,
        pricing: {
          basePrice: 100,
          currency: 'INR'
        },
        status: 'active',
        tenantId: TEST_TENANT_ID,
        createdBy: user._id
      });
    }

    console.log('✓ Test data setup complete'.green);
    return { company, user, category, product };
  } catch (error) {
    console.error('✗ Error setting up test data:'.red, error);
    throw error;
  }
}

// Test Authentication Endpoints
async function testAuth() {
  console.log('\n🔐 Testing Authentication Endpoints...'.yellow);
  
  const tests = [
    {
      name: 'User Registration',
      method: 'POST',
      endpoint: '/auth/register',
      data: {
        name: 'New User',
        email: `newuser${Date.now()}@test.com`,
        password: 'Test@123',
        role: 'user',
        tenantId: TEST_TENANT_ID
      }
    },
    {
      name: 'User Login',
      method: 'POST',
      endpoint: '/auth/login',
      data: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      }
    },
    {
      name: 'SaaS Admin Login',
      method: 'POST',
      endpoint: '/saas-admin/login',
      data: {
        email: 'admin@admin.com',
        password: 'Hari@123'
      }
    }
  ];

  let userToken = null;
  let saasToken = null;

  for (const test of tests) {
    const result = await apiRequest(test.method, test.endpoint, test.data);
    
    if (result.success) {
      console.log(`  ✓ ${test.name}`.green);
      testResults.passed.push(test.name);
      
      if (test.endpoint === '/auth/login') {
        userToken = result.data.token;
      } else if (test.endpoint === '/saas-admin/login') {
        saasToken = result.data.token;
      }
    } else {
      console.log(`  ✗ ${test.name}: ${result.error?.message || 'Failed'}`.red);
      testResults.failed.push({ test: test.name, error: result.error });
    }
  }

  return { userToken, saasToken };
}

// Test CRUD Operations for each module
async function testCRUD(token, tenantId) {
  console.log('\n📝 Testing CRUD Operations...'.yellow);
  
  const modules = [
    {
      name: 'Products',
      endpoints: {
        list: { method: 'GET', path: '/products' },
        create: { 
          method: 'POST', 
          path: '/products',
          data: {
            name: `Test Product ${Date.now()}`,
            sku: `SKU-${Date.now()}`,
            category: 'test',
            brand: 'Test Brand',
            description: 'Test product',
            unit: 'kg',
            packSize: 1,
            pricing: { basePrice: 100 }
          }
        },
        get: { method: 'GET', path: '/products/:id' },
        update: { 
          method: 'PUT', 
          path: '/products/:id',
          data: { description: 'Updated description' }
        },
        delete: { method: 'DELETE', path: '/products/:id' }
      }
    },
    {
      name: 'Categories',
      endpoints: {
        list: { method: 'GET', path: '/categories' },
        create: { 
          method: 'POST', 
          path: '/categories',
          data: {
            name: `Test Category ${Date.now()}`,
            description: 'Test category'
          }
        },
        get: { method: 'GET', path: '/categories/:id' },
        update: { 
          method: 'PUT', 
          path: '/categories/:id',
          data: { description: 'Updated category' }
        },
        delete: { method: 'DELETE', path: '/categories/:id' }
      }
    },
    {
      name: 'Customers',
      endpoints: {
        list: { method: 'GET', path: '/customers' },
        create: { 
          method: 'POST', 
          path: '/customers',
          data: {
            personalInfo: {
              firstName: 'Test',
              lastName: 'Customer',
              email: `customer${Date.now()}@test.com`,
              phone: '+1234567890'
            },
            address: {
              street: '123 Test St',
              city: 'Test City',
              state: 'TS',
              zipCode: '12345'
            }
          }
        },
        get: { method: 'GET', path: '/customers/:id' },
        update: { 
          method: 'PUT', 
          path: '/customers/:id',
          data: { 
            personalInfo: { 
              firstName: 'Updated',
              lastName: 'Customer'
            }
          }
        },
        delete: { method: 'DELETE', path: '/customers/:id' }
      }
    },
    {
      name: 'Suppliers',
      endpoints: {
        list: { method: 'GET', path: '/suppliers' },
        create: { 
          method: 'POST', 
          path: '/suppliers',
          data: {
            companyInfo: {
              name: `Test Supplier ${Date.now()}`,
              businessType: 'dairy-farm'
            },
            contactInfo: {
              primaryContact: {
                name: 'Contact Person',
                email: `supplier${Date.now()}@test.com`,
                phone: '+1234567890'
              }
            },
            addresses: {
              headquarters: {
                street: '123 Supplier St',
                city: 'Supplier City',
                state: 'SC',
                zipCode: '12345',
                country: 'Test Country'
              }
            },
            businessDetails: {
              taxId: `TAX${Date.now()}`
            }
          }
        },
        get: { method: 'GET', path: '/suppliers/:id' },
        update: { 
          method: 'PUT', 
          path: '/suppliers/:id',
          data: { 
            companyInfo: { 
              name: 'Updated Supplier'
            }
          }
        },
        delete: { method: 'DELETE', path: '/suppliers/:id' }
      }
    },
    {
      name: 'Warehouses',
      endpoints: {
        list: { method: 'GET', path: '/warehouses' },
        create: { 
          method: 'POST', 
          path: '/warehouses',
          data: {
            name: `Test Warehouse ${Date.now()}`,
            code: `WH-${Date.now()}`,
            type: 'cold-storage',
            address: {
              street: '123 Warehouse St',
              city: 'Warehouse City',
              state: 'WC',
              zipCode: '12345',
              country: 'Test Country'
            },
            capacity: {
              total: 10000,
              unit: 'liters'
            },
            contact: {
              name: 'Manager',
              phone: '+1234567890',
              email: `warehouse${Date.now()}@test.com`
            }
          }
        },
        get: { method: 'GET', path: '/warehouses/:id' },
        update: { 
          method: 'PUT', 
          path: '/warehouses/:id',
          data: { description: 'Updated warehouse' }
        },
        delete: { method: 'DELETE', path: '/warehouses/:id' }
      }
    },
    {
      name: 'Dealers',
      endpoints: {
        list: { method: 'GET', path: '/dealers' },
        create: { 
          method: 'POST', 
          path: '/dealers',
          data: {
            personalInfo: {
              firstName: 'Test',
              lastName: 'Dealer',
              email: `dealer${Date.now()}@test.com`,
              phone: '+1234567890'
            },
            businessInfo: {
              businessName: `Test Dealer Business ${Date.now()}`,
              gstNumber: `GST${Date.now()}`
            },
            address: {
              street: '123 Dealer St',
              city: 'Dealer City',
              state: 'DC',
              zipCode: '12345'
            }
          }
        },
        get: { method: 'GET', path: '/dealers/:id' },
        update: { 
          method: 'PUT', 
          path: '/dealers/:id',
          data: { 
            personalInfo: { 
              firstName: 'Updated'
            }
          }
        },
        delete: { method: 'DELETE', path: '/dealers/:id' }
      }
    },
    {
      name: 'Dealer Groups',
      endpoints: {
        list: { method: 'GET', path: '/dealer-groups' },
        create: { 
          method: 'POST', 
          path: '/dealer-groups',
          data: {
            name: `Test Group ${Date.now()}`,
            code: `GRP-${Date.now()}`,
            description: 'Test dealer group'
          }
        },
        get: { method: 'GET', path: '/dealer-groups/:id' },
        update: { 
          method: 'PUT', 
          path: '/dealer-groups/:id',
          data: { description: 'Updated group' }
        },
        delete: { method: 'DELETE', path: '/dealer-groups/:id' }
      }
    },
    {
      name: 'Orders',
      endpoints: {
        list: { method: 'GET', path: '/orders' },
        stats: { method: 'GET', path: '/orders/meta/stats' }
      }
    },
    {
      name: 'Inventory',
      endpoints: {
        list: { method: 'GET', path: '/inventory' },
        alerts: { method: 'GET', path: '/inventory/meta/alerts' }
      }
    },
    {
      name: 'Company Settings',
      endpoints: {
        get: { method: 'GET', path: '/company-settings' },
        update: { 
          method: 'PUT', 
          path: '/company-settings',
          data: { 
            companyName: 'Updated Test Company'
          }
        },
        subscription: { method: 'GET', path: '/company-settings/subscription' }
      }
    }
  ];

  for (const module of modules) {
    console.log(`\n  Testing ${module.name}...`.cyan);
    
    let createdId = null;
    
    for (const [operation, config] of Object.entries(module.endpoints)) {
      let endpoint = config.path;
      let data = config.data;
      
      // Replace :id with actual ID if needed
      if (endpoint.includes(':id') && createdId) {
        endpoint = endpoint.replace(':id', createdId);
      } else if (endpoint.includes(':id')) {
        continue; // Skip operations that need ID if we don't have one
      }
      
      const result = await apiRequest(config.method, endpoint, data, token, tenantId);
      
      if (result.success) {
        console.log(`    ✓ ${operation}`.green);
        testResults.passed.push(`${module.name} - ${operation}`);
        
        // Store created ID for subsequent operations
        if (operation === 'create' && result.data?.data) {
          const dataKey = Object.keys(result.data.data)[0];
          createdId = result.data.data[dataKey]?._id || result.data.data[dataKey]?.id;
        }
      } else {
        console.log(`    ✗ ${operation}: ${result.error?.message || result.status}`.red);
        testResults.failed.push({ 
          test: `${module.name} - ${operation}`, 
          error: result.error,
          status: result.status
        });
      }
    }
  }
}

// Test Tenant Isolation
async function testTenantIsolation(token1, token2) {
  console.log('\n🔒 Testing Tenant Isolation...'.yellow);
  
  // Create data in tenant 1
  const result1 = await apiRequest('POST', '/products', {
    name: 'Tenant1 Product',
    sku: 'T1-001',
    category: 'test',
    brand: 'T1 Brand',
    description: 'Product for tenant 1',
    unit: 'kg',
    packSize: 1,
    pricing: { basePrice: 100 }
  }, token1, 'TEST001');
  
  if (!result1.success) {
    console.log('  ✗ Failed to create product for tenant 1'.red);
    return;
  }
  
  // Try to access tenant 1's data with tenant 2's token
  const result2 = await apiRequest('GET', '/products', null, token2, 'TEST002');
  
  if (result2.success) {
    const products = result2.data?.data?.products || [];
    const crossTenantData = products.find(p => p.name === 'Tenant1 Product');
    
    if (crossTenantData) {
      console.log('  ✗ CRITICAL: Cross-tenant data leak detected!'.red);
      testResults.failed.push({ 
        test: 'Tenant Isolation', 
        error: 'Cross-tenant data accessible'
      });
    } else {
      console.log('  ✓ Tenant isolation working correctly'.green);
      testResults.passed.push('Tenant Isolation');
    }
  } else {
    console.log('  ⚠ Could not verify tenant isolation'.yellow);
  }
}

// Test Error Handling
async function testErrorHandling(token) {
  console.log('\n⚠️  Testing Error Handling...'.yellow);
  
  const tests = [
    {
      name: 'Invalid ID format',
      method: 'GET',
      endpoint: '/products/invalid-id',
      expectedStatus: 400
    },
    {
      name: 'Non-existent resource',
      method: 'GET',
      endpoint: '/products/507f1f77bcf86cd799439011',
      expectedStatus: 404
    },
    {
      name: 'Missing required fields',
      method: 'POST',
      endpoint: '/products',
      data: { name: 'Incomplete Product' },
      expectedStatus: 400
    },
    {
      name: 'Unauthorized access',
      method: 'GET',
      endpoint: '/products',
      token: 'invalid-token',
      expectedStatus: 401
    }
  ];
  
  for (const test of tests) {
    const result = await apiRequest(
      test.method, 
      test.endpoint, 
      test.data, 
      test.token === undefined ? token : test.token,
      TEST_TENANT_ID
    );
    
    if (result.status === test.expectedStatus) {
      console.log(`  ✓ ${test.name} (${test.expectedStatus})`.green);
      testResults.passed.push(`Error Handling - ${test.name}`);
    } else {
      console.log(`  ✗ ${test.name}: Expected ${test.expectedStatus}, got ${result.status}`.red);
      testResults.failed.push({ 
        test: `Error Handling - ${test.name}`, 
        expected: test.expectedStatus,
        actual: result.status
      });
    }
  }
}

// Generate Test Report
function generateReport() {
  console.log('\n' + '='.repeat(60).cyan);
  console.log('                    TEST REPORT'.cyan);
  console.log('='.repeat(60).cyan);
  
  const total = testResults.passed.length + testResults.failed.length;
  const passRate = total > 0 ? ((testResults.passed.length / total) * 100).toFixed(2) : 0;
  
  console.log(`\n📊 Summary:`.white);
  console.log(`  Total Tests: ${total}`);
  console.log(`  Passed: ${testResults.passed.length}`.green);
  console.log(`  Failed: ${testResults.failed.length}`.red);
  console.log(`  Pass Rate: ${passRate}%`);
  
  if (testResults.failed.length > 0) {
    console.log(`\n❌ Failed Tests:`.red);
    testResults.failed.forEach((failure, index) => {
      console.log(`  ${index + 1}. ${failure.test}`);
      if (failure.error) {
        console.log(`     Error: ${JSON.stringify(failure.error)}`.gray);
      }
    });
  }
  
  if (testResults.errors.length > 0) {
    console.log(`\n⚠️  Errors:`.yellow);
    testResults.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`.yellow);
    });
  }
  
  console.log('\n' + '='.repeat(60).cyan);
  
  if (passRate >= 90) {
    console.log('✅ API tests completed successfully!'.green.bold);
  } else if (passRate >= 70) {
    console.log('⚠️  API tests completed with some issues'.yellow.bold);
  } else {
    console.log('❌ API tests failed - critical issues found'.red.bold);
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Comprehensive API Tests'.cyan.bold);
  console.log('='.repeat(60).cyan);
  
  try {
    // Connect to database
    await connectDB();
    
    // Setup test data
    const testData = await setupTestData();
    
    // Test authentication
    const { userToken, saasToken } = await testAuth();
    
    if (!userToken) {
      throw new Error('Failed to obtain user token - cannot continue tests');
    }
    
    // Test CRUD operations
    await testCRUD(userToken, TEST_TENANT_ID);
    
    // Test tenant isolation
    // Create second tenant and user for isolation testing
    const Company = require('../api/models/Company');
    const User = require('../api/models/User');
    
    let company2 = await Company.findOne({ tenantId: 'TEST002' });
    if (!company2) {
      company2 = await Company.create({
        tenantId: 'TEST002',
        name: 'Test Company 2',
        slug: 'test-company-2',
        contactInfo: {
          email: 'company2@test.com',
          phone: '+0987654321'
        },
        address: {
          street: '456 Test Ave',
          city: 'Test Town',
          state: 'TT',
          zipCode: '54321',
          country: 'Test Country'
        },
        subscription: {
          plan: 'professional',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });
    }
    
    let user2 = await User.findOne({ email: 'test2@test.com' });
    if (!user2) {
      user2 = await User.create({
        name: 'Test User 2',
        email: 'test2@test.com',
        password: 'Test@123',
        role: 'admin',
        tenantId: 'TEST002',
        company: company2._id
      });
    }
    
    // Get token for second tenant
    const loginResult = await apiRequest('POST', '/auth/login', {
      email: 'test2@test.com',
      password: 'Test@123'
    });
    
    if (loginResult.success) {
      await testTenantIsolation(userToken, loginResult.data.token);
    }
    
    // Test error handling
    await testErrorHandling(userToken);
    
    // Generate report
    generateReport();
    
  } catch (error) {
    console.error('\n❌ Fatal error during testing:'.red, error);
    testResults.errors.push(error.message);
    generateReport();
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed'.gray);
  }
}

// Run the tests
runTests().catch(console.error);