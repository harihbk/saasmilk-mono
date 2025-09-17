#!/usr/bin/env node

/**
 * Fleet Management API Endpoint Test Script
 * Tests actual HTTP endpoints with authentication and tenant isolation
 */

require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000/api';
const TEST_TENANT = 'TEST001';

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

let authToken = null;
let testVehicleId = null;
let testMaintenanceId = null;

function logTest(testName, passed, error = null) {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    console.log(`${colors.green}✓ ${testName}${colors.reset}`);
  } else {
    testResults.failed++;
    testResults.errors.push({ test: testName, error: error?.message || 'Unknown error' });
    console.log(`${colors.red}✗ ${testName}${colors.reset}`);
    if (error) console.log(`  ${colors.red}Error: ${error.message}${colors.reset}`);
  }
}

async function authenticate() {
  console.log(`\n${colors.cyan}Authenticating...${colors.reset}`);
  
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'fleettest@test.com',
      password: 'password123'
    }, {
      headers: {
        'x-tenant-id': TEST_TENANT
      }
    });
    
    authToken = response.data.data?.token;
    logTest('Authentication', !!authToken);
    return !!authToken;
  } catch (error) {
    console.log('Auth error details:', error.response?.data || error.message);
    logTest('Authentication', false, error);
    return false;
  }
}

