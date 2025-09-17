require('dotenv').config();
const axios = require('axios');

async function createSampleMaintenanceForDashboard() {
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
    
    console.log('\n📝 Creating sample maintenance records for dashboard...');
    
    // Get fleet vehicles
    const fleetsResponse = await axios.get('http://localhost:8000/api/fleet', { 
      headers,
      params: { limit: 5 }
    });
    
    if (fleetsResponse.data.data.vehicles.length === 0) {
      console.log('⚠️  No fleet vehicles found. Creating a sample vehicle first...');
      
      // Create a sample vehicle
      const vehicleData = {
        vehicleNumber: 'DASH001',
        make: 'Tata',
        model: 'Ace',
        year: 2023,
        vehicleType: 'truck',
        status: 'active'
      };
      
      const vehicleResponse = await axios.post('http://localhost:8000/api/fleet', vehicleData, { headers });
      console.log('✅ Sample vehicle created:', vehicleResponse.data.data.vehicle.vehicleNumber);
      
      fleetsResponse.data.data.vehicles.push(vehicleResponse.data.data.vehicle);
    }
    
    const vehicles = fleetsResponse.data.data.vehicles;
    console.log(`Found ${vehicles.length} vehicles for maintenance records`);
    
    // Create different types of maintenance records for dashboard testing
    const maintenanceRecords = [
      {
        vehicle: vehicles[0]._id,
        maintenanceType: 'routine_service',
        serviceCategory: 'preventive',
        title: 'Routine Service - Oil Change',
        description: 'Regular oil change and filter replacement',
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        serviceProvider: {
          name: 'Quick Service Center',
          type: 'local_garage',
          contact: '123-456-7890'
        },
        preServiceCondition: {
          odometer: vehicles[0].currentOdometer || 10000
        },
        totalCost: 2500,
        paymentDetails: {
          method: 'cash'
        },
        priority: 'medium'
      },
      {
        vehicle: vehicles[0]._id,
        maintenanceType: 'brake_service',
        serviceCategory: 'corrective',
        title: 'Brake Pad Replacement',
        description: 'Replace worn brake pads and check brake system',
        scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days
        serviceProvider: {
          name: 'Brake Specialists',
          type: 'authorized_dealer',
          contact: '987-654-3210'
        },
        preServiceCondition: {
          odometer: vehicles[0].currentOdometer || 10000
        },
        totalCost: 4500,
        paymentDetails: {
          method: 'card'
        },
        priority: 'high'
      },
      {
        vehicle: vehicles[Math.min(1, vehicles.length - 1)]._id,
        maintenanceType: 'tire_change',
        serviceCategory: 'preventive',
        title: 'Tire Rotation & Alignment',
        description: 'Rotate tires and check wheel alignment',
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week
        serviceProvider: {
          name: 'Tire Pro Services',
          type: 'local_garage',
          contact: '555-123-4567'
        },
        preServiceCondition: {
          odometer: vehicles[Math.min(1, vehicles.length - 1)].currentOdometer || 15000
        },
        totalCost: 3200,
        paymentDetails: {
          method: 'upi'
        },
        priority: 'low'
      }
    ];
    
    // Create one overdue record
    const overdueRecord = {
      vehicle: vehicles[0]._id,
      maintenanceType: 'engine_repair',
      serviceCategory: 'emergency',
      title: 'Engine Check - Overdue',
      description: 'Engine diagnostic and repair - overdue maintenance',
      scheduledDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
      serviceProvider: {
        name: 'Engine Experts',
        type: 'authorized_dealer',
        contact: '111-222-3333'
      },
      preServiceCondition: {
        odometer: vehicles[0].currentOdometer || 12000
      },
      totalCost: 8500,
      paymentDetails: {
        method: 'bank_transfer'
      },
      priority: 'critical'
    };
    
    maintenanceRecords.push(overdueRecord);
    
    const createdRecords = [];
    
    for (const recordData of maintenanceRecords) {
      try {
        const response = await axios.post('http://localhost:8000/api/fleet-maintenance', recordData, { headers });
        createdRecords.push(response.data.data.maintenanceRecord);
        console.log(`✅ Created: ${recordData.title}`);
      } catch (error) {
        console.log(`❌ Failed to create ${recordData.title}:`, error.response?.data?.message || error.message);
      }
    }
    
    console.log(`\n✅ Created ${createdRecords.length} maintenance records for dashboard testing`);
    
    // Test the APIs to show what the dashboard will display
    console.log('\n📊 Dashboard Data Preview:');
    
    const statsResponse = await axios.get('http://localhost:8000/api/fleet-maintenance/meta/stats', { headers });
    const stats = statsResponse.data.data.summary;
    console.log(`   Total Maintenance: ${stats.totalRecords}`);
    console.log(`   Pending: ${stats.pendingRecords}`);
    console.log(`   Overdue: ${stats.overdueRecords}`);
    
    const upcomingResponse = await axios.get('http://localhost:8000/api/fleet-maintenance/meta/upcoming', { headers });
    const upcoming = upcomingResponse.data.data;
    console.log(`   Upcoming (7 days): ${upcoming.summary.upcomingCount}`);
    console.log(`   Overdue Count: ${upcoming.summary.overdueCount}`);
    
    console.log('\n🎯 Dashboard Features Added:');
    console.log('   ✅ Fleet Maintenance Statistics Cards');
    console.log('   ✅ Color-coded alerts (Red=Overdue, Orange=Due Soon, Green=Scheduled)');
    console.log('   ✅ Upcoming Maintenance List with vehicle details');
    console.log('   ✅ Service provider information');
    console.log('   ✅ Days until/overdue calculations');
    
    console.log('\n🚀 Test the dashboard at: http://localhost:3000');
    console.log('   Navigate to Dashboard to see Fleet Maintenance alerts!');
    
  } catch (error) {
    console.error('❌ Error creating sample maintenance:', error.response?.data || error.message);
  }
}

createSampleMaintenanceForDashboard();