require('dotenv').config();
const axios = require('axios');

async function testRouteMetrics() {
  try {
    // First login to get token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:8000/api/auth/login', {
      email: 'hari@gmail.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    const tenantId = loginResponse.data.data.user.tenantId;
    console.log('✅ Login successful');
    console.log(`  Token: ${token.substring(0, 20)}...`);
    console.log(`  Tenant: ${tenantId}`);
    
    // Test routes endpoint
    console.log('\n📍 Testing GET /api/routes...');
    const routesResponse = await axios.get('http://localhost:8000/api/routes', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    });
    
    console.log('✅ Routes fetched successfully:');
    console.log(`  Total routes: ${routesResponse.data.data.routes.length}`);
    routesResponse.data.data.routes.forEach(route => {
      console.log(`  - ${route.code}: ${route.name}`);
    });
    
    // Test outstanding metrics endpoint
    console.log('\n📊 Testing GET /api/routes/meta/outstanding-metrics...');
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const metricsResponse = await axios.get('http://localhost:8000/api/routes/meta/outstanding-metrics', {
      params: {
        startDate: thirtyDaysAgo.toISOString().split('T')[0],
        endDate: today.toISOString().split('T')[0]
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      }
    });
    
    console.log('✅ Metrics fetched successfully:');
    const data = metricsResponse.data.data;
    console.log(`  Summary:`);
    console.log(`    Total Routes: ${data.summary.totalRoutes}`);
    console.log(`    Total Orders: ${data.summary.totalOrders}`);
    console.log(`    Total Amount: ₹${data.summary.totalAmount}`);
    console.log(`    Outstanding: ₹${data.summary.outstandingAmount}`);
    console.log(`    Collection Efficiency: ${data.summary.collectionEfficiency}%`);
    
    console.log(`\n  Route Metrics:`);
    data.routeMetrics.forEach(metric => {
      console.log(`    Route: ${metric.route?.code || 'Unknown'} - ${metric.route?.name || 'N/A'}`);
      console.log(`      Orders: ${metric.metrics.totalOrders}`);
      console.log(`      Amount: ₹${metric.metrics.totalAmount}`);
      console.log(`      Outstanding: ₹${metric.metrics.outstandingAmount}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.error('   Endpoint not found - check if route is registered');
    }
  }
}

testRouteMetrics();