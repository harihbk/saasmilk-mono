require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api';

async function testDashboardAPIs() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('           Dashboard API Test');
  console.log('═══════════════════════════════════════════════════════');

  try {
    // Test order stats endpoint (what frontend should use)
    console.log('\n📊 Testing Order Stats Endpoint:');
    console.log('GET /api/orders/meta/stats');
    
    try {
      const statsResponse = await axios.get(`${BASE_URL}/orders/meta/stats`, {
        headers: { 'x-tenant-id': '002' }
      });
      
      console.log('✓ Stats Response:', JSON.stringify(statsResponse.data.data, null, 2));
    } catch (error) {
      console.log('❌ Stats Error:', error.response?.data || error.message);
    }

    // Test regular orders endpoint (what frontend currently uses)
    console.log('\n📋 Testing Regular Orders Endpoint:');
    console.log('GET /api/orders (limit 10)');
    
    try {
      const ordersResponse = await axios.get(`${BASE_URL}/orders?limit=10`, {
        headers: { 'x-tenant-id': '002' }
      });
      
      const orders = ordersResponse.data.data.orders || [];
      console.log(`✓ Found ${orders.length} orders`);
      
      if (orders.length > 0) {
        console.log('\n📝 Order Structure Check:');
        const sampleOrder = orders[0];
        console.log('Sample order fields:');
        console.log('  - orderNumber:', sampleOrder.orderNumber);
        console.log('  - status:', sampleOrder.status);
        console.log('  - pricing.total:', sampleOrder.pricing?.total);
        console.log('  - pricing.subtotal:', sampleOrder.pricing?.subtotal);
        console.log('  - payment.dueAmount:', sampleOrder.payment?.dueAmount);
        console.log('  - items.length:', sampleOrder.items?.length);
        
        // Manual calculation vs data
        const manualTotal = orders.reduce((sum, o) => sum + (o.pricing?.total || 0), 0);
        console.log(`\n💰 Revenue Calculation:`)
        console.log(`  Manual sum: ₹${manualTotal.toFixed(2)}`);
        console.log(`  Expected: ₹152.45`);
        console.log(`  Match: ${Math.abs(manualTotal - 152.45) < 0.01 ? '✅' : '❌'}`);
      }
    } catch (error) {
      console.log('❌ Orders Error:', error.response?.data || error.message);
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ API Test Complete - Check authentication if endpoints failed');
    console.log('═══════════════════════════════════════════════════════');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDashboardAPIs();