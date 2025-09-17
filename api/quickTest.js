#!/usr/bin/env node

/**
 * Quick API Test - Focus on key issues
 */

const axios = require('axios');
const colors = require('colors');

const API_BASE_URL = 'http://localhost:3000/api';

async function testAPI() {
  console.log('🔍 Quick API Tests'.cyan.bold);
  console.log('='.repeat(50).cyan);
  
  const results = { passed: 0, failed: 0, errors: [] };
  
  // Test 1: SaaS Admin Login
  try {
    console.log('\n1. Testing SaaS Admin Login...'.yellow);
    const saasLogin = await axios.post(`${API_BASE_URL}/saas-admin/login`, {
      email: 'admin@admin.com',
      password: 'Hari@123'
    });
    
    if (saasLogin.data.success) {
      console.log('  ✓ SaaS Admin login successful'.green);
      results.passed++;
    } else {
      console.log('  ✗ SaaS Admin login failed'.red);
      results.failed++;
    }
  } catch (error) {
    console.log(`  ✗ SaaS Admin login error: ${error.response?.data?.message || error.message}`.red);
    results.failed++;
    results.errors.push(`SaaS Admin Login: ${error.message}`);
  }
  
  // Test 2: User Login
  try {
    console.log('\n2. Testing User Login...'.yellow);
    const userLogin = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'test@test.com',
      password: 'Test@123'
    });
    
    
    if (userLogin.data.success && userLogin.data.data.token) {
      console.log('  ✓ User login successful'.green);
      results.passed++;
      
      const token = userLogin.data.data.token;
      const tenantId = userLogin.data.data.user.tenantId;
      
      // Test 3: Products API with tenant
      try {
        console.log('\n3. Testing Products API...'.yellow);
        const products = await axios.get(`${API_BASE_URL}/products`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId
          }
        });
        
        if (products.data.success) {
          console.log('  ✓ Products API working'.green);
          results.passed++;
        } else {
          console.log('  ✗ Products API failed'.red);
          results.failed++;
        }
      } catch (error) {
        console.log(`  ✗ Products API error: ${error.response?.status} - ${error.response?.data?.message || error.message}`.red);
        results.failed++;
        results.errors.push(`Products API: ${error.message}`);
      }
      
      // Test 4: Categories API
      try {
        console.log('\n4. Testing Categories API...'.yellow);
        const categories = await axios.get(`${API_BASE_URL}/categories`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId
          }
        });
        
        if (categories.data.success) {
          console.log('  ✓ Categories API working'.green);
          results.passed++;
        } else {
          console.log('  ✗ Categories API failed'.red);
          results.failed++;
        }
      } catch (error) {
        console.log(`  ✗ Categories API error: ${error.response?.status} - ${error.response?.data?.message || error.message}`.red);
        results.failed++;
        results.errors.push(`Categories API: ${error.message}`);
      }
      
      // Test 5: Company Settings API
      try {
        console.log('\n5. Testing Company Settings API...'.yellow);
        const companySettings = await axios.get(`${API_BASE_URL}/company-settings`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId
          }
        });
        
        if (companySettings.data.success) {
          console.log('  ✓ Company Settings API working'.green);
          results.passed++;
        } else {
          console.log('  ✗ Company Settings API failed'.red);
          results.failed++;
        }
      } catch (error) {
        console.log(`  ✗ Company Settings API error: ${error.response?.status} - ${error.response?.data?.message || error.message}`.red);
        results.failed++;
        results.errors.push(`Company Settings API: ${error.message}`);
      }
      
      // Test 6: Suppliers API
      try {
        console.log('\n6. Testing Suppliers API...'.yellow);
        const suppliers = await axios.get(`${API_BASE_URL}/suppliers`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId
          }
        });
        
        if (suppliers.data.success) {
          console.log('  ✓ Suppliers API working'.green);
          results.passed++;
        } else {
          console.log('  ✗ Suppliers API failed'.red);
          results.failed++;
        }
      } catch (error) {
        console.log(`  ✗ Suppliers API error: ${error.response?.status} - ${error.response?.data?.message || error.message}`.red);
        results.failed++;
        results.errors.push(`Suppliers API: ${error.message}`);
      }
      
      // Test 7: Inventory API
      try {
        console.log('\n7. Testing Inventory API...'.yellow);
        const inventory = await axios.get(`${API_BASE_URL}/inventory`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId
          }
        });
        
        if (inventory.data.success) {
          console.log('  ✓ Inventory API working'.green);
          results.passed++;
        } else {
          console.log('  ✗ Inventory API failed'.red);
          results.failed++;
        }
      } catch (error) {
        console.log(`  ✗ Inventory API error: ${error.response?.status} - ${error.response?.data?.message || error.message}`.red);
        results.failed++;
        results.errors.push(`Inventory API: ${error.message}`);
      }
      
      // Test 8: Warehouses API
      try {
        console.log('\n8. Testing Warehouses API...'.yellow);
        const warehouses = await axios.get(`${API_BASE_URL}/warehouses`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId
          }
        });
        
        if (warehouses.data.success) {
          console.log('  ✓ Warehouses API working'.green);
          results.passed++;
        } else {
          console.log('  ✗ Warehouses API failed'.red);
          results.failed++;
        }
      } catch (error) {
        console.log(`  ✗ Warehouses API error: ${error.response?.status} - ${error.response?.data?.message || error.message}`.red);
        results.failed++;
        results.errors.push(`Warehouses API: ${error.message}`);
      }
      
      // Test 9: Dealer Groups API
      try {
        console.log('\n9. Testing Dealer Groups API...'.yellow);
        const dealerGroups = await axios.get(`${API_BASE_URL}/dealer-groups`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': tenantId
          }
        });
        
        if (dealerGroups.data.success) {
          console.log('  ✓ Dealer Groups API working'.green);
          results.passed++;
        } else {
          console.log('  ✗ Dealer Groups API failed'.red);
          results.failed++;
        }
      } catch (error) {
        console.log(`  ✗ Dealer Groups API error: ${error.response?.status} - ${error.response?.data?.message || error.message}`.red);
        results.failed++;
        results.errors.push(`Dealer Groups API: ${error.message}`);
      }
      
    } else {
      console.log('  ✗ User login failed - no token received'.red);
      results.failed++;
    }
  } catch (error) {
    console.log(`  ✗ User login error: ${error.response?.data?.message || error.message}`.red);
    results.failed++;
    results.errors.push(`User Login: ${error.message}`);
  }
  
  // Test 10: Test without authentication (should fail)
  try {
    console.log('\n10. Testing unauthorized access...'.yellow);
    const unauthorized = await axios.get(`${API_BASE_URL}/products`);
    
    console.log('  ✗ Unauthorized access allowed (security issue)'.red);
    results.failed++;
    results.errors.push('Unauthorized access allowed');
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('  ✓ Unauthorized access properly blocked'.green);
      results.passed++;
    } else {
      console.log(`  ⚠ Unexpected error for unauthorized access: ${error.response?.status}`.yellow);
      results.failed++;
    }
  }
  
  // Results Summary
  console.log('\n' + '='.repeat(50).cyan);
  console.log('              RESULTS'.cyan.bold);
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
    console.log('✅ Application is working well!'.green.bold);
  } else if (passRate >= 70) {
    console.log('⚠️  Application has some issues that need attention'.yellow.bold);
  } else {
    console.log('❌ Application has critical issues that need immediate attention'.red.bold);
  }
  
  console.log('');
}

// Run the test
testAPI().catch(console.error);