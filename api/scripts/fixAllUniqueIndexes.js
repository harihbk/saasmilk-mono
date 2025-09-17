require('dotenv').config();
const mongoose = require('mongoose');

async function fixAllUniqueIndexes() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
  
  const db = mongoose.connection.db;
  
  // Collections to check for tenant-specific unique indexes
  const collectionsToFix = [
    { 
      collection: 'products', 
      fields: ['sku', 'name'],
      message: 'Products'
    },
    { 
      collection: 'routes', 
      fields: ['code', 'name'],
      message: 'Routes'
    },
    { 
      collection: 'suppliers', 
      fields: ['code', 'name'],
      message: 'Suppliers'
    },
    { 
      collection: 'customers', 
      fields: ['customerCode'],
      message: 'Customers'
    }
  ];
  
  console.log('🔧 Checking and fixing unique indexes across all collections...\n');
  
  for (const { collection, fields, message } of collectionsToFix) {
    try {
      const indexes = await db.collection(collection).indexes();
      console.log(`📦 ${message} (${collection}):`);
      
      let hasIssues = false;
      let droppedIndexes = [];
      
      for (const field of fields) {
        const globalIndex = indexes.find(idx => 
          idx.name === `${field}_1` && 
          idx.unique && 
          Object.keys(idx.key).length === 1
        );
        
        const compositeIndex = indexes.find(idx => 
          idx.key[field] === 1 && 
          idx.key.tenantId === 1 && 
          idx.unique
        );
        
        if (globalIndex) {
          hasIssues = true;
          try {
            await db.collection(collection).dropIndex(`${field}_1`);
            droppedIndexes.push(`${field}_1`);
            console.log(`  ❌ Found and dropped global unique index: ${field}_1`);
          } catch (e) {
            console.log(`  ⚠️  Could not drop ${field}_1: ${e.message}`);
          }
        }
        
        if (!compositeIndex) {
          console.log(`  ⚠️  Missing composite index for ${field} with tenantId`);
          // We could create it here, but better to let the model definitions handle it
        } else {
          console.log(`  ✅ Composite index exists: ${field}_1_tenantId_1`);
        }
      }
      
      if (!hasIssues) {
        console.log(`  ✅ All indexes correctly configured`);
      }
      
    } catch (error) {
      console.log(`  ⚠️  Collection ${collection} not found or error: ${error.message}`);
    }
    
    console.log();
  }
  
  console.log('✅ Index check and fix completed!');
  console.log('\n📝 Summary:');
  console.log('- Removed global unique indexes that were preventing multi-tenant operations');
  console.log('- Kept composite unique indexes (field + tenantId) for proper tenant isolation');
  console.log('- Each tenant can now have their own unique codes/names without conflicts');
  
  mongoose.disconnect();
}

fixAllUniqueIndexes().catch(console.error);