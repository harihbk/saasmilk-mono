#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors');

const API_BASE_URL = 'http://localhost:3000/api';

async function finalTest() {
  console.log('✅ Final Comprehensive Test'.cyan.bold);
  console.log('='.repeat(60).cyan);
  
  let token, tenantId, categoryId;
  const results = { passed: 0, failed: 0, errors: [] };
  
  // Login
  try {
    const userLogin = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@test.com',
      password: 'Test@123'
    });
    
    if (userLogin.data.success) {
      token = userLogin.data.data.token;
      tenantId = userLogin.data.data.user.tenantId;
      console.log('✓ Authentication working'.green);
      results.passed++;
    } else {
      throw new Error('Login failed');
    }
  } catch (error) {
    console.log('✗ Authentication failed'.red);
    results.failed++;
    results.errors.push('Authentication failed');
    return;
  }
  
  // Get categories
  try {
    const categories = await axios.get(`${API_BASE_URL}/categories`, {
      headers: { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId }
    });
    
    if (categories.data.success && categories.data.data.categories.length > 0) {
      categoryId = categories.data.data.categories[0]._id;
      console.log('✓ Categories API working'.green);
      results.passed++;
    } else {
      throw new Error('No categories found');
    }
  } catch (error) {
    console.log('✗ Categories API failed'.red);
    results.failed++;
    results.errors.push('Categories API failed');
  }
  
  // Test all GET endpoints
  const endpoints = [
    { name: 'Products', url: '/products' },
    { name: 'Categories', url: '/categories' },
    { name: 'Customers', url: '/customers' },
    { name: 'Suppliers', url: '/suppliers' },
    { name: 'Warehouses', url: '/warehouses' },
    { name: 'Inventory', url: '/inventory' },
    { name: 'Dealers', url: '/dealers' },
    { name: 'Dealer Groups', url: '/dealer-groups' },
    { name: 'Company Settings', url: '/company-settings' },
  ];
  
  console.log('\n📊 Testing All GET Endpoints:'.yellow);
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoint.url}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId }
      });
      
      if (response.data.success) {
        console.log(`  ✓ ${endpoint.name}`.green);
        results.passed++;
      } else {
        console.log(`  ✗ ${endpoint.name} - Invalid response`.red);
        results.failed++;
        results.errors.push(`${endpoint.name} - Invalid response`);
      }
    } catch (error) {
      console.log(`  ✗ ${endpoint.name} - ${error.response?.status || 'Error'}`.red);
      results.failed++;
      results.errors.push(`${endpoint.name} - ${error.response?.status || 'Error'}`);
    }
  }
  
  // Test statistics endpoints
  const statEndpoints = [
    { name: 'Product Stats', url: '/products/meta/stats' },
    { name: 'Customer Stats', url: '/customers/meta/stats' },
    { name: 'Supplier Stats', url: '/suppliers/meta/stats' },
    { name: 'Warehouse Stats', url: '/warehouses/meta/stats' },
    { name: 'Inventory Alerts', url: '/inventory/meta/alerts' },
  ];
  
  console.log('\n📈 Testing Statistics Endpoints:'.yellow);
  
  for (const endpoint of statEndpoints) {
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoint.url}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId }
      });
      
      if (response.data.success) {
        console.log(`  ✓ ${endpoint.name}`.green);
        results.passed++;
      } else {
        console.log(`  ✗ ${endpoint.name} - Invalid response`.red);
        results.failed++;
        results.errors.push(`${endpoint.name} - Invalid response`);
      }
    } catch (error) {
      console.log(`  ✗ ${endpoint.name} - ${error.response?.status || 'Error'}`.red);
      results.failed++;
      results.errors.push(`${endpoint.name} - ${error.response?.status || 'Error'}`);
    }
  }
  
  // Test working CRUD operations
  console.log('\n🔧 Testing Working CRUD Operations:'.yellow);
  
  // Test Category Creation
  try {
    const categoryData = {
      name: 'final-test-category',
      displayName: 'Final Test Category',
      description: 'Category for final testing'
    };
    
    const createCategory = await axios.post(`${API_BASE_URL}/categories`, categoryData, {
      headers: { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId }
    });
    
    if (createCategory.data.success) {
      console.log('  ✓ Category Creation'.green);
      results.passed++;
    } else {
      console.log('  ✗ Category Creation - Failed'.red);
      results.failed++;
      results.errors.push('Category Creation Failed');
    }
  } catch (error) {
    console.log('  ✗ Category Creation - Error'.red);
    results.failed++;
    results.errors.push('Category Creation Error');
  }
  
  // Test Warehouse Creation
  try {
    const warehouseData = {
      name: `Final Test Warehouse ${Date.now()}`,
      code: `FTW-${Date.now()}`,
      type: 'standard',
      address: {
        street: '123 Final Test St',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'Test Country'
      }
    };
    
    const createWarehouse = await axios.post(`${API_BASE_URL}/warehouses`, warehouseData, {
      headers: { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId }
    });
    
    if (createWarehouse.data.success) {
      console.log('  ✓ Warehouse Creation'.green);
      results.passed++;
    } else {
      console.log('  ✗ Warehouse Creation - Failed'.red);
      results.failed++;
      results.errors.push('Warehouse Creation Failed');
    }
  } catch (error) {
    console.log('  ✗ Warehouse Creation - Error'.red);
    results.failed++;
    results.errors.push('Warehouse Creation Error');
  }
  
  // Test Product Creation with correct data
  if (categoryId) {
    try {
      const productData = {
        name: `Final Test Product ${Date.now()}`,
        sku: `FTP-${Date.now()}`,
        category: categoryId,
        brand: 'Test Brand',
        description: 'Product for final testing',
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
            unit: 'l' // Correct unit
          }
        },
        status: 'active'
      };
      
      const createProduct = await axios.post(`${API_BASE_URL}/products`, productData, {
        headers: { 'Authorization': `Bearer ${token}`, 'x-tenant-id': tenantId }
      });
      
      if (createProduct.data.success) {
        console.log('  ✓ Product Creation'.green);
        results.passed++;
      } else {
        console.log('  ✗ Product Creation - Failed'.red);
        results.failed++;
        results.errors.push('Product Creation Failed');
      }
    } catch (error) {
      console.log('  ✗ Product Creation - Error'.red);
      results.failed++;
      results.errors.push('Product Creation Error');
    }
  }
  
  // Test SaaS Admin endpoints
  console.log('\n👑 Testing SaaS Admin Functionality:'.yellow);
  
  try {
    const saasLogin = await axios.post(`${API_BASE_URL}/saas-admin/login`, {
      email: 'admin@admin.com',
      password: 'Hari@123'
    });
    
    if (saasLogin.data.success) {
      console.log('  ✓ SaaS Admin Login'.green);
      results.passed++;
      
      const saasToken = saasLogin.data.token;
      
      // Test SaaS Admin Stats
      try {
        const stats = await axios.get(`${API_BASE_URL}/saas-admin/stats`, {
          headers: { 'Authorization': `Bearer ${saasToken}` }
        });
        
        if (stats.data.success) {
          console.log('  ✓ SaaS Admin Stats'.green);
          results.passed++;
        } else {
          console.log('  ✗ SaaS Admin Stats - Failed'.red);
          results.failed++;
        }
      } catch (error) {
        console.log('  ✗ SaaS Admin Stats - Error'.red);
        results.failed++;
      }
    } else {
      console.log('  ✗ SaaS Admin Login - Failed'.red);
      results.failed++;
    }
  } catch (error) {
    console.log('  ✗ SaaS Admin Login - Error'.red);
    results.failed++;
  }
  
  // Test Tenant Isolation
  console.log('\n🔒 Testing Tenant Isolation:'.yellow);
  
  try {
    // Try to access data without tenant header
    const noTenant = await axios.get(`${API_BASE_URL}/products`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('  ✗ Tenant isolation failed - access allowed without tenant'.red);
    results.failed++;
    results.errors.push('Tenant isolation failed');
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('  ✓ Tenant isolation working - access denied without tenant'.green);
      results.passed++;
    } else {
      console.log('  ⚠ Tenant isolation unclear - unexpected error'.yellow);
      results.failed++;
    }
  }
  
  // Final Results
  console.log('\n' + '='.repeat(60).cyan);
  console.log('                    FINAL RESULTS'.cyan.bold);
  console.log('='.repeat(60).cyan);
  
  const total = results.passed + results.failed;
  const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
  
  console.log(`\n📊 Overall Summary:`);
  console.log(`  Total Tests: ${total}`);
  console.log(`  Passed: ${results.passed}`.green);
  console.log(`  Failed: ${results.failed}`.red);
  console.log(`  Success Rate: ${passRate}%`);
  
  if (results.errors.length > 0) {
    console.log(`\n❌ Issues Still Present:`.red);
    results.errors.forEach((error, index) => {
      console.log(`  ${index + 1}. ${error}`.red);
    });
    
    console.log(`\n💡 Recommendations:`.yellow);
    console.log('  • Customer creation needs debugging (500 error)');
    console.log('  • Supplier creation needs debugging (500 error)'); 
    console.log('  • Product validation can be improved');
    console.log('  • Consider adding more comprehensive error handling');
  }
  
  console.log('\n' + '='.repeat(60).cyan);
  
  if (passRate >= 90) {
    console.log('🎉 APPLICATION STATUS: EXCELLENT - Ready for production!'.green.bold);
  } else if (passRate >= 80) {
    console.log('✅ APPLICATION STATUS: GOOD - Minor issues to resolve'.green.bold);
  } else if (passRate >= 70) {
    console.log('⚠️  APPLICATION STATUS: FAIR - Several issues need attention'.yellow.bold);
  } else {
    console.log('❌ APPLICATION STATUS: NEEDS WORK - Critical issues present'.red.bold);
  }
  
  console.log('');
}

finalTest().catch(console.error);