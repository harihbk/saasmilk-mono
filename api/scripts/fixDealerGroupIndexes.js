require('dotenv').config();
const mongoose = require('mongoose');

async function fixIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
    console.log('✓ Connected to MongoDB');

    const DealerGroup = mongoose.connection.collection('dealergroups');
    
    console.log('\n📋 Current indexes:');
    const currentIndexes = await DealerGroup.getIndexes();
    Object.keys(currentIndexes).forEach(indexName => {
      console.log(`  ${indexName}: ${JSON.stringify(currentIndexes[indexName])}`);
    });

    console.log('\n🔧 Dropping problematic indexes...');
    
    try {
      // Drop the non-tenant-aware indexes
      await DealerGroup.dropIndex('name_1');
      console.log('✅ Dropped name_1 index');
    } catch (error) {
      console.log(`⚠️  Could not drop name_1: ${error.message}`);
    }

    try {
      await DealerGroup.dropIndex('code_1');
      console.log('✅ Dropped code_1 index');
    } catch (error) {
      console.log(`⚠️  Could not drop code_1: ${error.message}`);
    }

    console.log('\n📋 Indexes after cleanup:');
    const finalIndexes = await DealerGroup.getIndexes();
    Object.keys(finalIndexes).forEach(indexName => {
      console.log(`  ${indexName}: ${JSON.stringify(finalIndexes[indexName])}`);
    });

    // Verify the correct composite indexes exist
    const expectedIndexes = ['name_1_tenantId_1', 'code_1_tenantId_1'];
    const hasCorrectIndexes = expectedIndexes.every(index => finalIndexes[index]);
    
    if (hasCorrectIndexes) {
      console.log('\n✅ All tenant-aware composite indexes are in place');
    } else {
      console.log('\n❌ Missing required tenant-aware indexes');
      console.log('Expected:', expectedIndexes);
      console.log('Found:', Object.keys(finalIndexes).filter(name => name.includes('tenantId')));
    }

    mongoose.disconnect();
    console.log('\n✅ Index cleanup completed successfully');

  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    mongoose.disconnect();
  }
}

fixIndexes();