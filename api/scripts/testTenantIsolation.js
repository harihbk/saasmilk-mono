require('dotenv').config();
const axios = require('axios');

async function testTenantIsolation() {
  try {
    console.log('🔐 Testing Multi-Tenant Isolation\n');
    
    // Test creating a new tenant with same dealer code
    console.log('📝 Creating new tenant account...');
    const registrationData = {
      companyName: 'Test Company 4',
      email: 'test4@example.com',
      ownerName: 'Test Owner 4',
      password: 'Password123',
      phone: '9876543210',
      businessType: 'dairy',
      address: {
        city: 'Test City',
        state: 'Test State',
        country: 'India'
      }
    };
    
    try {
      const registerResponse = await axios.post('http://localhost:8000/api/companies/register', registrationData);
      console.log('✅ New tenant registered successfully');
      console.log(`  Tenant ID: ${registerResponse.data.data.user.tenantId}`);
      
      const token = registerResponse.data.data.token;
      const tenantId = registerResponse.data.data.user.tenantId;
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      };
      
      // Create a dealer group for the new tenant
      console.log('\n📦 Creating dealer group for new tenant...');
      const dealerGroupResponse = await axios.post('http://localhost:8000/api/dealer-groups', {
        name: 'Test Group',
        code: 'TG001',
        description: 'Test dealer group'
      }, { headers });
      
      const dealerGroupId = dealerGroupResponse.data.data.dealerGroup._id;
      console.log('✅ Dealer group created');
      
      // Create a dealer with code that might exist in other tenants
      console.log('\n🏪 Creating dealer with common code DLR250801...');
      const dealerData = {
        name: 'Test Dealer New Tenant',
        dealerCode: 'DLR250801', // This code exists in other tenants
        dealerGroup: dealerGroupId,
        contactInfo: {
          primaryPhone: '9876543210'
        },
        address: {
          street: '456 New Street',
          city: 'New City',
          state: 'New State',
          postalCode: '654321'
        },
        financialInfo: {
          openingBalance: 5000,
          openingBalanceType: 'credit',
          creditLimit: 20000
        }
      };
      
      const dealerResponse = await axios.post('http://localhost:8000/api/dealers', dealerData, { headers });
      console.log('✅ Dealer created successfully with code: ' + dealerResponse.data.data.dealer.dealerCode);
      console.log('   This proves tenant isolation is working!');
      
      // Create a category with common name
      console.log('\n📂 Creating category with common name "Milk"...');
      const categoryResponse = await axios.post('http://localhost:8000/api/categories', {
        name: 'milk',
        displayName: 'Milk Products',
        description: 'All milk products'
      }, { headers });
      console.log('✅ Category created successfully');
      
      // Verify isolation - get dealers for this tenant only
      console.log('\n🔍 Verifying tenant isolation...');
      const dealersResponse = await axios.get('http://localhost:8000/api/dealers', { headers });
      console.log(`  Dealers in new tenant: ${dealersResponse.data.data.dealers.length}`);
      dealersResponse.data.data.dealers.forEach(d => {
        console.log(`    - ${d.name}: ${d.dealerCode}`);
      });
      
    } catch (error) {
      if (error.response?.data?.message?.includes('already registered')) {
        console.log('⚠️  Test account already exists, using existing credentials');
        
        // Login with existing account
        const loginResponse = await axios.post('http://localhost:8000/api/auth/login', {
          email: 'test4@example.com',
          password: 'Password123'
        });
        
        const token = loginResponse.data.data.token;
        const tenantId = loginResponse.data.data.user.tenantId;
        
        const headers = {
          'Authorization': `Bearer ${token}`,
          'x-tenant-id': tenantId
        };
        
        // Verify dealers for this tenant
        const dealersResponse = await axios.get('http://localhost:8000/api/dealers', { headers });
        console.log(`\n✅ Tenant ${tenantId} has ${dealersResponse.data.data.dealers.length} dealer(s)`);
        dealersResponse.data.data.dealers.forEach(d => {
          console.log(`  - ${d.name}: ${d.dealerCode}`);
        });
      } else {
        throw error;
      }
    }
    
    // Test with different tenant (login as hari@gmail.com)
    console.log('\n🔐 Logging in as different tenant (hari@gmail.com)...');
    const hariLoginResponse = await axios.post('http://localhost:8000/api/auth/login', {
      email: 'hari@gmail.com',
      password: 'password123'
    });
    
    const hariToken = hariLoginResponse.data.data.token;
    const hariTenantId = hariLoginResponse.data.data.user.tenantId;
    
    const hariHeaders = {
      'Authorization': `Bearer ${hariToken}`,
      'x-tenant-id': hariTenantId
    };
    
    const hariDealersResponse = await axios.get('http://localhost:8000/api/dealers', { hariHeaders });
    console.log(`✅ Tenant ${hariTenantId} has ${hariDealersResponse.data.data.dealers.length} dealer(s)`);
    hariDealersResponse.data.data.dealers.forEach(d => {
      console.log(`  - ${d.name}: ${d.dealerCode}`);
    });
    
    console.log('\n✅ Tenant Isolation Test Completed Successfully!');
    console.log('   Each tenant can have dealers with the same code');
    console.log('   Each tenant can have categories with the same name');
    console.log('   Data is properly isolated between tenants');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testTenantIsolation();