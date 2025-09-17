require('dotenv').config();
const mongoose = require('mongoose');
const DealerGroup = require('../models/DealerGroup');

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
  console.log('✓ Connected to MongoDB');
}

async function testDealerGroupCreation() {
  try {
    await connectDB();

    console.log('═══════════════════════════════════════════════════════');
    console.log('           Testing DealerGroup Creation for Tenant 005');
    console.log('═══════════════════════════════════════════════════════');

    // Test case 1: Create a new dealer group for tenant 005
    console.log('\n📝 Test 1: Creating dealer group for tenant 005...');
    
    const groupData = {
      name: 'Test Group 005',
      description: 'Test group for tenant 005',
      tenantId: '005',
      createdBy: new mongoose.Types.ObjectId(), // Mock user ID
      discountPercentage: 5,
      creditLimit: 10000
    };

    try {
      const newGroup = await DealerGroup.create(groupData);
      console.log(`✅ Success! Created group with code: ${newGroup.code}`);
      console.log(`   Group ID: ${newGroup._id}`);
      console.log(`   Tenant: ${newGroup.tenantId}`);
    } catch (error) {
      console.log(`❌ Error creating group: ${error.message}`);
      if (error.code === 11000) {
        console.log(`   Duplicate key error: ${JSON.stringify(error.keyValue)}`);
      }
    }

    // Test case 2: Try to create another group with same name (should succeed with different code)
    console.log('\n📝 Test 2: Creating another group with same name for tenant 005...');
    
    const groupData2 = {
      name: 'Test Group 005', // Same name
      description: 'Another test group for tenant 005',
      tenantId: '005',
      createdBy: new mongoose.Types.ObjectId(), // Mock user ID
      discountPercentage: 10,
      creditLimit: 15000
    };

    try {
      const newGroup2 = await DealerGroup.create(groupData2);
      console.log(`❌ Unexpected success! This should have failed due to duplicate name.`);
      console.log(`   Group code: ${newGroup2.code}`);
    } catch (error) {
      console.log(`✅ Expected error: ${error.message}`);
      if (error.code === 11000) {
        console.log(`   Correctly caught duplicate name for tenant 005`);
      }
    }

    // Test case 3: Create group with different name
    console.log('\n📝 Test 3: Creating group with different name for tenant 005...');
    
    const groupData3 = {
      name: 'Marketing Group',
      description: 'Marketing dealer group for tenant 005',
      tenantId: '005',
      createdBy: new mongoose.Types.ObjectId(), // Mock user ID
      discountPercentage: 8,
      creditLimit: 20000
    };

    try {
      const newGroup3 = await DealerGroup.create(groupData3);
      console.log(`✅ Success! Created marketing group with code: ${newGroup3.code}`);
    } catch (error) {
      console.log(`❌ Error creating marketing group: ${error.message}`);
    }

    // Test case 4: Try to create in different tenant with same name (should succeed)
    console.log('\n📝 Test 4: Creating group with same name in different tenant...');
    
    const groupData4 = {
      name: 'Test Group 005', // Same name as test 1
      description: 'Test group for tenant 006',
      tenantId: '006',
      createdBy: new mongoose.Types.ObjectId(), // Mock user ID
      discountPercentage: 12,
      creditLimit: 25000
    };

    try {
      const newGroup4 = await DealerGroup.create(groupData4);
      console.log(`✅ Success! Created group in tenant 006 with code: ${newGroup4.code}`);
      console.log(`   This proves tenant isolation is working correctly`);
    } catch (error) {
      console.log(`❌ Error creating group in tenant 006: ${error.message}`);
    }

    // Check current state
    console.log('\n📊 Current DealerGroups for tenant 005:');
    const tenant005Groups = await DealerGroup.find({ tenantId: '005' });
    tenant005Groups.forEach(group => {
      console.log(`   ${group.code}: ${group.name} (Active: ${group.isActive})`);
    });

    console.log('\n📊 Current DealerGroups for tenant 006:');
    const tenant006Groups = await DealerGroup.find({ tenantId: '006' });
    tenant006Groups.forEach(group => {
      console.log(`   ${group.code}: ${group.name} (Active: ${group.isActive})`);
    });

    // Test code generation method directly
    console.log('\n📝 Test 5: Testing code generation method directly...');
    try {
      const testCode1 = await DealerGroup.generateUniqueCode('Premium Dealers', '005');
      console.log(`✅ Generated code for 'Premium Dealers': ${testCode1}`);
      
      const testCode2 = await DealerGroup.generateUniqueCode('Premium Dealers', '007');
      console.log(`✅ Generated code for 'Premium Dealers' in tenant 007: ${testCode2}`);
    } catch (error) {
      console.log(`❌ Error in code generation: ${error.message}`);
    }

    mongoose.disconnect();

  } catch (error) {
    console.error('❌ Test error:', error);
    mongoose.disconnect();
  }
}

testDealerGroupCreation();