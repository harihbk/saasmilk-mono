require('dotenv').config();
const axios = require('axios');

async function testMinimalFleet() {
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
    
    // Test creating a minimal vehicle (just required fields)
    const minimalVehicle = {
      vehicleNumber: 'MINIMAL001',
      make: 'Test',
      model: 'Model',
      year: 2023,
      vehicleType: 'truck'
    };
    
    console.log('\n🚛 Testing minimal Fleet creation (no registrationDate, no fuelType):');
    
    try {
      const createResponse = await axios.post('http://localhost:8000/api/fleet', minimalVehicle, { headers });
      console.log('✅ Created minimal vehicle successfully:', createResponse.data.data.vehicle.vehicleNumber);
      
      // Clean up
      const vehicleId = createResponse.data.data.vehicle._id;
      await axios.delete(`http://localhost:8000/api/fleet/${vehicleId}`, { headers });
      console.log('🗑️  Cleaned up vehicle');
      
    } catch (error) {
      console.log('❌ Failed to create minimal vehicle:', error.response?.data?.message || error.message);
      if (error.response?.data?.errors) {
        console.log('Validation errors:', error.response.data.errors);
      }
    }
    
    console.log('\n✅ Minimal Fleet test completed!');
    
  } catch (error) {
    console.error('❌ Error during minimal fleet test:', error.response?.data || error.message);
  }
}

testMinimalFleet();