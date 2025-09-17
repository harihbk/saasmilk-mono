// Create test user for order testing

/**
 * Create test user for order testing
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
  console.log('Connected to MongoDB');
}

async function createTestUser() {
  try {
    await connectDB();

    // Check if test user already exists
    const existingUser = await User.findOne({ 
      email: 'ordertest@test.com',
      tenantId: 'TEST001'
    });

    if (existingUser) {
      console.log('✓ Test user already exists');
      mongoose.disconnect();
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Password123', salt);

    // Create test user
    const testUser = await User.create({
      name: 'Order Test User',
      email: 'ordertest@test.com',
      password: hashedPassword,
      role: 'admin',
      tenantId: 'TEST001',
      company: 'Test Company',
      isActive: true,
      profile: {
        firstName: 'Order',
        lastName: 'Tester',
        phone: '+1234567890',
        dateOfBirth: new Date('1990-01-01'),
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country'
        }
      }
    });

    console.log('✓ Test user created successfully');
    console.log(`  Email: ${testUser.email}`);
    console.log(`  Role: ${testUser.role}`);
    console.log(`  Tenant: ${testUser.tenantId}`);

    mongoose.disconnect();

  } catch (error) {
    console.error('Failed to create test user:', error);
    mongoose.disconnect();
  }
}

createTestUser();