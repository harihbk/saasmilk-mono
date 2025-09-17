#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const Company = require('./models/Company');
const User = require('./models/User');

async function createTestUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
    console.log('Connected to MongoDB');
    
    // Create test company
    let company = await Company.findOne({ tenantId: 'TEST001' });
    if (!company) {
      company = await Company.create({
        tenantId: 'TEST001',
        name: 'Test Company',
        slug: 'test-company',
        contactInfo: {
          email: 'company@test.com',
          phone: '+1234567890'
        },
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345',
          country: 'Test Country'
        },
        subscription: {
          plan: 'professional',
          status: 'active',
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        }
      });
      console.log('✓ Test company created');
    } else {
      console.log('✓ Test company exists');
    }
    
    // Create test user
    let user = await User.findOne({ email: 'test@test.com' });
    if (!user) {
      user = await User.create({
        name: 'Test User',
        email: 'test@test.com',
        password: 'Test@123',
        role: 'admin',
        tenantId: 'TEST001',
        company: company._id,
        isEmailVerified: true
      });
      console.log('✓ Test user created');
    } else {
      console.log('✓ Test user exists');
    }
    
    console.log('Test setup complete!');
    console.log(`Company: ${company.name} (${company.tenantId})`);
    console.log(`User: ${user.name} (${user.email})`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
}

createTestUser();