require('dotenv').config();
const mongoose = require('mongoose');
const Fleet = require('../models/Fleet');

async function simpleFleetTest() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
    console.log('✓ Connected to MongoDB');

    // Test creating a fleet vehicle directly
    console.log('\n🚛 Testing Fleet model directly:');
    
    const testVehicle = {
      vehicleNumber: 'TEST123',
      make: 'Test',
      model: 'Model1',
      year: 2023,
      vehicleType: 'truck',
      status: 'active',
      registrationDate: new Date('2023-01-01'),
      tenantId: '002'
    };
    
    try {
      const vehicle = new Fleet(testVehicle);
      const savedVehicle = await vehicle.save();
      console.log('✅ Successfully created vehicle:', savedVehicle.vehicleNumber);
      
      // Clean up
      await Fleet.findByIdAndDelete(savedVehicle._id);
      console.log('🗑️  Cleaned up vehicle');
      
    } catch (error) {
      console.log('❌ Failed to create vehicle:');
      console.log('Error:', error.message);
      if (error.errors) {
        console.log('Validation errors:');
        Object.keys(error.errors).forEach(key => {
          console.log(`  ${key}: ${error.errors[key].message}`);
        });
      }
    }

    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.disconnect();
  }
}

simpleFleetTest();