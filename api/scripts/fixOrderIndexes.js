require('dotenv').config();
const mongoose = require('mongoose');

async function fixOrderIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
    console.log('✓ Connected to MongoDB');

    const Order = mongoose.connection.collection('orders');
    
    console.log('\n📋 Current Order indexes:');
    const currentIndexes = await Order.getIndexes();
    Object.keys(currentIndexes).forEach(indexName => {
      console.log(`  ${indexName}: ${JSON.stringify(currentIndexes[indexName])}`);
    });

    console.log('\n🔧 Dropping problematic orderNumber index...');
    
    try {
      // Drop the non-tenant-aware orderNumber index
      await Order.dropIndex('orderNumber_1');
      console.log('✅ Dropped orderNumber_1 index');
    } catch (error) {
      console.log(`⚠️  Could not drop orderNumber_1: ${error.message}`);
    }

    console.log('\n📋 Order indexes after cleanup:');
    const finalIndexes = await Order.getIndexes();
    Object.keys(finalIndexes).forEach(indexName => {
      console.log(`  ${indexName}: ${JSON.stringify(finalIndexes[indexName])}`);
    });

    // Verify the correct composite index exists
    if (finalIndexes['orderNumber_1_tenantId_1']) {
      console.log('\n✅ Tenant-aware orderNumber composite index is in place');
    } else {
      console.log('\n❌ Missing required tenant-aware orderNumber index');
    }

    mongoose.disconnect();
    console.log('\n✅ Order index cleanup completed successfully');

  } catch (error) {
    console.error('❌ Error fixing Order indexes:', error);
    mongoose.disconnect();
  }
}

fixOrderIndexes();