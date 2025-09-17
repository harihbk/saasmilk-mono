const axios = require('axios');

async function testSaasAdminUpdate() {
  try {
    // First, login as SaaS admin to get a valid token
    const loginResponse = await axios.post('http://localhost:8000/api/saas-admin/login', {
      email: 'admin@admin.com',
      password: 'Hari@123'
    });

    console.log('Login response:', loginResponse.data);
    const token = loginResponse.data.token || loginResponse.data.data?.token;

    if (!token) {
      console.log('No token received');
      return;
    }
    console.log('Got SaaS admin token');

    // Now try to update a tenant without x-tenant-id header
    console.log('\nTest 1: Update tenant WITHOUT x-tenant-id header');
    try {
      const updateResponse = await axios.put(
        'http://localhost:8000/api/saas-admin/tenants/689ec45390c463e601dc60cc',
        { name: 'Test Company Updated Without Header' },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );
      console.log('Success:', updateResponse.data);
    } catch (error) {
      console.log('Error:', error.response?.data || error.message);
    }

    // Now try with x-tenant-id header
    console.log('\nTest 2: Update tenant WITH x-tenant-id header');
    try {
      const updateResponse = await axios.put(
        'http://localhost:8000/api/saas-admin/tenants/689ec45390c463e601dc60cc',
        { name: 'Test Company Updated With Header' },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-tenant-id': 'MILK001'
          }
        }
      );
      console.log('Success:', updateResponse.data);
    } catch (error) {
      console.log('Error:', error.response?.data || error.message);
    }

  } catch (error) {
    console.error('Login failed:', error.response?.data || error.message);
  }
}

testSaasAdminUpdate();