function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${authToken}`,
    'x-tenant-id': TEST_TENANT,
    'Content-Type': 'application/json'
  };
}

async function testFleetEndpoints() {
  console.log(`\n${colors.yellow}Testing Fleet Endpoints...${colors.reset}`);
  
  try {
    // Test 1: Get all vehicles (should be empty initially)
    const allVehiclesResponse = await axios.get(`${BASE_URL}/fleet`, {
      headers: getAuthHeaders()
    });
    logTest('GET /fleet - Get all vehicles', allVehiclesResponse.status === 200);

    // Test 2: Create new vehicle
    const vehicleData = {
      vehicleNumber: 'KA05CD1234',
      vehicleType: 'van',
      make: 'Mahindra',
      model: 'Bolero Pickup',
      year: 2021,
      registrationDate: '2021-03-15',
      fuelType: 'diesel',
      engineNumber: 'ENG654321',
      chassisNumber: 'CHA123789',
      currentOdometer: 25000,
      status: 'active',
      condition: 'good',
      ownership: 'owned',
      insurance: {
        policyNumber: 'INS12345',
        provider: 'HDFC ERGO',
        startDate: '2024-01-01',
        expiryDate: '2025-01-01',
        premium: 30000
      },
      pollution: {
        certificateNumber: 'POL12345',
        issuedDate: '2024-06-01',
        expiryDate: '2025-06-01'
      }
    };

    const createVehicleResponse = await axios.post(`${BASE_URL}/fleet`, vehicleData, {
      headers: getAuthHeaders()
    });
    
    testVehicleId = createVehicleResponse.data.data?.vehicle?._id;
    logTest('POST /fleet - Create vehicle', createVehicleResponse.status === 201 && !!testVehicleId);

    // Test 3: Get single vehicle
    if (testVehicleId) {
      const singleVehicleResponse = await axios.get(`${BASE_URL}/fleet/${testVehicleId}`, {
        headers: getAuthHeaders()
      });
      logTest('GET /fleet/:id - Get single vehicle', singleVehicleResponse.status === 200);
    }

    // Test 4: Update vehicle
    if (testVehicleId) {
      const updateData = {
        currentOdometer: 26000,
        condition: 'excellent'
      };
      
      const updateVehicleResponse = await axios.put(`${BASE_URL}/fleet/${testVehicleId}`, updateData, {
        headers: getAuthHeaders()
      });
      logTest('PUT /fleet/:id - Update vehicle', updateVehicleResponse.status === 200);
    }

    // Test 5: Update odometer
    if (testVehicleId) {
      const odometerData = {
        currentOdometer: 27000
      };
      
      const updateOdometerResponse = await axios.put(`${BASE_URL}/fleet/${testVehicleId}/odometer`, odometerData, {
        headers: getAuthHeaders()
      });
      logTest('PUT /fleet/:id/odometer - Update odometer', updateOdometerResponse.status === 200);
    }

    // Test 6: Get fleet statistics
    const statsResponse = await axios.get(`${BASE_URL}/fleet/meta/stats`, {
      headers: getAuthHeaders()
    });
    logTest('GET /fleet/meta/stats - Get fleet statistics', statsResponse.status === 200);

    // Test 7: Get expiring documents
    const expiringDocsResponse = await axios.get(`${BASE_URL}/fleet/meta/expiring-documents?days=30`, {
      headers: getAuthHeaders()
    });
    logTest('GET /fleet/meta/expiring-documents - Get expiring documents', expiringDocsResponse.status === 200);

  } catch (error) {
    logTest('Fleet endpoints test', false, error);
  }
}

async function testMaintenanceEndpoints() {
  console.log(`\n${colors.yellow}Testing Fleet Maintenance Endpoints...${colors.reset}`);
  
  try {
    // Test 1: Get all maintenance records
    const allMaintenanceResponse = await axios.get(`${BASE_URL}/fleet-maintenance`, {
      headers: getAuthHeaders()
    });
    logTest('GET /fleet-maintenance - Get all maintenance', allMaintenanceResponse.status === 200);

    // Test 2: Create maintenance record
    if (testVehicleId) {
      const maintenanceData = {
        vehicle: testVehicleId,
        maintenanceType: 'routine_service',
        serviceCategory: 'preventive',
        title: 'Routine Service - 27000 KM',
        description: 'Regular maintenance service at 27000 kilometers',
        scheduledDate: new Date().toISOString(),
        serviceProvider: {
          name: 'Mahindra Service Center',
          type: 'authorized_dealer',
          contactPerson: 'Service Manager',
          phone: '9876543210',
          address: {
            city: 'Bangalore',
            state: 'Karnataka'
          }
        },
        preServiceCondition: {
          odometer: 27000,
          fuelLevel: 75,
          condition: 'good',
          issues: ['Air filter needs replacement']
        },
        totalCost: 8000,
        paymentDetails: {
          method: 'card',
          status: 'pending'
        },
        costBreakdown: {
          laborCost: 3000,
          partsCost: 4000,
          taxAmount: 1000
        }
      };

      const createMaintenanceResponse = await axios.post(`${BASE_URL}/fleet-maintenance`, maintenanceData, {
        headers: getAuthHeaders()
      });
      
      testMaintenanceId = createMaintenanceResponse.data.data?.maintenanceRecord?._id;
      logTest('POST /fleet-maintenance - Create maintenance', createMaintenanceResponse.status === 201 && !!testMaintenanceId);
    }

    // Test 3: Get single maintenance record
    if (testMaintenanceId) {
      const singleMaintenanceResponse = await axios.get(`${BASE_URL}/fleet-maintenance/${testMaintenanceId}`, {
        headers: getAuthHeaders()
      });
      logTest('GET /fleet-maintenance/:id - Get single maintenance', singleMaintenanceResponse.status === 200);
    }

    // Test 4: Update maintenance record
    if (testMaintenanceId) {
      const updateData = {
        status: 'in_progress',
        startDate: new Date().toISOString()
      };
      
      const updateMaintenanceResponse = await axios.put(`${BASE_URL}/fleet-maintenance/${testMaintenanceId}`, updateData, {
        headers: getAuthHeaders()
      });
      logTest('PUT /fleet-maintenance/:id - Update maintenance', updateMaintenanceResponse.status === 200);
    }

    // Test 5: Complete maintenance
    if (testMaintenanceId) {
      const completionData = {
        postServiceCondition: {
          odometer: 27000,
          condition: 'excellent'
        }
      };
      
      const completeMaintenanceResponse = await axios.put(`${BASE_URL}/fleet-maintenance/${testMaintenanceId}/complete`, completionData, {
        headers: getAuthHeaders()
      });
      logTest('PUT /fleet-maintenance/:id/complete - Complete maintenance', completeMaintenanceResponse.status === 200);
    }

    // Test 6: Get maintenance statistics
    const maintenanceStatsResponse = await axios.get(`${BASE_URL}/fleet-maintenance/meta/stats`, {
      headers: getAuthHeaders()
    });
    logTest('GET /fleet-maintenance/meta/stats - Get maintenance stats', maintenanceStatsResponse.status === 200);

    // Test 7: Get upcoming maintenance
    const upcomingMaintenanceResponse = await axios.get(`${BASE_URL}/fleet-maintenance/meta/upcoming?days=30`, {
      headers: getAuthHeaders()
    });
    logTest('GET /fleet-maintenance/meta/upcoming - Get upcoming maintenance', upcomingMaintenanceResponse.status === 200);

  } catch (error) {
    logTest('Maintenance endpoints test', false, error);
  }
}

async function testMenuEndpoints() {
  console.log(`\n${colors.yellow}Testing Menu Endpoints...${colors.reset}`);
  
  try {
    // Test 1: Get main menu
    const menuResponse = await axios.get(`${BASE_URL}/menu`, {
      headers: getAuthHeaders()
    });
    logTest('GET /menu - Get navigation menu', menuResponse.status === 200);

    // Test 2: Get fleet menu
    const fleetMenuResponse = await axios.get(`${BASE_URL}/menu/fleet`, {
      headers: getAuthHeaders()
    });
    logTest('GET /menu/fleet - Get fleet menu', fleetMenuResponse.status === 200);

    // Test 3: Get notifications
    const notificationsResponse = await axios.get(`${BASE_URL}/menu/notifications`, {
      headers: getAuthHeaders()
    });
    logTest('GET /menu/notifications - Get notifications', notificationsResponse.status === 200);

  } catch (error) {
    logTest('Menu endpoints test', false, error);
  }
}

async function testTenantIsolation() {
  console.log(`\n${colors.yellow}Testing Tenant Isolation...${colors.reset}`);
  
  try {
    // Test 1: Try to access with wrong tenant ID
    const wrongTenantHeaders = {
      'Authorization': `Bearer ${authToken}`,
      'x-tenant-id': 'WRONG001',
      'Content-Type': 'application/json'
    };

    try {
      await axios.get(`${BASE_URL}/fleet`, {
        headers: wrongTenantHeaders
      });
      logTest('Wrong tenant access blocked', false);
    } catch (error) {
      logTest('Wrong tenant access blocked', error.response?.status === 403 || error.response?.status === 400);
    }

    // Test 2: Try to access vehicle from different tenant
    if (testVehicleId) {
      try {
        await axios.get(`${BASE_URL}/fleet/${testVehicleId}`, {
          headers: wrongTenantHeaders
        });
        logTest('Cross-tenant vehicle access blocked', false);
      } catch (error) {
        logTest('Cross-tenant vehicle access blocked', error.response?.status === 403 || error.response?.status === 404);
      }
    }

    // Test 3: Verify correct tenant access works
    const correctTenantResponse = await axios.get(`${BASE_URL}/fleet`, {
      headers: getAuthHeaders()
    });
    logTest('Correct tenant access works', correctTenantResponse.status === 200);

  } catch (error) {
    logTest('Tenant isolation test', false, error);
  }
}

async function cleanup() {
  console.log(`\n${colors.cyan}Cleaning up test data...${colors.reset}`);
  
  try {
    // Delete maintenance record
    if (testMaintenanceId) {
      await axios.delete(`${BASE_URL}/fleet-maintenance/${testMaintenanceId}`, {
        headers: getAuthHeaders()
      });
    }

    // Delete vehicle
    if (testVehicleId) {
      await axios.delete(`${BASE_URL}/fleet/${testVehicleId}`, {
        headers: getAuthHeaders()
      });
    }

    console.log(`${colors.green}✓ Test data cleanup complete${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Cleanup failed:${colors.reset}`, error.message);
  }
}

async function main() {
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}         Fleet Management API Endpoint Tests${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.cyan}Testing API at: ${BASE_URL}${colors.reset}`);
  console.log(`${colors.cyan}Tenant ID: ${TEST_TENANT}${colors.reset}`);
  
  try {
    const authenticated = await authenticate();
    if (!authenticated) {
      console.error(`${colors.red}Authentication failed. Please ensure the server is running and test user exists.${colors.reset}`);
      process.exit(1);
    }

    await testFleetEndpoints();
    await testMaintenanceEndpoints();
    await testMenuEndpoints();
    await testTenantIsolation();
    
    await cleanup();
    
  } catch (error) {
    console.error(`${colors.red}Test suite failed:${colors.reset}`, error);
  }
  
  // Show results
  console.log(`\n${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}                    TEST RESULTS${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  
  console.log(`Total Tests: ${testResults.total}`);
  console.log(`${colors.green}Passed: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testResults.failed}${colors.reset}`);
  
  if (testResults.failed > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    testResults.errors.forEach(error => {
      console.log(`  - ${error.test}: ${error.error}`);
    });
  }
  
  const successRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  console.log(`\n${colors.cyan}Success Rate: ${successRate}%${colors.reset}`);
  
  if (successRate >= 90) {
    console.log(`\n${colors.green}🎉 Fleet API endpoint tests completed successfully!${colors.reset}`);
  } else if (successRate >= 75) {
    console.log(`\n${colors.yellow}⚠️  Fleet API endpoint tests completed with some issues.${colors.reset}`);
  } else {
    console.log(`\n${colors.red}❌ Fleet API endpoint tests failed. Please review the errors.${colors.reset}`);
  }
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (err) => {
  console.error(`${colors.red}Unhandled rejection:${colors.reset}`, err);
  process.exit(1);
});

// Run the test suite
main().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});