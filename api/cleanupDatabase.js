#!/usr/bin/env node

/**
 * Database Cleanup Script - Remove data without tenantId
 * This script removes all documents that don't have a tenantId field
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

// Import all models
const Company = require('./models/Company');
const User = require('./models/User');
const Product = require('./models/Product');
const Category = require('./models/Category');
const Customer = require('./models/Customer');
const Dealer = require('./models/Dealer');
const DealerGroup = require('./models/DealerGroup');
const Order = require('./models/Order');
const Supplier = require('./models/Supplier');
const Warehouse = require('./models/Warehouse');
const Inventory = require('./models/Inventory');
const Route = require('./models/Route');
const Billing = require('./models/Billing');
const Role = require('./models/Role');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Collections to check and clean
const collections = [
  { model: Product, name: 'Products' },
  { model: Category, name: 'Categories' },
  { model: Customer, name: 'Customers' },
  { model: Dealer, name: 'Dealers' },
  { model: DealerGroup, name: 'DealerGroups' },
  { model: Order, name: 'Orders' },
  { model: Supplier, name: 'Suppliers' },
  { model: Warehouse, name: 'Warehouses' },
  { model: Inventory, name: 'Inventory' },
  { model: Route, name: 'Routes' },
  { model: Billing, name: 'Billing' },
  { model: Role, name: 'Roles' },
  { model: User, name: 'Users' }
];

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

async function getValidTenants() {
  try {
    const companies = await Company.find({ isActive: true }, 'tenantId name');
    const tenantIds = companies.map(c => c.tenantId);
    console.log(`\n${colors.cyan}Found ${companies.length} active tenants:${colors.reset}`);
    companies.forEach(c => {
      console.log(`  - ${c.tenantId}: ${c.name}`);
    });
    return tenantIds;
  } catch (error) {
    console.error(`${colors.red}Error fetching tenants:${colors.reset}`, error);
    return [];
  }
}

async function analyzeData(validTenantIds) {
  console.log(`\n${colors.yellow}Analyzing data for tenantId issues...${colors.reset}\n`);
  
  const issues = [];
  
  for (const collection of collections) {
    try {
      // Count total documents
      const totalCount = await collection.model.countDocuments();
      
      // Count documents without tenantId
      const noTenantCount = await collection.model.countDocuments({ 
        $or: [
          { tenantId: { $exists: false } },
          { tenantId: null },
          { tenantId: '' }
        ]
      });
      
      // Count documents with invalid tenantId
      const invalidTenantCount = await collection.model.countDocuments({
        tenantId: { 
          $exists: true,
          $nin: [...validTenantIds, null, '']
        }
      });
      
      // Special handling for Roles (can have system roles)
      let systemRolesCount = 0;
      if (collection.name === 'Roles') {
        systemRolesCount = await collection.model.countDocuments({
          isSystem: true,
          $or: [
            { tenantId: { $exists: false } },
            { tenantId: null },
            { tenantId: '' }
          ]
        });
      }
      
      // Adjust counts for system roles
      const actualNoTenantCount = collection.name === 'Roles' 
        ? noTenantCount - systemRolesCount 
        : noTenantCount;
      
      if (actualNoTenantCount > 0 || invalidTenantCount > 0) {
        issues.push({
          collection: collection.name,
          model: collection.model,
          totalCount,
          noTenantCount: actualNoTenantCount,
          invalidTenantCount,
          systemRolesCount: collection.name === 'Roles' ? systemRolesCount : 0
        });
        
        console.log(`${colors.red}✗ ${collection.name}:${colors.reset}`);
        console.log(`  Total documents: ${totalCount}`);
        if (actualNoTenantCount > 0) {
          console.log(`  Missing tenantId: ${actualNoTenantCount}`);
        }
        if (invalidTenantCount > 0) {
          console.log(`  Invalid tenantId: ${invalidTenantCount}`);
        }
        if (systemRolesCount > 0) {
          console.log(`  System roles (OK): ${systemRolesCount}`);
        }
      } else {
        console.log(`${colors.green}✓ ${collection.name}: Clean (${totalCount} documents)${colors.reset}`);
      }
    } catch (error) {
      console.error(`${colors.red}  Error analyzing ${collection.name}:${colors.reset}`, error.message);
    }
  }
  
  return issues;
}

async function cleanupData(issues, validTenantIds, mode = 'dry-run') {
  console.log(`\n${colors.yellow}Starting cleanup in ${mode.toUpperCase()} mode...${colors.reset}\n`);
  
  const results = {
    deleted: 0,
    errors: []
  };
  
  for (const issue of issues) {
    console.log(`\nProcessing ${issue.collection}...`);
    
    try {
      let deleteQuery;
      
      if (issue.collection === 'Roles') {
        // For roles, only delete non-system roles without valid tenantId
        deleteQuery = {
          $and: [
            { isSystem: { $ne: true } },
            {
              $or: [
                { tenantId: { $exists: false } },
                { tenantId: null },
                { tenantId: '' },
                { tenantId: { $nin: validTenantIds } }
              ]
            }
          ]
        };
      } else {
        // For other collections, delete all without valid tenantId
        deleteQuery = {
          $or: [
            { tenantId: { $exists: false } },
            { tenantId: null },
            { tenantId: '' },
            { tenantId: { $nin: validTenantIds } }
          ]
        };
      }
      
      if (mode === 'delete') {
        const deleteResult = await issue.model.deleteMany(deleteQuery);
        results.deleted += deleteResult.deletedCount;
        console.log(`  ${colors.red}Deleted ${deleteResult.deletedCount} documents${colors.reset}`);
      } else if (mode === 'dry-run') {
        const countResult = await issue.model.countDocuments(deleteQuery);
        console.log(`  ${colors.cyan}Would delete ${countResult} documents${colors.reset}`);
      }
      
    } catch (error) {
      results.errors.push({ collection: issue.collection, error: error.message });
      console.error(`  ${colors.red}Error: ${error.message}${colors.reset}`);
    }
  }
  
  return results;
}

async function verifyAllModelsHaveTenantId() {
  console.log(`\n${colors.yellow}Verifying all models have tenantId field...${colors.reset}\n`);
  
  const models = [
    { model: Product, name: 'Product' },
    { model: Category, name: 'Category' },
    { model: Customer, name: 'Customer' },
    { model: Dealer, name: 'Dealer' },
    { model: DealerGroup, name: 'DealerGroup' },
    { model: Order, name: 'Order' },
    { model: Supplier, name: 'Supplier' },
    { model: Warehouse, name: 'Warehouse' },
    { model: Inventory, name: 'Inventory' },
    { model: Route, name: 'Route' },
    { model: Billing, name: 'Billing' },
    { model: Role, name: 'Role' },
    { model: User, name: 'User' },
    { model: Company, name: 'Company' }
  ];
  
  for (const { model, name } of models) {
    const schema = model.schema;
    const hasTenantId = schema.paths.tenantId !== undefined;
    
    if (hasTenantId) {
      const tenantIdPath = schema.paths.tenantId;
      const isRequired = tenantIdPath.isRequired;
      const hasIndex = tenantIdPath.options.index;
      
      console.log(`${colors.green}✓ ${name}: tenantId field present${colors.reset}`);
      console.log(`  Required: ${isRequired ? 'Yes' : 'No'}`);
      console.log(`  Indexed: ${hasIndex ? 'Yes' : 'No'}`);
    } else {
      console.log(`${colors.red}✗ ${name}: tenantId field MISSING${colors.reset}`);
    }
  }
}

async function main() {
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}           Database TenantId Cleanup Tool${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  
  await connectDB();
  
  // Verify all models have tenantId
  await verifyAllModelsHaveTenantId();
  
  // Get valid tenant IDs
  const validTenantIds = await getValidTenants();
  
  if (validTenantIds.length === 0) {
    console.log(`${colors.red}\n✗ No active tenants found. Please ensure companies exist in the database.${colors.reset}`);
    process.exit(1);
  }
  
  // Analyze data
  const issues = await analyzeData(validTenantIds);
  
  if (issues.length === 0) {
    console.log(`\n${colors.green}✓ No tenantId issues found! Database is clean.${colors.reset}`);
    process.exit(0);
  }
  
  // Show summary
  console.log(`\n${colors.yellow}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.yellow}                    SUMMARY${colors.reset}`);
  console.log(`${colors.yellow}═══════════════════════════════════════════════════════${colors.reset}`);
  
  let totalProblematic = 0;
  issues.forEach(issue => {
    const count = issue.noTenantCount + issue.invalidTenantCount;
    totalProblematic += count;
    console.log(`${issue.collection}: ${count} problematic documents`);
  });
  
  console.log(`\n${colors.red}Total problematic documents: ${totalProblematic}${colors.reset}`);
  
  // Ask user what to do
  console.log(`\n${colors.cyan}What would you like to do?${colors.reset}`);
  console.log('1. Dry run (show what would be deleted)');
  console.log('2. Delete all documents without valid tenantId');
  console.log('0. Exit');
  
  const choice = await question('\nEnter your choice (0-2): ');
  
  let results;
  switch (choice) {
    case '1':
      results = await cleanupData(issues, validTenantIds, 'dry-run');
      break;
      
    case '2':
      const confirmDelete = await question(`\n${colors.red}⚠️  This will DELETE ${totalProblematic} documents. Are you sure? (yes/no): ${colors.reset}`);
      if (confirmDelete.toLowerCase() === 'yes') {
        results = await cleanupData(issues, validTenantIds, 'delete');
      } else {
        console.log('Operation cancelled.');
      }
      break;
      
    default:
      console.log('Exiting...');
  }
  
  // Show results
  if (results) {
    console.log(`\n${colors.green}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}                    RESULTS${colors.reset}`);
    console.log(`${colors.green}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`Documents deleted: ${results.deleted}`);
    if (results.errors.length > 0) {
      console.log(`${colors.red}Errors encountered:${colors.reset}`);
      results.errors.forEach(e => {
        console.log(`  - ${e.collection}: ${e.error}`);
      });
    }
  }
  
  rl.close();
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