require('dotenv').config();
const axios = require('axios');

async function testFleetCreation() {
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
    
    // Test creating vehicles with different number formats
    const testVehicles = [
      {
        vehicleNumber: 'TEST123',
        make: 'Test',
        model: 'Model1',
        year: 2023,
        vehicleType: 'truck',
        status: 'active',
        registrationDate: '2023-01-01'
      },
      {
        vehicleNumber: 'ABC-1234',
        make: 'Test',
        model: 'Model2', 
        year: 2023,
        vehicleType: 'van',
        status: 'active',
        registrationDate: '2023-01-01'
      },
      {
        vehicleNumber: 'XYZ999',
        make: 'Test',
        model: 'Model3',
        year: 2023,
        vehicleType: 'truck',
        status: 'active',
        registrationDate: '2023-01-01'
      }
    ];
    
    console.log('\n🚛 Testing Fleet creation with various vehicle number formats:');
    
    for (const vehicleData of testVehicles) {
      try {
        const createResponse = await axios.post('http://localhost:8000/api/fleet', vehicleData, { headers });
        console.log(`  ✅ Created vehicle: ${vehicleData.vehicleNumber} - Success`);
        
        // Clean up - delete the created vehicle
        const vehicleId = createResponse.data.data.vehicle._id;
        await axios.delete(`http://localhost:8000/api/fleet/${vehicleId}`, { headers });
        console.log(`    🗑️  Cleaned up vehicle: ${vehicleData.vehicleNumber}`);
        
      } catch (error) {
        console.log(`  ❌ Failed to create ${vehicleData.vehicleNumber}:`, error.response?.data?.message || error.message);
        if (error.response?.data?.errors) {
          console.log('    Validation errors:', error.response.data.errors);
        }
      }
    }
    
    console.log('\n✅ Fleet creation test completed!');
    
  } catch (error) {
    console.error('❌ Error during fleet creation test:', error.response?.data || error.message);
  }
}

testFleetCreation();