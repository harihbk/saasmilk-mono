#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors');

const API_BASE_URL = 'http://localhost:3000/api';

async function fixAndTest() {
  console.log('🔧 Fix and Test Validation Issues'.cyan.bold);
  console.log('='.repeat(50).cyan);
  
  let token, tenantId, categoryId;
  
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
  
  // Get existing categories
  try {
    console.log('\n1. Getting existing categories...'.yellow);
    const categories = await axios.get(`${API_BASE_URL}/categories`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    });
    
    if (categories.data.success && categories.data.data.categories.length > 0) {
      categoryId = categories.data.data.categories[0]._id;
      console.log(`  ✓ Found category: ${categoryId}`.green);
    } else {
      console.log('  No categories found, will create one'.yellow);
    }
  } catch (error) {
    console.log('  Error getting categories'.red);
  }
  
  // Test Product Creation with correct data
  try {
    console.log('\n2. Testing Product Creation with correct data...'.yellow);
    const productData = {
      name: 'Fixed Test Product',
      sku: 'FIXED-001',
      category: categoryId, // Use actual category ID
      brand: 'Test Brand',
      description: 'Fixed test product',
      unit: 'liters',
      packSize: 1,
      pricing: {
        basePrice: 100,
        currency: 'INR'
      },
      price: {
        cost: 80,
        selling: 120
      },
      packaging: {
        type: 'bottle',
        size: {
          value: 1,
          unit: 'liter'
        }
      },
      supplier: null, // Optional field
      status: 'active'
    };
    
    const createProduct = await axios.post(`${API_BASE_URL}/products`, productData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    });
    
    if (createProduct.data.success) {
      console.log('  ✓ Product created successfully'.green);
    } else {
      console.log('  Product creation still failed:', createProduct.data.message);
    }
  } catch (error) {
    console.log('  Product creation error:'.red);
    console.log('  Status:', error.response?.status);
    console.log('  Response:', JSON.stringify(error.response?.data, null, 2));
  }
  
  // Test Customer Creation with correct data
  try {
    console.log('\n3. Testing Customer Creation with correct data...'.yellow);
    const customerData = {
      type: 'individual',
      personalInfo: {
        firstName: 'Fixed',
        lastName: 'Customer',
        email: `fixed${Date.now()}@test.com`,
        phone: {
          primary: '+1234567890'
        }
      },
      addresses: [{
        type: 'billing',
        street: '123 Fixed St',
        city: 'Fixed City',
        state: 'FC',
        zipCode: '12345',
        country: 'Test Country',
        isDefault: true
      }]
    };
    
    const createCustomer = await axios.post(`${API_BASE_URL}/customers`, customerData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    });
    
    if (createCustomer.data.success) {
      console.log('  ✓ Customer created successfully'.green);
    } else {
      console.log('  Customer creation still failed:', createCustomer.data.message);
    }
  } catch (error) {
    console.log('  Customer creation error:'.red);
    console.log('  Status:', error.response?.status);
    console.log('  Response:', JSON.stringify(error.response?.data, null, 2));
  }
  
  // Test minimal Warehouse Creation
  try {
    console.log('\n4. Testing Warehouse Creation with minimal data...'.yellow);
    const warehouseData = {
      name: 'Minimal Warehouse',
      code: `MIN-${Date.now()}`,
      type: 'standard',
      address: {
        street: '123 Min St',
        city: 'Min City',
        state: 'MC',
        zipCode: '12345',
        country: 'Test Country'
      }
    };
    
    const createWarehouse = await axios.post(`${API_BASE_URL}/warehouses`, warehouseData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    });
    
    if (createWarehouse.data.success) {
      console.log('  ✓ Warehouse created successfully'.green);
    } else {
      console.log('  Warehouse creation still failed:', createWarehouse.data.message);
    }
  } catch (error) {
    console.log('  Warehouse creation error:'.red);
    console.log('  Status:', error.response?.status);
    console.log('  Response:', JSON.stringify(error.response?.data, null, 2));
  }
  
  // Test minimal Supplier Creation
  try {
    console.log('\n5. Testing Supplier Creation with minimal data...'.yellow);
    const supplierData = {
      companyInfo: {
        name: `Minimal Supplier ${Date.now()}`,
        businessType: 'dairy-farm'
      },
      contactInfo: {
        primaryContact: {
          name: 'Min Contact',
          email: `min${Date.now()}@test.com`,
          phone: '+1234567890'
        }
      },
      addresses: {
        headquarters: {
          street: '123 Min St',
          city: 'Min City',
          state: 'MC',
          zipCode: '12345',
          country: 'Test Country'
        }
      },
      businessDetails: {
        taxId: `MIN${Date.now()}`
      }
    };
    
    const createSupplier = await axios.post(`${API_BASE_URL}/suppliers`, supplierData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    });
    
    if (createSupplier.data.success) {
      console.log('  ✓ Supplier created successfully'.green);
    } else {
      console.log('  Supplier creation still failed:', createSupplier.data.message);
    }
  } catch (error) {
    console.log('  Supplier creation error:'.red);
    console.log('  Status:', error.response?.status);
    console.log('  Response:', JSON.stringify(error.response?.data, null, 2));
  }
  
  // Test Products Stats endpoint
  try {
    console.log('\n6. Testing Products Stats endpoint...'.yellow);
    const productsStats = await axios.get(`${API_BASE_URL}/products/meta/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    });
    
    if (productsStats.data.success) {
      console.log('  ✓ Products stats working'.green);
    } else {
      console.log('  Products stats failed:', productsStats.data.message);
    }
  } catch (error) {
    console.log('  Products stats error:'.red);
    console.log('  Status:', error.response?.status);
    console.log('  Response:', JSON.stringify(error.response?.data, null, 2));
  }
}

fixAndTest().catch(console.error);