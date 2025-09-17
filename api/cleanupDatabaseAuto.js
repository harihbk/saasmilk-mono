#!/usr/bin/env node

/**
 * Automatic Database Cleanup Script - Remove data without tenantId
 */

require('dotenv').config();
const mongoose = require('mongoose');

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
  { model: Dealer, name: 'Dealers' },
  { model: DealerGroup, name: 'DealerGroups' },
  { model: Warehouse, name: 'Warehouses' },
  { model: Route, name: 'Routes' },
  { model: Role, name: 'Roles' }
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

async function cleanupData(validTenantIds) {
  console.log(`\n${colors.yellow}Starting automatic cleanup...${colors.reset}\n`);
  
  const results = {
    deleted: 0,
    errors: []
  };
  
  for (const collection of collections) {
    console.log(`Processing ${collection.name}...`);
    
    try {
      let deleteQuery;
      
      if (collection.name === 'Roles') {
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
      
      const deleteResult = await collection.model.deleteMany(deleteQuery);
      results.deleted += deleteResult.deletedCount;
      console.log(`  ${colors.red}✓ Deleted ${deleteResult.deletedCount} documents${colors.reset}`);
      
    } catch (error) {
      results.errors.push({ collection: collection.name, error: error.message });
      console.error(`  ${colors.red}✗ Error: ${error.message}${colors.reset}`);
    }
  }
  
  return results;
}

async function main() {
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}        Automatic Database TenantId Cleanup${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  
  await connectDB();
  
  // Get valid tenant IDs
  const validTenantIds = await getValidTenants();
  
  if (validTenantIds.length === 0) {
    console.log(`${colors.red}\n✗ No active tenants found. Please ensure companies exist in the database.${colors.reset}`);
    process.exit(1);
  }
  
  // Clean up data
  const results = await cleanupData(validTenantIds);
  
  // Show results
  console.log(`\n${colors.green}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}                    RESULTS${colors.reset}`);
  console.log(`${colors.green}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`Total documents deleted: ${results.deleted}`);
  
  if (results.errors.length > 0) {
    console.log(`${colors.red}Errors encountered:${colors.reset}`);
    results.errors.forEach(e => {
      console.log(`  - ${e.collection}: ${e.error}`);
    });
  }
  
  if (results.deleted > 0) {
    console.log(`\n${colors.green}✓ Database cleanup completed successfully!${colors.reset}`);
  } else {
    console.log(`\n${colors.blue}ℹ No documents needed cleanup.${colors.reset}`);
  }
  
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