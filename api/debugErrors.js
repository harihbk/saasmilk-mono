#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors');

const API_BASE_URL = 'http://localhost:3000/api';

async function debugErrors() {
  console.log('🐛 Debug API Errors'.cyan.bold);
  console.log('='.repeat(50).cyan);
  
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
  
  // Test Product Creation with detailed error
  try {
    console.log('\n1. Testing Product Creation (detailed)...'.yellow);
    const productData = {
      name: 'Test Product Debug',
      sku: 'TEST-DEBUG-001',
      category: 'test-category', // Try string instead of ObjectId
      brand: 'Test Brand',
      description: 'Test product for debugging',
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
    
    console.log('  Product creation response:', JSON.stringify(createProduct.data, null, 2));
  } catch (error) {
    console.log('  Product creation error details:'.red);
    console.log('  Status:', error.response?.status);
    console.log('  Response:', JSON.stringify(error.response?.data, null, 2));
  }
  
  // Test Customer Creation with detailed error
  try {
    console.log('\n2. Testing Customer Creation (detailed)...'.yellow);
    const customerData = {
      personalInfo: {
        firstName: 'Debug',
        lastName: 'Customer',
        email: `debug${Date.now()}@test.com`,
        phone: '+1234567890'
      },
      address: {
        street: '123 Debug St',
        city: 'Debug City',
        state: 'DS',
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
    
    console.log('  Customer creation response:', JSON.stringify(createCustomer.data, null, 2));
  } catch (error) {
    console.log('  Customer creation error details:'.red);
    console.log('  Status:', error.response?.status);
    console.log('  Response:', JSON.stringify(error.response?.data, null, 2));
  }
  
  // Test Warehouse Creation with detailed error
  try {
    console.log('\n3. Testing Warehouse Creation (detailed)...'.yellow);
    const warehouseData = {
      name: 'Debug Warehouse',
      code: `DBG-${Date.now()}`,
      type: 'cold-storage',
      address: {
        street: '123 Debug Warehouse St',
        city: 'Debug City',
        state: 'DC',
        zipCode: '12345',
        country: 'Test Country'
      },
      capacity: {
        total: 10000,
        unit: 'liters'
      },
      contact: {
        name: 'Debug Manager',
        phone: '+1234567890',
        email: `debug${Date.now()}@test.com`
      }
    };
    
    const createWarehouse = await axios.post(`${API_BASE_URL}/warehouses`, warehouseData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    });
    
    console.log('  Warehouse creation response:', JSON.stringify(createWarehouse.data, null, 2));
  } catch (error) {
    console.log('  Warehouse creation error details:'.red);
    console.log('  Status:', error.response?.status);
    console.log('  Response:', JSON.stringify(error.response?.data, null, 2));
  }
  
  // Test Supplier Creation with detailed error
  try {
    console.log('\n4. Testing Supplier Creation (detailed)...'.yellow);
    const supplierData = {
      companyInfo: {
        name: `Debug Supplier ${Date.now()}`,
        businessType: 'dairy-farm'
      },
      contactInfo: {
        primaryContact: {
          name: 'Debug Contact',
          email: `debug${Date.now()}@test.com`,
          phone: '+1234567890'
        }
      },
      addresses: {
        headquarters: {
          street: '123 Debug St',
          city: 'Debug City',
          state: 'DC',
          zipCode: '12345',
          country: 'Test Country'
        }
      },
      businessDetails: {
        taxId: `DBG${Date.now()}`
      }
    };
    
    const createSupplier = await axios.post(`${API_BASE_URL}/suppliers`, supplierData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    });
    
    console.log('  Supplier creation response:', JSON.stringify(createSupplier.data, null, 2));
  } catch (error) {
    console.log('  Supplier creation error details:'.red);
    console.log('  Status:', error.response?.status);
    console.log('  Response:', JSON.stringify(error.response?.data, null, 2));
  }
  
  // Test missing /products/meta/stats endpoint
  try {
    console.log('\n5. Testing Products Stats endpoint...'.yellow);
    const productsStats = await axios.get(`${API_BASE_URL}/products/meta/stats`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    });
    
    console.log('  Products stats response:', JSON.stringify(productsStats.data, null, 2));
  } catch (error) {
    console.log('  Products stats error details:'.red);
    console.log('  Status:', error.response?.status);
    console.log('  Response:', JSON.stringify(error.response?.data, null, 2));
  }
}

debugErrors().catch(console.error);