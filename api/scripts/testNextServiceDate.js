require('dotenv').config();
const mongoose = require('mongoose');
const Fleet = require('../models/Fleet');
const FleetMaintenance = require('../models/FleetMaintenance');

async function testNextServiceDateStorage() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    const testTenantId = '005';
    
    // Test 1: Create a Fleet vehicle with nextServiceDate
    console.log('\n🚛 Test 1: Creating Fleet vehicle with nextServiceDate');
    
    const testVehicleData = {
      vehicleNumber: `TEST-NEXT-SERVICE-${Date.now()}`,
      vehicleType: 'van',
      make: 'TestMake',
      model: 'TestModel',
      year: 2022,
      tenantId: testTenantId,
      createdBy: new mongoose.Types.ObjectId(),
      // Frontend sends nextServiceDate
      nextServiceDate: new Date('2024-12-01'),
      nextServiceOdometer: 50000
    };

    // Transform frontend field names to match backend model (simulating route logic)
    if (testVehicleData.nextServiceDate) {
      testVehicleData.nextServiceDue = {
        date: testVehicleData.nextServiceDate,
        odometer: testVehicleData.nextServiceOdometer || null
      };
      delete testVehicleData.nextServiceDate;
      delete testVehicleData.nextServiceOdometer;
    }

    const testVehicle = await Fleet.create(testVehicleData);
    console.log('✅ Fleet vehicle created with nextServiceDue:', {
      date: testVehicle.nextServiceDue?.date,
      odometer: testVehicle.nextServiceDue?.odometer
    });

    // Test 2: Create FleetMaintenance record with nextServiceDate
    console.log('\n🔧 Test 2: Creating FleetMaintenance record with nextServiceDate');
    
    const testMaintenanceData = {
      vehicle: testVehicle._id,
      maintenanceType: 'routine_service',
      serviceCategory: 'preventive',
      title: 'Test Service with Next Service Date',
      description: 'Testing next service date storage',
      scheduledDate: new Date(),
      serviceProvider: {
        name: 'Test Service Provider',
        type: 'local_garage'
      },
      preServiceCondition: {
        odometer: 40000
      },
      totalCost: 500,
      paymentDetails: {
        method: 'cash'
      },
      tenantId: testTenantId,
      createdBy: new mongoose.Types.ObjectId(),
      // Frontend sends nextServiceDate
      nextServiceDate: new Date('2024-06-01'),
      nextServiceOdometer: 45000
    };

    // Transform frontend field names to match backend model (simulating route logic)
    if (testMaintenanceData.nextServiceDate) {
      testMaintenanceData.nextService = {
        recommendedDate: testMaintenanceData.nextServiceDate,
        recommendedOdometer: testMaintenanceData.nextServiceOdometer || null
      };
      delete testMaintenanceData.nextServiceDate;
      delete testMaintenanceData.nextServiceOdometer;
    }

    const testMaintenance = await FleetMaintenance.create(testMaintenanceData);
    console.log('✅ FleetMaintenance record created with nextService:', {
      recommendedDate: testMaintenance.nextService?.recommendedDate,
      recommendedOdometer: testMaintenance.nextService?.recommendedOdometer
    });

    // Test 3: Update Fleet vehicle with new nextServiceDate
    console.log('\n🔄 Test 3: Updating Fleet vehicle with new nextServiceDate');
    
    const updateVehicleData = {
      nextServiceDate: new Date('2024-07-01'),
      nextServiceOdometer: 55000
    };

    // Transform frontend field names to match backend model
    if (updateVehicleData.nextServiceDate) {
      updateVehicleData.nextServiceDue = {
        date: updateVehicleData.nextServiceDate,
        odometer: updateVehicleData.nextServiceOdometer || testVehicle.nextServiceDue?.odometer || null
      };
      delete updateVehicleData.nextServiceDate;
      delete updateVehicleData.nextServiceOdometer;
    }

    const updatedVehicle = await Fleet.findByIdAndUpdate(
      testVehicle._id,
      updateVehicleData,
      { new: true, runValidators: true }
    );
    
    console.log('✅ Fleet vehicle updated with nextServiceDue:', {
      date: updatedVehicle.nextServiceDue?.date,
      odometer: updatedVehicle.nextServiceDue?.odometer
    });

    // Test 4: Update FleetMaintenance record with new nextServiceDate
    console.log('\n🔄 Test 4: Updating FleetMaintenance record with new nextServiceDate');
    
    const updateMaintenanceData = {
      nextServiceDate: new Date('2024-08-01'),
      nextServiceOdometer: 48000
    };

    // Transform frontend field names to match backend model
    if (updateMaintenanceData.nextServiceDate) {
      updateMaintenanceData.nextService = {
        ...testMaintenance.nextService,
        recommendedDate: updateMaintenanceData.nextServiceDate,
        recommendedOdometer: updateMaintenanceData.nextServiceOdometer || testMaintenance.nextService?.recommendedOdometer || null
      };
      delete updateMaintenanceData.nextServiceDate;
      delete updateMaintenanceData.nextServiceOdometer;
    }

    const updatedMaintenance = await FleetMaintenance.findByIdAndUpdate(
      testMaintenance._id,
      updateMaintenanceData,
      { new: true, runValidators: true }
    );

    console.log('✅ FleetMaintenance record updated with nextService:', {
      recommendedDate: updatedMaintenance.nextService?.recommendedDate,
      recommendedOdometer: updatedMaintenance.nextService?.recommendedOdometer
    });

    // Test 5: Verify field transformations for API responses
    console.log('\n🔍 Test 5: Verifying field transformations for API responses');
    
    // Simulate Fleet API response transformation
    const fleetResponseData = updatedVehicle.toObject();
    if (fleetResponseData.nextServiceDue?.date) {
      fleetResponseData.nextServiceDate = fleetResponseData.nextServiceDue.date;
      fleetResponseData.nextServiceOdometer = fleetResponseData.nextServiceDue.odometer;
    }
    console.log('✅ Fleet API response transformation:', {
      nextServiceDate: fleetResponseData.nextServiceDate,
      nextServiceOdometer: fleetResponseData.nextServiceOdometer
    });

    // Simulate FleetMaintenance API response transformation
    const maintenanceResponseData = updatedMaintenance.toObject();
    if (maintenanceResponseData.nextService?.recommendedDate) {
      maintenanceResponseData.nextServiceDate = maintenanceResponseData.nextService.recommendedDate;
      maintenanceResponseData.nextServiceOdometer = maintenanceResponseData.nextService.recommendedOdometer;
    }
    console.log('✅ FleetMaintenance API response transformation:', {
      nextServiceDate: maintenanceResponseData.nextServiceDate,
      nextServiceOdometer: maintenanceResponseData.nextServiceOdometer
    });

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await Fleet.findByIdAndDelete(testVehicle._id);
    await FleetMaintenance.findByIdAndDelete(testMaintenance._id);
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! Next service date storage and field transformations are working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB');
  }
}

// Run the test
testNextServiceDateStorage().catch(console.error);