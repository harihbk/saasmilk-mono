#!/usr/bin/env node

/**
 * Database Cleanup Script for Cross-Tenant Data
 * This script identifies and removes any cross-tenant data contamination
 * Run with: node scripts/cleanupCrossTenantData.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

// Import all models
const Company = require('../api/models/Company');
const User = require('../api/models/User');
const Product = require('../api/models/Product');
const Category = require('../api/models/Category');
const Customer = require('../api/models/Customer');
const Dealer = require('../api/models/Dealer');
const DealerGroup = require('../api/models/DealerGroup');
const Order = require('../api/models/Order');
const Supplier = require('../api/models/Supplier');
const Warehouse = require('../api/models/Warehouse');
const Inventory = require('../api/models/Inventory');
const Route = require('../api/models/Route');
const Billing = require('../api/models/Billing');
const Role = require('../api/models/Role');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

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
    const companies = await Company.find({ isActive: true }, 'tenantId companyName');
    const tenantIds = companies.map(c => c.tenantId);
    console.log(`\n${colors.cyan}Found ${companies.length} active tenants:${colors.reset}`);
    companies.forEach(c => {
      console.log(`  - ${c.tenantId}: ${c.companyName}`);
    });
    return tenantIds;
  } catch (error) {
    console.error(`${colors.red}Error fetching tenants:${colors.reset}`, error);
    return [];
  }
}

async function analyzeData(validTenantIds) {
  console.log(`\n${colors.yellow}Analyzing data for tenant isolation issues...${colors.reset}\n`);
  
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
      
      // Get sample of documents with issues
      const problematicDocs = await collection.model.find({
        $or: [
          { tenantId: { $exists: false } },
          { tenantId: null },
          { tenantId: '' },
          { tenantId: { $nin: validTenantIds } }
        ]
      }).limit(5).select('_id tenantId');
      
      if (noTenantCount > 0 || invalidTenantCount > 0) {
        issues.push({
          collection: collection.name,
          model: collection.model,
          totalCount,
          noTenantCount,
          invalidTenantCount,
          sampleIds: problematicDocs.map(d => d._id)
        });
        
        console.log(`${colors.red}✗ ${collection.name}:${colors.reset}`);
        console.log(`  Total documents: ${totalCount}`);
        console.log(`  Missing tenantId: ${noTenantCount}`);
        console.log(`  Invalid tenantId: ${invalidTenantCount}`);
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
    fixed: 0,
    errors: []
  };
  
  for (const issue of issues) {
    console.log(`\nProcessing ${issue.collection}...`);
    
    try {
      if (mode === 'delete') {
        // Delete documents without valid tenantId
        const deleteResult = await issue.model.deleteMany({
          $or: [
            { tenantId: { $exists: false } },
            { tenantId: null },
            { tenantId: '' },
            { tenantId: { $nin: validTenantIds } }
          ]
        });
        
        results.deleted += deleteResult.deletedCount;
        console.log(`  ${colors.red}Deleted ${deleteResult.deletedCount} documents${colors.reset}`);
        
      } else if (mode === 'fix' && validTenantIds.length === 1) {
        // If there's only one tenant, assign all orphaned data to it
        const updateResult = await issue.model.updateMany(
          {
            $or: [
              { tenantId: { $exists: false } },
              { tenantId: null },
              { tenantId: '' },
              { tenantId: { $nin: validTenantIds } }
            ]
          },
          { $set: { tenantId: validTenantIds[0] } }
        );
        
        results.fixed += updateResult.modifiedCount;
        console.log(`  ${colors.green}Fixed ${updateResult.modifiedCount} documents (assigned to ${validTenantIds[0]})${colors.reset}`);
        
      } else if (mode === 'dry-run') {
        console.log(`  ${colors.cyan}Would affect ${issue.noTenantCount + issue.invalidTenantCount} documents${colors.reset}`);
      }
    } catch (error) {
      results.errors.push({ collection: issue.collection, error: error.message });
      console.error(`  ${colors.red}Error: ${error.message}${colors.reset}`);
    }
  }
  
  return results;
}

async function main() {
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}     Cross-Tenant Data Cleanup Tool${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  
  await connectDB();
  
  // Get valid tenant IDs
  const validTenantIds = await getValidTenants();
  
  if (validTenantIds.length === 0) {
    console.log(`${colors.red}\n✗ No active tenants found. Please ensure companies exist in the database.${colors.reset}`);
    process.exit(1);
  }
  
  // Analyze data
  const issues = await analyzeData(validTenantIds);
  
  if (issues.length === 0) {
    console.log(`\n${colors.green}✓ No tenant isolation issues found! Database is clean.${colors.reset}`);
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
  console.log('1. Dry run (show what would be affected)');
  console.log('2. Delete all orphaned data');
  if (validTenantIds.length === 1) {
    console.log(`3. Fix by assigning to tenant: ${validTenantIds[0]}`);
  }
  console.log('0. Exit');
  
  const choice = await question('\nEnter your choice (0-3): ');
  
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
      
    case '3':
      if (validTenantIds.length === 1) {
        const confirmFix = await question(`\n${colors.yellow}This will assign ${totalProblematic} documents to tenant ${validTenantIds[0]}. Continue? (yes/no): ${colors.reset}`);
        if (confirmFix.toLowerCase() === 'yes') {
          results = await cleanupData(issues, validTenantIds, 'fix');
        } else {
          console.log('Operation cancelled.');
        }
      } else {
        console.log('Invalid choice.');
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
    console.log(`Documents fixed: ${results.fixed}`);
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