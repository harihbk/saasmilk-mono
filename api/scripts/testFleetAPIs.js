#!/usr/bin/env node

/**
 * Fleet Management API Test Script
 * Tests fleet and fleet maintenance APIs with multi-tenant isolation
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Fleet = require('../models/Fleet');
const FleetMaintenance = require('../models/FleetMaintenance');
const User = require('../models/User');
const Company = require('../models/Company');

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

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`${colors.green}✓ Connected to MongoDB${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ MongoDB connection error:${colors.reset}`, error);
    process.exit(1);
  }
}

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

async function setupTestData() {
  console.log(`\n${colors.cyan}Setting up test data...${colors.reset}`);
  
  try {
    // Get or create test company
    let company = await Company.findOne({ tenantId: 'TEST001' });
    if (!company) {
      company = await Company.create({
        tenantId: 'TEST001',
        name: 'Test Fleet Company',
        slug: 'test-fleet-company',
        contactInfo: {
          email: 'test@fleetcompany.com',
          phone: '1234567890'
        },
        isActive: true
      });
    }

    // Get or create test user
    let user = await User.findOne({ email: 'fleetmanager@test.com' });
    if (!user) {
      user = await User.create({
        name: 'Fleet Manager',
        email: 'fleetmanager@test.com',
        password: 'password123',
        role: 'manager',
        tenantId: 'TEST001',
        company: company._id,
        isActive: true
      });
    }

    console.log(`${colors.green}✓ Test data setup complete${colors.reset}`);
    return { company, user };
  } catch (error) {
    console.error(`${colors.red}✗ Test data setup failed:${colors.reset}`, error.message);
    throw error;
  }
}

async function testFleetModel() {
  console.log(`\n${colors.yellow}Testing Fleet Model...${colors.reset}`);
  
  try {
    // Test 1: Create fleet vehicle
    const vehicleData = {
      vehicleNumber: 'KA01AB1234',
      vehicleType: 'van',
      make: 'Tata',
      model: 'Ace',
      year: 2020,
      registrationDate: new Date('2020-01-15'),
      fuelType: 'diesel',
      engineNumber: 'ENG123456',
      chassisNumber: 'CHA789012',
      currentOdometer: 15000,
      status: 'active',
      condition: 'good',
      ownership: 'owned',
      tenantId: 'TEST001',
      createdBy: new mongoose.Types.ObjectId(),
      insurance: {
        policyNumber: 'INS001',
        provider: 'Test Insurance',
        startDate: new Date('2023-01-01'),
        expiryDate: new Date('2024-01-01'),
        premium: 25000
      },
      pollution: {
        certificateNumber: 'POL001',
        issuedDate: new Date('2023-06-01'),
        expiryDate: new Date('2024-06-01')
      }
    };

    const vehicle = await Fleet.create(vehicleData);
    logTest('Create fleet vehicle', !!vehicle._id);

    // Test 2: Test virtual fields
    const age = vehicle.age;
    logTest('Vehicle age virtual field', age === new Date().getFullYear() - 2020);

    // Test 3: Test expiring documents method
    const expiringDocs = vehicle.getExpiringDocuments(365);
    logTest('Get expiring documents method', Array.isArray(expiringDocs));

    // Test 4: Test odometer update
    const oldReading = vehicle.currentOdometer;
    await vehicle.updateOdometer(16000);
    logTest('Update odometer reading', vehicle.currentOdometer === 16000);

    // Test 5: Test total cost calculation
    const totalCost = vehicle.calculateTotalCost();
    logTest('Calculate total cost method', typeof totalCost === 'number');

    // Test 6: Test tenant isolation
    const vehiclesByTenant = await Fleet.find({ tenantId: 'TEST001' });
    logTest('Tenant isolation works', vehiclesByTenant.length > 0);

    const wrongTenantVehicles = await Fleet.find({ tenantId: 'WRONG001' });
    logTest('Wrong tenant returns empty', wrongTenantVehicles.length === 0);

    return vehicle;
  } catch (error) {
    logTest('Fleet model test', false, error);
    throw error;
  }
}

async function testFleetMaintenanceModel(vehicle) {
  console.log(`\n${colors.yellow}Testing Fleet Maintenance Model...${colors.reset}`);
  
  try {
    // Test 1: Create maintenance record
    const maintenanceData = {
      vehicle: vehicle._id,
      maintenanceType: 'routine_service',
      serviceCategory: 'preventive',
      title: 'Routine Service - 15000 KM',
      description: 'Regular maintenance service at 15000 kilometers',
      scheduledDate: new Date(),
      serviceProvider: {
        name: 'Test Garage',
        type: 'local_garage',
        contactPerson: 'John Mechanic',
        phone: '9876543210'
      },
      preServiceCondition: {
        odometer: 15000,
        fuelLevel: 80,
        condition: 'good',
        issues: ['Minor oil leak']
      },
      totalCost: 5000,
      paymentDetails: {
        method: 'cash',
        status: 'pending'
      },
      costBreakdown: {
        laborCost: 2000,
        partsCost: 2500,
        taxAmount: 500
      },
      tenantId: 'TEST001',
      createdBy: new mongoose.Types.ObjectId()
    };

    const maintenance = await FleetMaintenance.create(maintenanceData);
    logTest('Create maintenance record', !!maintenance._id);

    // Test 2: Test virtual fields
    const isOverdue = maintenance.isOverdue;
    logTest('Maintenance overdue virtual field', typeof isOverdue === 'boolean');

    // Test 3: Test cost calculation method
    const calculatedCost = maintenance.calculateTotalCost();
    logTest('Calculate total cost method', calculatedCost === 5000);

    // Test 4: Test receipt addition
    const receiptData = {
      type: 'invoice',
      fileName: 'test-receipt.pdf',
      originalName: 'receipt.pdf',
      fileUrl: '/uploads/receipts/test/test-receipt.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      amount: 2500,
      receiptNumber: 'REC001',
      vendor: 'Parts Supplier'
    };

    await maintenance.addReceipt(receiptData);
    logTest('Add receipt to maintenance', maintenance.receipts.length === 1);

    // Test 5: Test completion
    await maintenance.completeMaintenance({
      completionDate: new Date(),
      completedBy: new mongoose.Types.ObjectId(),
      postServiceCondition: {
        odometer: 15000,
        condition: 'excellent'
      }
    });
    logTest('Complete maintenance', maintenance.status === 'completed');

    // Test 6: Test tenant isolation
    const maintenanceByTenant = await FleetMaintenance.find({ tenantId: 'TEST001' });
    logTest('Maintenance tenant isolation', maintenanceByTenant.length > 0);

    return maintenance;
  } catch (error) {
    logTest('Fleet maintenance model test', false, error);
    throw error;
  }
}

async function testDataValidation() {
  console.log(`\n${colors.yellow}Testing Data Validation...${colors.reset}`);
  
  try {
    // Test 1: Invalid vehicle number
    try {
      await Fleet.create({
        vehicleNumber: 'INVALID',
        vehicleType: 'van',
        make: 'Test',
        model: 'Test',
        year: 2020,
        registrationDate: new Date(),
        fuelType: 'diesel',
        tenantId: 'TEST001',
        createdBy: new mongoose.Types.ObjectId()
      });
      logTest('Invalid vehicle number validation', false);
    } catch (error) {
      logTest('Invalid vehicle number validation', error.message.includes('valid Indian vehicle number'));
    }

    // Test 2: Missing required fields
    try {
      await Fleet.create({
        vehicleType: 'van',
        tenantId: 'TEST001'
      });
      logTest('Required fields validation', false);
    } catch (error) {
      logTest('Required fields validation', error.message.includes('required'));
    }

    // Test 3: Invalid maintenance type
    try {
      await FleetMaintenance.create({
        vehicle: new mongoose.Types.ObjectId(),
        maintenanceType: 'invalid_type',
        tenantId: 'TEST001'
      });
      logTest('Invalid maintenance type validation', false);
    } catch (error) {
      logTest('Invalid maintenance type validation', error.message.includes('invalid_type'));
    }

  } catch (error) {
    logTest('Data validation test', false, error);
  }
}

async function testComplexQueries() {
  console.log(`\n${colors.yellow}Testing Complex Queries...${colors.reset}`);
  
  try {
    // Test 1: Aggregation for fleet statistics
    const fleetStats = await Fleet.aggregate([
      { $match: { tenantId: 'TEST001' } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgOdometer: { $avg: '$currentOdometer' }
        }
      }
    ]);
    logTest('Fleet statistics aggregation', Array.isArray(fleetStats));

    // Test 2: Maintenance cost analysis
    const maintenanceCosts = await FleetMaintenance.aggregate([
      { $match: { tenantId: 'TEST001', status: 'completed' } },
      {
        $group: {
          _id: '$maintenanceType',
          totalCost: { $sum: '$totalCost' },
          count: { $sum: 1 },
          avgCost: { $avg: '$totalCost' }
        }
      }
    ]);
    logTest('Maintenance cost analysis', Array.isArray(maintenanceCosts));

    // Test 3: Vehicles with expiring documents
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringVehicles = await Fleet.find({
      tenantId: 'TEST001',
      $or: [
        { 'insurance.expiryDate': { $lte: thirtyDaysFromNow } },
        { 'pollution.expiryDate': { $lte: thirtyDaysFromNow } }
      ]
    });
    logTest('Vehicles with expiring documents query', Array.isArray(expiringVehicles));

    // Test 4: Upcoming maintenance
    const upcomingMaintenance = await FleetMaintenance.find({
      tenantId: 'TEST001',
      status: { $in: ['scheduled', 'in_progress'] },
      scheduledDate: { $gte: new Date() }
    }).populate('vehicle', 'vehicleNumber make model');
    logTest('Upcoming maintenance with population', Array.isArray(upcomingMaintenance));

  } catch (error) {
    logTest('Complex queries test', false, error);
  }
}

async function cleanupTestData() {
  console.log(`\n${colors.cyan}Cleaning up test data...${colors.reset}`);
  
  try {
    await FleetMaintenance.deleteMany({ tenantId: 'TEST001' });
    await Fleet.deleteMany({ tenantId: 'TEST001' });
    console.log(`${colors.green}✓ Test data cleanup complete${colors.reset}`);
  } catch (error) {
    console.error(`${colors.red}✗ Cleanup failed:${colors.reset}`, error.message);
  }
}

async function main() {
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.magenta}           Fleet Management API Test Suite${colors.reset}`);
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`);
  
  await connectDB();
  
  try {
    const { company, user } = await setupTestData();
    
    const vehicle = await testFleetModel();
    const maintenance = await testFleetMaintenanceModel(vehicle);
    
    await testDataValidation();
    await testComplexQueries();
    
    await cleanupTestData();
    
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
    console.log(`\n${colors.green}🎉 Fleet API tests completed successfully!${colors.reset}`);
  } else if (successRate >= 75) {
    console.log(`\n${colors.yellow}⚠️  Fleet API tests completed with some issues.${colors.reset}`);
  } else {
    console.log(`\n${colors.red}❌ Fleet API tests failed. Please review the errors.${colors.reset}`);
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