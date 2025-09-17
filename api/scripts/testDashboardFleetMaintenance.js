require('dotenv').config();
const axios = require('axios');

async function testDashboardFleetMaintenance() {
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
    
    console.log('\n🚛 Testing Fleet Maintenance Dashboard APIs:');
    
    // Test Fleet Maintenance Stats
    try {
      const statsResponse = await axios.get('http://localhost:8000/api/fleet-maintenance/meta/stats', { headers });
      console.log('✅ Fleet Maintenance Stats API working');
      console.log('   Stats:', JSON.stringify(statsResponse.data.data.summary, null, 2));
    } catch (error) {
      console.log('❌ Fleet Maintenance Stats API failed:', error.response?.data?.message || error.message);
    }
    
    // Test Upcoming Maintenance
    try {
      const upcomingResponse = await axios.get('http://localhost:8000/api/fleet-maintenance/meta/upcoming', { headers });
      console.log('✅ Upcoming Maintenance API working');
      console.log('   Summary:', JSON.stringify(upcomingResponse.data.data.summary, null, 2));
      console.log('   Overdue count:', upcomingResponse.data.data.overdue?.length || 0);
      console.log('   Upcoming count:', upcomingResponse.data.data.upcoming?.length || 0);
    } catch (error) {
      console.log('❌ Upcoming Maintenance API failed:', error.response?.data?.message || error.message);
    }
    
    // Test creating a sample maintenance record for demonstration
    console.log('\n📝 Creating sample maintenance record for dashboard testing...');
    try {
      // First, get a fleet vehicle
      const fleetsResponse = await axios.get('http://localhost:8000/api/fleet', { 
        headers,
        params: { limit: 1 }
      });
      
      if (fleetsResponse.data.data.vehicles.length > 0) {
        const vehicle = fleetsResponse.data.data.vehicles[0];
        console.log(`Found vehicle: ${vehicle.vehicleNumber}`);
        
        // Create a sample maintenance record scheduled for tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const maintenanceData = {
          vehicle: vehicle._id,
          maintenanceType: 'routine_service',
          serviceCategory: 'preventive',
          title: 'Dashboard Test - Routine Service',
          description: 'Sample maintenance record for dashboard testing',
          scheduledDate: tomorrow.toISOString(),
          serviceProvider: {
            name: 'Test Service Center',
            type: 'local_garage',
            contact: '123-456-7890'
          },
          preServiceCondition: {
            odometer: vehicle.currentOdometer || 0
          },
          totalCost: 1500,
          paymentDetails: {
            method: 'cash'
          },
          priority: 'medium'
        };
        
        const createResponse = await axios.post('http://localhost:8000/api/fleet-maintenance', maintenanceData, { headers });
        console.log('✅ Sample maintenance record created for dashboard testing');
        
        // Test the APIs again to see the new data
        console.log('\n🔄 Re-testing APIs with new data:');
        
        const newStatsResponse = await axios.get('http://localhost:8000/api/fleet-maintenance/meta/stats', { headers });
        console.log('   Updated Total Records:', newStatsResponse.data.data.summary.totalRecords);
        console.log('   Updated Pending Records:', newStatsResponse.data.data.summary.pendingRecords);
        
        const newUpcomingResponse = await axios.get('http://localhost:8000/api/fleet-maintenance/meta/upcoming', { headers });
        console.log('   Updated Upcoming Count:', newUpcomingResponse.data.data.summary.upcomingCount);
        
        // Clean up - delete the test record
        const maintenanceId = createResponse.data.data.maintenanceRecord._id;
        await axios.delete(`http://localhost:8000/api/fleet-maintenance/${maintenanceId}`, { headers });
        console.log('🗑️  Cleaned up test maintenance record');
        
      } else {
        console.log('⚠️  No fleet vehicles found. Create a vehicle first to test maintenance dashboard.');
      }
      
    } catch (error) {
      console.log('❌ Failed to create sample maintenance:', error.response?.data?.message || error.message);
    }
    
    console.log('\n✅ Dashboard Fleet Maintenance test completed!');
    console.log('\n📊 Dashboard should now display:');
    console.log('   - Fleet Maintenance statistics cards');
    console.log('   - Upcoming maintenance alerts list');
    console.log('   - Color-coded alerts (red=overdue, orange=due soon, green=scheduled)');
    
  } catch (error) {
    console.error('❌ Error during dashboard fleet maintenance test:', error.response?.data || error.message);
  }
}

testDashboardFleetMaintenance();