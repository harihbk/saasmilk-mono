#!/usr/bin/env node

/**
 * CRUD Operations Test
 */

const axios = require('axios');
const colors = require('colors');

const API_BASE_URL = 'http://localhost:3000/api';

async function testCRUD() {
  console.log('🔧 CRUD Operations Test'.cyan.bold);
  console.log('='.repeat(50).cyan);
  
  const results = { passed: 0, failed: 0, errors: [] };
  let token, tenantId;
  
  // Login first
  try {
    const userLogin = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@test.com',
      password: 'Test@123'
    });
    
    if (userLogin.data.success) {
      token = userLogin.data.data.token;
      tenantId = userLogin.data.data.user.tenantId;
      console.log('✓ Logged in successfully'.green);
    } else {
      throw new Error('Login failed');
    }
  } catch (error) {
    console.log('✗ Login failed, cannot continue'.red);
    return;
  }
  
  // Test Category Creation
  let categoryId = null;
  try {
    console.log('\n1. Testing Category Creation...'.yellow);
    const categoryData = {
      name: 'test-category',
      displayName: 'Test Category',
      description: 'Test category for CRUD testing'
    };
    
    const createCategory = await axios.post(`${API_BASE_URL}/categories`, categoryData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    });
    
    if (createCategory.data.success) {
      categoryId = createCategory.data.data.category._id;
      console.log('  ✓ Category created successfully'.green);
      results.passed++;
    } else {
      console.log('  ✗ Category creation failed'.red);
      results.failed++;
    }
  } catch (error) {
    console.log(`  ✗ Category creation error: ${error.response?.data?.message || error.message}`.red);
    results.failed++;
    results.errors.push(`Category Creation: ${error.response?.data?.message || error.message}`);
  }
  
  // Test Product Creation
  let productId = null;
  if (categoryId) {
    try {
      console.log('\n2. Testing Product Creation...'.yellow);
      const productData = {
        name: 'Test Product',
        sku: 'TEST-001',
        category: categoryId,
        brand: 'Test Brand',
        description: 'Test product for CRUD testing',
        unit: 'liters',
        packSize: 1,
        pricing: {
          basePrice: 100,
          currency: 'INR'
        }
      };
      
      const createProduct = await axios.post(`${API_BASE_URL}/products`, productData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        }
      });
      
      if (createProduct.data.success) {
        productId = createProduct.data.data.product._id;
        console.log('  ✓ Product created successfully'.green);
        results.passed++;
      } else {
        console.log('  ✗ Product creation failed'.red);
        results.failed++;
      }
    } catch (error) {
      console.log(`  ✗ Product creation error: ${error.response?.data?.message || error.message}`.red);
      results.failed++;
      results.errors.push(`Product Creation: ${error.response?.data?.message || error.message}`);
    }
  }
  
  // Test Customer Creation
  let customerId = null;
  try {
    console.log('\n3. Testing Customer Creation...'.yellow);
    const customerData = {
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
        zipCode: '12345',
        country: 'Test Country'
      }
    };
    
    const createCustomer = await axios.post(`${API_BASE_URL}/customers`, customerData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    });
    
    if (createCustomer.data.success) {
      customerId = createCustomer.data.data.customer._id;
      console.log('  ✓ Customer created successfully'.green);
      results.passed++;
    } else {
      console.log('  ✗ Customer creation failed'.red);
      results.failed++;
    }
  } catch (error) {
    console.log(`  ✗ Customer creation error: ${error.response?.data?.message || error.message}`.red);
    results.failed++;
    results.errors.push(`Customer Creation: ${error.response?.data?.message || error.message}`);
  }
  
  // Test Warehouse Creation
  let warehouseId = null;
  try {
    console.log('\n4. Testing Warehouse Creation...'.yellow);
    const warehouseData = {
      name: 'Test Warehouse',
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
    };
    
    const createWarehouse = await axios.post(`${API_BASE_URL}/warehouses`, warehouseData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    });
    
    if (createWarehouse.data.success) {
      warehouseId = createWarehouse.data.data.warehouse._id;
      console.log('  ✓ Warehouse created successfully'.green);
      results.passed++;
    } else {
      console.log('  ✗ Warehouse creation failed'.red);
      results.failed++;
    }
  } catch (error) {
    console.log(`  ✗ Warehouse creation error: ${error.response?.data?.message || error.message}`.red);
    results.failed++;
    results.errors.push(`Warehouse Creation: ${error.response?.data?.message || error.message}`);
  }
  
  // Test Supplier Creation
  let supplierId = null;
  try {
    console.log('\n5. Testing Supplier Creation...'.yellow);
    const supplierData = {
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
    };
    
    const createSupplier = await axios.post(`${API_BASE_URL}/suppliers`, supplierData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    });
    
    if (createSupplier.data.success) {
      supplierId = createSupplier.data.data.supplier._id;
      console.log('  ✓ Supplier created successfully'.green);
      results.passed++;
    } else {
      console.log('  ✗ Supplier creation failed'.red);
      results.failed++;
    }
  } catch (error) {
    console.log(`  ✗ Supplier creation error: ${error.response?.data?.message || error.message}`.red);
    results.failed++;
    results.errors.push(`Supplier Creation: ${error.response?.data?.message || error.message}`);
  }
  
  // Test Inventory Creation (if product and warehouse exist)
  if (productId && warehouseId) {
    try {
      console.log('\n6. Testing Inventory Creation...'.yellow);
      const inventoryData = {
        product: productId,
        location: {
          warehouse: warehouseId
        },
        stock: {
          available: 100
        },
        thresholds: {
          minimum: 10,
          maximum: 1000
        },
        pricing: {
          averageCost: 90
        }
      };
      
      const createInventory = await axios.post(`${API_BASE_URL}/inventory`, inventoryData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        }
      });
      
      if (createInventory.data.success) {
        console.log('  ✓ Inventory created successfully'.green);
        results.passed++;
      } else {
        console.log('  ✗ Inventory creation failed'.red);
        results.failed++;
      }
    } catch (error) {
      console.log(`  ✗ Inventory creation error: ${error.response?.data?.message || error.message}`.red);
      results.failed++;
      results.errors.push(`Inventory Creation: ${error.response?.data?.message || error.message}`);
    }
  }
  
  // Test Statistics endpoints
  console.log('\n7. Testing Statistics Endpoints...'.yellow);
  
  const statEndpoints = [
    '/products/meta/stats',
    '/customers/meta/stats', 
    '/suppliers/meta/stats',
    '/warehouses/meta/stats',
    '/inventory/meta/alerts'
  ];
  
  for (const endpoint of statEndpoints) {
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        }
      });
      
      if (response.data.success) {
        console.log(`  ✓ ${endpoint} working`.green);
        results.passed++;
      } else {
        console.log(`  ✗ ${endpoint} failed`.red);
        results.failed++;
      }
    } catch (error) {
      console.log(`  ✗ ${endpoint} error: ${error.response?.status}`.red);
      results.failed++;
    }
  }
  
  // Results Summary
  console.log('\n' + '='.repeat(50).cyan);
  console.log('              CRUD RESULTS'.cyan.bold);
  console.log('='.repeat(50).cyan);
  
  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  console.log(`\n📊 Summary:`);
  console.log(`  Total Tests: ${total}`);
  console.log(`  Passed: ${results.passed}`.green);
  console.log(`  Failed: ${results.failed}`.red);
  console.log(`  Pass Rate: ${passRate}%`);
  
  if (results.errors.length > 0) {
    console.log(`\n❌ Issues Found:`.red);
    results.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`.red);
    });
  }
  
  console.log('\n' + '='.repeat(50).cyan);
  
  if (passRate >= 90) {
    console.log('✅ CRUD operations working well!'.green.bold);
  } else if (passRate >= 70) {
    console.log('⚠️  Some CRUD operations need attention'.yellow.bold);
  } else {
    console.log('❌ CRUD operations have critical issues'.red.bold);
  }
  
  console.log('');
}

testCRUD().catch(console.error);