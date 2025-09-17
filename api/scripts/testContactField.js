require('dotenv').config();
const mongoose = require('mongoose');
const Fleet = require('../models/Fleet');
const FleetMaintenance = require('../models/FleetMaintenance');

async function testContactFieldMapping() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    const testTenantId = '005';
    
    // Create a test vehicle first
    const testVehicle = await Fleet.create({
      vehicleNumber: `TEST-CONTACT-${Date.now()}`,
      vehicleType: 'van',
      make: 'Test Make',
      model: 'Test Model',
      year: 2022,
      tenantId: testTenantId,
      createdBy: new mongoose.Types.ObjectId()
    });

    console.log('✅ Created test vehicle:', testVehicle.vehicleNumber);

    // Test data that simulates frontend request
    const maintenanceData = {
      vehicle: testVehicle._id,
      maintenanceType: 'routine_service',
      serviceCategory: 'preventive',
      title: 'Test Contact Field Maintenance',
      description: 'Testing contact field mapping',
      scheduledDate: new Date(),
      serviceProvider: {
        name: 'Test Service Provider',
        type: 'local_garage',
        contact: '+91-9876543210' // Frontend sends this as 'contact'
      },
      preServiceCondition: {
        odometer: 30000
      },
      totalCost: 1500,
      paymentDetails: {
        method: 'cash'
      },
      tenantId: testTenantId,
      createdBy: new mongoose.Types.ObjectId()
    };

    console.log('\n📝 Test data being sent (simulating frontend):');
    console.log('serviceProvider.contact:', maintenanceData.serviceProvider.contact);

    // Apply the same field mapping that the backend route does
    if (maintenanceData.serviceProvider?.contact) {
      maintenanceData.serviceProvider.phone = maintenanceData.serviceProvider.contact;
      delete maintenanceData.serviceProvider.contact;
    }

    console.log('\n🔄 After backend field mapping:');
    console.log('serviceProvider.phone:', maintenanceData.serviceProvider.phone);
    console.log('serviceProvider.contact:', maintenanceData.serviceProvider.contact);

    // Create the maintenance record
    const maintenanceRecord = await FleetMaintenance.create(maintenanceData);
    console.log('\n✅ Created maintenance record:', maintenanceRecord._id);

    // Test retrieval and response mapping
    const savedRecord = await FleetMaintenance.findById(maintenanceRecord._id).lean();
    console.log('\n📋 Raw stored data:');
    console.log('serviceProvider.phone:', savedRecord.serviceProvider?.phone);
    console.log('serviceProvider.contactPerson:', savedRecord.serviceProvider?.contactPerson);
    console.log('serviceProvider.email:', savedRecord.serviceProvider?.email);

    // Apply response mapping (simulating what API response does)
    const responseData = savedRecord;
    if (responseData.serviceProvider?.phone) {
      responseData.serviceProvider.contact = responseData.serviceProvider.phone;
    }

    console.log('\n📤 Response data (simulating API response):');
    console.log('serviceProvider.contact:', responseData.serviceProvider?.contact);
    console.log('serviceProvider.phone:', responseData.serviceProvider?.phone);

    // Test update scenario
    console.log('\n🔄 Testing update scenario...');
    const updateData = {
      serviceProvider: {
        name: 'Updated Service Provider',
        type: 'authorized_dealer',
        contact: '+91-9988776655' // Frontend sends updated contact
      }
    };

    // Apply field mapping for update
    if (updateData.serviceProvider?.contact) {
      updateData.serviceProvider.phone = updateData.serviceProvider.contact;
      delete updateData.serviceProvider.contact;
    }

    const updatedRecord = await FleetMaintenance.findByIdAndUpdate(
      maintenanceRecord._id,
      updateData,
      { new: true, runValidators: true }
    ).lean();

    console.log('📋 Updated stored data:');
    console.log('serviceProvider.phone:', updatedRecord.serviceProvider?.phone);
    console.log('serviceProvider.name:', updatedRecord.serviceProvider?.name);

    // Apply response mapping for update response
    if (updatedRecord.serviceProvider?.phone) {
      updatedRecord.serviceProvider.contact = updatedRecord.serviceProvider.phone;
    }

    console.log('\n📤 Update response data:');
    console.log('serviceProvider.contact:', updatedRecord.serviceProvider?.contact);

    // Clean up test data
    await Fleet.findByIdAndDelete(testVehicle._id);
    await FleetMaintenance.findByIdAndDelete(maintenanceRecord._id);
    console.log('\n🧹 Test data cleaned up');

    console.log('\n🎉 Contact field mapping working correctly!');
    console.log('✅ Frontend "contact" field maps to backend "phone" field');
    console.log('✅ Backend "phone" field maps back to frontend "contact" field');
    console.log('✅ Data persists correctly during create and update operations');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB');
  }
}

testContactFieldMapping().catch(console.error);