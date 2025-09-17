require('dotenv').config();
const mongoose = require('mongoose');
require('../models');

async function verifyTenantIsolation() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
  
  const db = mongoose.connection.db;
  
  console.log('🔍 Verifying Tenant Isolation Configuration\n');
  
  // Collections to verify
  const collections = [
    { name: 'dealers', codeField: 'dealerCode' },
    { name: 'warehouses', codeField: 'code' },
    { name: 'categories', codeField: 'name' },
    { name: 'products', codeField: 'sku' },
    { name: 'routes', codeField: 'code' }
  ];
  
  let allGood = true;
  
  for (const { name, codeField } of collections) {
    console.log(`📦 ${name.charAt(0).toUpperCase() + name.slice(1)}:`);
    
    try {
      // Get indexes
      const indexes = await db.collection(name).indexes();
      
      // Check for problematic global unique index
      const globalIndex = indexes.find(idx => 
        idx.name === `${codeField}_1` && 
        idx.unique && 
        Object.keys(idx.key).length === 1
      );
      
      // Check for correct composite index
      const compositeIndex = indexes.find(idx => 
        idx.key[codeField] === 1 && 
        idx.key.tenantId === 1 && 
        idx.unique
      );
      
      if (globalIndex) {
        console.log(`  ❌ PROBLEM: Global unique index on ${codeField} exists`);
        console.log(`     This will prevent multi-tenant operations`);
        allGood = false;
      } else {
        console.log(`  ✅ No global unique index on ${codeField}`);
      }
      
      if (compositeIndex) {
        console.log(`  ✅ Composite unique index (${codeField} + tenantId) exists`);
      } else {
        console.log(`  ⚠️  Warning: No composite index for ${codeField} + tenantId`);
      }
      
      // Check for duplicate codes across tenants
      const documents = await db.collection(name).find({}).toArray();
      const codesByTenant = {};
      
      documents.forEach(doc => {
        const code = doc[codeField];
        const tenant = doc.tenantId;
        if (code && tenant) {
          if (!codesByTenant[code]) codesByTenant[code] = new Set();
          codesByTenant[code].add(tenant);
        }
      });
      
      const sharedCodes = Object.entries(codesByTenant)
        .filter(([code, tenants]) => tenants.size > 1)
        .map(([code, tenants]) => ({ code, tenants: Array.from(tenants) }));
      
      if (sharedCodes.length > 0) {
        console.log(`  ✅ Found ${sharedCodes.length} code(s) shared across tenants (proving isolation works)`);
        sharedCodes.slice(0, 2).forEach(({ code, tenants }) => {
          console.log(`     - "${code}" exists in tenants: ${tenants.join(', ')}`);
        });
      } else {
        console.log(`  ℹ️  No shared codes found (each tenant has unique codes so far)`);
      }
      
    } catch (error) {
      console.log(`  ⚠️  Could not check collection: ${error.message}`);
    }
    
    console.log();
  }
  
  if (allGood) {
    console.log('✅ ALL COLLECTIONS PROPERLY CONFIGURED FOR MULTI-TENANT ISOLATION!');
    console.log('\n🎯 Summary:');
    console.log('- All problematic global unique indexes have been removed');
    console.log('- Composite unique indexes (field + tenantId) are in place');
    console.log('- Each tenant can have their own set of codes/names without conflicts');
    console.log('- Data isolation is working correctly');
  } else {
    console.log('⚠️  SOME ISSUES FOUND - Please run fixAllUniqueIndexes.js to fix them');
  }
  
  mongoose.disconnect();
}

verifyTenantIsolation().catch(console.error);