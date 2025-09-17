require('dotenv').config();
const axios = require('axios');

async function testFleetAccess() {
  try {
    // Login with hari@gmail.com (employee role in tenant 002)
    console.log('🔐 Testing Fleet access...');
    const loginResponse = await axios.post('http://localhost:8000/api/auth/login', {
      email: 'hari@gmail.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    console.log('✅ Login successful');
    console.log(`  User: ${user.name} (${user.email})`);
    console.log(`  Role: ${user.role}`);
    console.log(`  Tenant: ${user.tenantId}`);
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': user.tenantId
    };
    
    // Test Fleet endpoints
    console.log('\n🚛 Testing Fleet endpoints:');
    
    // Test GET /api/fleet
    try {
      const getFleetResponse = await axios.get('http://localhost:8000/api/fleet', { headers });
      console.log('  ✅ GET /api/fleet - Success');
      console.log(`    Found ${getFleetResponse.data.data.vehicles.length} vehicles`);
    } catch (error) {
      console.log('  ❌ GET /api/fleet - Failed:', error.response?.data?.message || error.message);
    }
    
    // Test GET /api/fleet/meta/stats
    try {
      const getStatsResponse = await axios.get('http://localhost:8000/api/fleet/meta/stats', { headers });
      console.log('  ✅ GET /api/fleet/meta/stats - Success');
    } catch (error) {
      console.log('  ❌ GET /api/fleet/meta/stats - Failed:', error.response?.data?.message || error.message);
    }
    
    // Test POST /api/fleet (create vehicle)
    try {
      const createVehicleData = {
        vehicleNumber: 'TEST123',
        make: 'Test',
        model: 'Model',
        year: 2023,
        vehicleType: 'truck',
        status: 'active'
      };
      
      const createResponse = await axios.post('http://localhost:8000/api/fleet', createVehicleData, { headers });
      console.log('  ✅ POST /api/fleet - Success');
      console.log(`    Created vehicle: ${createResponse.data.data.vehicle.vehicleNumber}`);
      
      const vehicleId = createResponse.data.data.vehicle._id;
      
      // Test PUT /api/fleet/:id (update vehicle)
      try {
        const updateData = { status: 'maintenance' };
        const updateResponse = await axios.put(`http://localhost:8000/api/fleet/${vehicleId}`, updateData, { headers });
        console.log('  ✅ PUT /api/fleet/:id - Success');
      } catch (error) {
        console.log('  ❌ PUT /api/fleet/:id - Failed:', error.response?.data?.message || error.message);
      }
      
      // Test DELETE /api/fleet/:id
      try {
        const deleteResponse = await axios.delete(`http://localhost:8000/api/fleet/${vehicleId}`, { headers });
        console.log('  ✅ DELETE /api/fleet/:id - Success');
      } catch (error) {
        console.log('  ❌ DELETE /api/fleet/:id - Failed:', error.response?.data?.message || error.message);
      }
      
    } catch (error) {
      console.log('  ❌ POST /api/fleet - Failed:', error.response?.data?.message || error.message);
    }
    
    // Test Fleet Maintenance endpoints
    console.log('\n🔧 Testing Fleet Maintenance endpoints:');
    
    // Test GET /api/fleet-maintenance
    try {
      const getMaintenanceResponse = await axios.get('http://localhost:8000/api/fleet-maintenance', { headers });
      console.log('  ✅ GET /api/fleet-maintenance - Success');
      console.log(`    Found ${getMaintenanceResponse.data.data.maintenanceRecords.length} maintenance records`);
    } catch (error) {
      console.log('  ❌ GET /api/fleet-maintenance - Failed:', error.response?.data?.message || error.message);
    }
    
    // Test GET /api/fleet-maintenance/meta/stats
    try {
      const getMaintenanceStatsResponse = await axios.get('http://localhost:8000/api/fleet-maintenance/meta/stats', { headers });
      console.log('  ✅ GET /api/fleet-maintenance/meta/stats - Success');
    } catch (error) {
      console.log('  ❌ GET /api/fleet-maintenance/meta/stats - Failed:', error.response?.data?.message || error.message);
    }
    
    console.log('\n✅ Fleet access test completed!');
    
  } catch (error) {
    console.error('❌ Error during fleet access test:', error.response?.data || error.message);
  }
}

testFleetAccess();