require('dotenv').config();
const mongoose = require('mongoose');
require('../models');
const Dealer = require('../models/Dealer');
const DealerGroup = require('../models/DealerGroup');
const User = require('../models/User');

async function testMultiTenantDealerCreation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
    console.log('✓ Connected to MongoDB');

    // Create test data for two tenants
    const tenants = ['001', '002', '003'];
    
    for (const tenantId of tenants) {
      console.log(`\n🏢 Testing Tenant: ${tenantId}`);
      
      // Find or create a dealer group for this tenant
      let dealerGroup = await DealerGroup.findOne({ tenantId });
      if (!dealerGroup) {
        // Find a user for this tenant to create the group
        let user = await User.findOne({ tenantId });
        if (!user) {
          console.log(`  ⚠️  No user found for tenant ${tenantId}, creating test user`);
          user = await User.create({
            name: `Test User ${tenantId}`,
            email: `test${tenantId}@example.com`,
            password: 'password123',
            role: 'admin',
            tenantId: tenantId
          });
        }
        
        dealerGroup = await DealerGroup.create({
          name: 'Default Group',
          code: `DG${tenantId}`,
          description: 'Default dealer group',
          tenantId: tenantId,
          createdBy: user._id
        });
        console.log(`  ✓ Created dealer group: ${dealerGroup.name}`);
      } else {
        console.log(`  ✓ Found existing dealer group: ${dealerGroup.name}`);
      }
      
      // Try to create a dealer with code DLR250801 for each tenant
      const dealerData = {
        name: `Test Dealer ${tenantId}`,
        dealerCode: 'DLR250801', // Same code for each tenant
        dealerGroup: dealerGroup._id,
        contactInfo: {
          primaryPhone: '9876543210'
        },
        address: {
          street: '123 Test Street',
          city: 'Test City',
          state: 'Test State',
          postalCode: '123456'
        },
        financialInfo: {
          openingBalance: 0,
          creditLimit: 10000
        },
        tenantId: tenantId,
        createdBy: dealerGroup.createdBy
      };
      
      try {
        const dealer = await Dealer.create(dealerData);
        console.log(`  ✅ Created dealer: ${dealer.name} with code: ${dealer.dealerCode}`);
      } catch (error) {
        if (error.code === 11000) {
          console.log(`  ⚠️  Dealer with code DLR250801 already exists in tenant ${tenantId}`);
          
          // Try without specifying dealer code - let it auto-generate
          delete dealerData.dealerCode;
          const dealer = await Dealer.create(dealerData);
          console.log(`  ✅ Created dealer with auto-generated code: ${dealer.dealerCode}`);
        } else {
          console.log(`  ❌ Error creating dealer: ${error.message}`);
        }
      }
    }
    
    // Now verify that each tenant has its own dealers
    console.log('\n📊 Verification - Dealers per tenant:');
    for (const tenantId of tenants) {
      const dealers = await Dealer.find({ tenantId }).select('name dealerCode');
      console.log(`\nTenant ${tenantId}: ${dealers.length} dealer(s)`);
      dealers.forEach(d => {
        console.log(`  - ${d.name}: ${d.dealerCode}`);
      });
    }
    
    console.log('\n✅ Multi-tenant dealer creation test completed!');
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    await mongoose.disconnect();
  }
}

testMultiTenantDealerCreation();