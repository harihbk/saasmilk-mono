require('dotenv').config();
const axios = require('axios');

async function testFleetEdit() {
  try {
    // Login with hari@gmail.com
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:8000/api/auth/login', {
      email: 'hari@gmail.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    console.log('✅ Login successful');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': user.tenantId
    };
    
    console.log('\n🚛 Testing Fleet edit functionality:');
    
    // Step 1: Create a vehicle
    const initialVehicle = {
      vehicleNumber: 'EDIT001',
      make: 'Initial',
      model: 'Model',
      year: 2023,
      vehicleType: 'truck'
    };
    
    let vehicleId;
    try {
      const createResponse = await axios.post('http://localhost:8000/api/fleet', initialVehicle, { headers });
      vehicleId = createResponse.data.data.vehicle._id;
      console.log('✅ Step 1: Created vehicle for editing:', createResponse.data.data.vehicle.vehicleNumber);
    } catch (error) {
      console.log('❌ Failed to create vehicle:', error.response?.data?.message || error.message);
      return;
    }
    
    // Step 2: Test editing with various vehicle number formats
    const editTests = [
      {
        name: 'Edit vehicle number to TEST123',
        update: { vehicleNumber: 'TEST123' }
      },
      {
        name: 'Edit vehicle number to ABC-XYZ-999',
        update: { vehicleNumber: 'ABC-XYZ-999' }
      },
      {
        name: 'Edit make and model',
        update: { make: 'Updated Make', model: 'Updated Model' }
      },
      {
        name: 'Edit with special characters',
        update: { vehicleNumber: 'SPECIAL@123#' }
      }
    ];
    
    for (const test of editTests) {
      try {
        const updateResponse = await axios.put(`http://localhost:8000/api/fleet/${vehicleId}`, test.update, { headers });
        console.log(`✅ ${test.name} - Success`);
        if (test.update.vehicleNumber) {
          console.log(`   Updated vehicle number: ${updateResponse.data.data.vehicle.vehicleNumber}`);
        }
      } catch (error) {
        console.log(`❌ ${test.name} - Failed:`, error.response?.data?.message || error.message);
        if (error.response?.data?.errors) {
          console.log('   Validation errors:', error.response.data.errors);
        }
      }
    }
    
    // Step 3: Clean up
    try {
      await axios.delete(`http://localhost:8000/api/fleet/${vehicleId}`, { headers });
      console.log('🗑️  Cleaned up test vehicle');
    } catch (error) {
      console.log('⚠️  Failed to clean up vehicle:', error.response?.data?.message || error.message);
    }
    
    console.log('\n✅ Fleet edit test completed!');
    
  } catch (error) {
    console.error('❌ Error during fleet edit test:', error.response?.data || error.message);
  }
}

testFleetEdit();