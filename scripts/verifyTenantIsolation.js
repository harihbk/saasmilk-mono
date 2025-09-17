#!/usr/bin/env node

/**
 * Tenant Isolation Verification Script
 * This script verifies that tenant isolation is working correctly
 * Run with: node scripts/verifyTenantIsolation.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');

// Import models for direct database checks
const Company = require('../api/models/Company');
const User = require('../api/models/User');
const Product = require('../api/models/Product');
const Category = require('../api/models/Category');
const Customer = require('../api/models/Customer');
const Dealer = require('../api/models/Dealer');
const Order = require('../api/models/Order');
const Supplier = require('../api/models/Supplier');
const Warehouse = require('../api/models/Warehouse');
const Inventory = require('../api/models/Inventory');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const API_BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`${colors.green}✓ Connected to MongoDB${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ MongoDB connection error:${colors.reset}`, error);
    process.exit(1);
  }
}

async function createTestData() {
  console.log(`\n${colors.cyan}Creating test data for verification...${colors.reset}`);
  
  try {
    // Create two test companies if they don't exist
    let company1 = await Company.findOne({ tenantId: 'TEST001' });
    if (!company1) {
      company1 = await Company.create({
        tenantId: 'TEST001',
        companyName: 'Test Company 1',
        email: 'test1@example.com',
        phone: '+1234567890',
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
    
    let company2 = await Company.findOne({ tenantId: 'TEST002' });
    if (!company2) {
      company2 = await Company.create({
        tenantId: 'TEST002',
        companyName: 'Test Company 2',
        email: 'test2@example.com',
        phone: '+0987654321',
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
    
    // Create test users for each company
    let user1 = await User.findOne({ email: 'user1@test.com' });
    if (!user1) {
      user1 = await User.create({
        name: 'Test User 1',
        email: 'user1@test.com',
        password: 'Test@123',
        role: 'admin',
        tenantId: 'TEST001'
      });
    }
    
    let user2 = await User.findOne({ email: 'user2@test.com' });
    if (!user2) {
      user2 = await User.create({
        name: 'Test User 2',
        email: 'user2@test.com',
        password: 'Test@123',
        role: 'admin',
        tenantId: 'TEST002'
      });
    }
    
    // Create test products for each tenant
    await Product.findOneAndUpdate(
      { name: 'Test Product 1', tenantId: 'TEST001' },
      {
        name: 'Test Product 1',
        tenantId: 'TEST001',
        sku: 'TST001-P1',
        category: 'test',
        brand: 'Test Brand',
        description: 'Test product for tenant 1',
        unit: 'liters',
        packSize: 1,
        pricing: {
          basePrice: 100,
          currency: 'INR'
        },
        status: 'active',
        createdBy: user1._id
      },
      { upsert: true, new: true }
    );
    
    await Product.findOneAndUpdate(
      { name: 'Test Product 2', tenantId: 'TEST002' },
      {
        name: 'Test Product 2',
        tenantId: 'TEST002',
        sku: 'TST002-P1',
        category: 'test',
        brand: 'Test Brand',
        description: 'Test product for tenant 2',
        unit: 'liters',
        packSize: 1,
        pricing: {
          basePrice: 150,
          currency: 'INR'
        },
        status: 'active',
        createdBy: user2._id
      },
      { upsert: true, new: true }
    );
    
    console.log(`${colors.green}✓ Test data created successfully${colors.reset}`);
    
    return {
      tenant1: { company: company1, user: user1 },
      tenant2: { company: company2, user: user2 }
    };
    
  } catch (error) {
    console.error(`${colors.red}Error creating test data:${colors.reset}`, error);
    throw error;
  }
}

async function verifyDatabaseIsolation() {
  console.log(`\n${colors.yellow}Verifying database-level tenant isolation...${colors.reset}\n`);
  
  const models = [
    { model: Product, name: 'Products' },
    { model: Category, name: 'Categories' },
    { model: Customer, name: 'Customers' },
    { model: Dealer, name: 'Dealers' },
    { model: Order, name: 'Orders' },
    { model: Supplier, name: 'Suppliers' },
    { model: Warehouse, name: 'Warehouses' },
    { model: Inventory, name: 'Inventory' }
  ];
  
  const results = [];
  
  for (const { model, name } of models) {
    try {
      // Check if all documents have tenantId
      const totalCount = await model.countDocuments();
      const withTenantCount = await model.countDocuments({ 
        tenantId: { $exists: true, $ne: null, $ne: '' }
      });
      
      const hasIsolation = totalCount === withTenantCount;
      
      results.push({
        collection: name,
        totalCount,
        withTenantCount,
        hasIsolation,
        percentage: totalCount > 0 ? ((withTenantCount / totalCount) * 100).toFixed(2) : 100
      });
      
      if (hasIsolation) {
        console.log(`${colors.green}✓ ${name}: All ${totalCount} documents have tenantId (100%)${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ ${name}: Only ${withTenantCount}/${totalCount} documents have tenantId (${results[results.length-1].percentage}%)${colors.reset}`);
      }
      
    } catch (error) {
      console.error(`${colors.red}  Error checking ${name}:${colors.reset}`, error.message);
    }
  }
  
  return results;
}

async function verifyAPIIsolation(testData) {
  console.log(`\n${colors.yellow}Verifying API-level tenant isolation...${colors.reset}\n`);
  
  const results = {
    passed: [],
    failed: []
  };
  
  try {
    // Login as user1 (tenant TEST001)
    const login1 = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'user1@test.com',
      password: 'Test@123'
    });
    const token1 = login1.data.token;
    
    // Login as user2 (tenant TEST002)
    const login2 = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'user2@test.com',
      password: 'Test@123'
    });
    const token2 = login2.data.token;
    
    // Test endpoints for tenant isolation
    const endpoints = [
      { path: '/products', name: 'Products' },
      { path: '/customers', name: 'Customers' },
      { path: '/suppliers', name: 'Suppliers' },
      { path: '/orders', name: 'Orders' },
      { path: '/inventory', name: 'Inventory' },
      { path: '/warehouses', name: 'Warehouses' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        // User1 should only see TEST001 data
        const response1 = await axios.get(`${API_BASE_URL}${endpoint.path}`, {
          headers: {
            'Authorization': `Bearer ${token1}`,
            'x-tenant-id': 'TEST001'
          }
        });
        
        // User2 should only see TEST002 data
        const response2 = await axios.get(`${API_BASE_URL}${endpoint.path}`, {
          headers: {
            'Authorization': `Bearer ${token2}`,
            'x-tenant-id': 'TEST002'
          }
        });
        
        // Verify isolation
        const data1 = response1.data.data[Object.keys(response1.data.data)[0]] || [];
        const data2 = response2.data.data[Object.keys(response2.data.data)[0]] || [];
        
        // Check if any TEST002 data leaked to user1
        const leaked1 = Array.isArray(data1) && data1.some(item => item.tenantId === 'TEST002');
        // Check if any TEST001 data leaked to user2
        const leaked2 = Array.isArray(data2) && data2.some(item => item.tenantId === 'TEST001');
        
        if (!leaked1 && !leaked2) {
          console.log(`${colors.green}✓ ${endpoint.name}: API isolation working correctly${colors.reset}`);
          results.passed.push(endpoint.name);
        } else {
          console.log(`${colors.red}✗ ${endpoint.name}: API isolation FAILED - cross-tenant data leak detected${colors.reset}`);
          results.failed.push(endpoint.name);
        }
        
      } catch (error) {
        console.log(`${colors.yellow}⚠ ${endpoint.name}: Could not verify (${error.response?.status || error.message})${colors.reset}`);
      }
    }
    
  } catch (error) {
    console.error(`${colors.red}Error during API verification:${colors.reset}`, error.message);
  }
  
  return results;
}

async function generateReport(dbResults, apiResults) {
  console.log(`\n${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}           TENANT ISOLATION VERIFICATION REPORT${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  
  // Database isolation summary
  console.log(`\n${colors.cyan}Database Isolation:${colors.reset}`);
  const dbPassed = dbResults.filter(r => r.hasIsolation).length;
  const dbTotal = dbResults.length;
  console.log(`  Collections with full isolation: ${dbPassed}/${dbTotal}`);
  
  if (dbPassed < dbTotal) {
    console.log(`\n  ${colors.red}Collections needing attention:${colors.reset}`);
    dbResults.filter(r => !r.hasIsolation).forEach(r => {
      console.log(`    - ${r.collection}: ${r.percentage}% isolated`);
    });
  }
  
  // API isolation summary
  console.log(`\n${colors.cyan}API Isolation:${colors.reset}`);
  console.log(`  Endpoints passed: ${apiResults.passed.length}`);
  console.log(`  Endpoints failed: ${apiResults.failed.length}`);
  
  if (apiResults.failed.length > 0) {
    console.log(`\n  ${colors.red}Failed endpoints:${colors.reset}`);
    apiResults.failed.forEach(e => {
      console.log(`    - ${e}`);
    });
  }
  
  // Overall verdict
  console.log(`\n${colors.yellow}═══════════════════════════════════════════════════════${colors.reset}`);
  
  const allPassed = dbPassed === dbTotal && apiResults.failed.length === 0;
  
  if (allPassed) {
    console.log(`${colors.green}✓ VERIFICATION PASSED: Tenant isolation is working correctly!${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ VERIFICATION FAILED: Tenant isolation issues detected.${colors.reset}`);
    console.log(`\n${colors.yellow}Recommended actions:${colors.reset}`);
    console.log('1. Run the cleanup script: node scripts/cleanupCrossTenantData.js');
    console.log('2. Review the route files for missing tenant middleware');
    console.log('3. Check model hooks for proper tenantId assignment');
  }
  
  console.log(`${colors.yellow}═══════════════════════════════════════════════════════${colors.reset}`);
}

async function main() {
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}       Tenant Isolation Verification Tool${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  
  await connectDB();
  
  // Create test data
  const testData = await createTestData();
  
  // Verify database isolation
  const dbResults = await verifyDatabaseIsolation();
  
  // Verify API isolation
  const apiResults = await verifyAPIIsolation(testData);
  
  // Generate report
  await generateReport(dbResults, apiResults);
  
  process.exit(0);
}

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error(`${colors.red}Unhandled rejection:${colors.reset}`, err);
  process.exit(1);
});

// Run the script
main().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});