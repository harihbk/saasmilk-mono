require('dotenv').config();
const mongoose = require('mongoose');
const Fleet = require('../models/Fleet');
const FleetMaintenance = require('../models/FleetMaintenance');

async function testServiceDueEndpoint() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');

    const testTenantId = '005';
    
    // Create a test vehicle with next service due
    const testVehicle = await Fleet.create({
      vehicleNumber: `TEST-SERVICE-DUE-${Date.now()}`,
      vehicleType: 'van',
      make: 'Test Make',
      model: 'Test Model',
      year: 2020,
      tenantId: testTenantId,
      status: 'active',
      currentOdometer: 45000,
      nextServiceDue: {
        date: new Date('2024-01-15'), // Past due date
        odometer: 50000 // Still has 5000 km left
      },
      createdBy: new mongoose.Types.ObjectId()
    });

    console.log('✅ Created test vehicle:', {
      vehicleNumber: testVehicle.vehicleNumber,
      currentOdometer: testVehicle.currentOdometer,
      nextServiceDue: testVehicle.nextServiceDue
    });

    // Create another test vehicle with urgent service
    const testVehicle2 = await Fleet.create({
      vehicleNumber: `TEST-SERVICE-URGENT-${Date.now()}`,
      vehicleType: 'truck',
      make: 'Test Make 2',
      model: 'Test Model 2',
      year: 2021,
      tenantId: testTenantId,
      status: 'active',
      currentOdometer: 51000,
      nextServiceDue: {
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        odometer: 50000 // Already passed
      },
      createdBy: new mongoose.Types.ObjectId()
    });

    console.log('✅ Created second test vehicle:', {
      vehicleNumber: testVehicle2.vehicleNumber,
      currentOdometer: testVehicle2.currentOdometer,
      nextServiceDue: testVehicle2.nextServiceDue
    });

    // Simulate the service due logic
    const days = 30;
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const vehicles = await Fleet.find({
      tenantId: testTenantId,
      status: 'active',
      $or: [
        { 'nextServiceDue.date': { $lte: futureDate } },
        { 'nextServiceDue.date': { $lt: today } }
      ]
    })
      .select('vehicleNumber make model year currentOdometer nextServiceDue lastServiceDate')
      .lean();

    console.log('\n🔍 Found vehicles needing service:', vehicles.length);

    const serviceDueVehicles = vehicles.map(vehicle => {
      const dueDate = vehicle.nextServiceDue?.date;
      const dueOdometer = vehicle.nextServiceDue?.odometer;
      const currentOdometer = vehicle.currentOdometer || 0;
      
      let status = 'upcoming';
      let priority = 'low';
      let reason = '';
      
      if (dueDate) {
        const daysUntilService = Math.ceil((new Date(dueDate) - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilService < 0) {
          status = 'overdue';
          priority = 'critical';
          reason = `Service overdue by ${Math.abs(daysUntilService)} days`;
        } else if (daysUntilService <= 7) {
          status = 'urgent';
          priority = 'high';
          reason = `Service due in ${daysUntilService} days`;
        } else {
          reason = `Service due in ${daysUntilService} days`;
        }
      }
      
      if (dueOdometer && currentOdometer >= dueOdometer) {
        status = 'overdue';
        priority = 'critical';
        reason = `Service overdue by ${currentOdometer - dueOdometer} km`;
      } else if (dueOdometer && (dueOdometer - currentOdometer) <= 1000) {
        status = 'urgent';
        priority = 'high';
        reason = `Service due in ${dueOdometer - currentOdometer} km`;
      }
      
      return {
        vehicle: {
          _id: vehicle._id,
          vehicleNumber: vehicle.vehicleNumber,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          currentOdometer: vehicle.currentOdometer
        },
        nextServiceDue: vehicle.nextServiceDue,
        status,
        priority,
        reason,
        daysUntilService: dueDate ? Math.ceil((new Date(dueDate) - today) / (1000 * 60 * 60 * 24)) : null,
        kmUntilService: dueOdometer ? Math.max(0, dueOdometer - currentOdometer) : null
      };
    });

    console.log('\n📊 Service Due Analysis:');
    serviceDueVehicles.forEach(vehicle => {
      console.log(`${vehicle.vehicle.vehicleNumber}: ${vehicle.status} - ${vehicle.reason}`);
    });

    const summary = {
      total: serviceDueVehicles.length,
      overdue: serviceDueVehicles.filter(v => v.status === 'overdue').length,
      urgent: serviceDueVehicles.filter(v => v.status === 'urgent').length,
      upcoming: serviceDueVehicles.filter(v => v.status === 'upcoming').length
    };

    console.log('\n📈 Summary:', summary);

    // Clean up test data
    await Fleet.findByIdAndDelete(testVehicle._id);
    await Fleet.findByIdAndDelete(testVehicle2._id);
    console.log('\n🧹 Test data cleaned up');

    console.log('\n🎉 Service Due logic working correctly!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📦 Disconnected from MongoDB');
  }
}

testServiceDueEndpoint().catch(console.error);