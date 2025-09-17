require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function testAuth() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
  
  const user = await User.findOne({ email: 'test@test.com', tenantId: 'TEST001' });
  if (!user) {
    console.log('User not found');
    mongoose.disconnect();
    return;
  }
  
  console.log('User found:', user.email, 'Active:', user.isActive);
  
  const isValid = await bcrypt.compare('Password123', user.password);
  console.log('Password valid:', isValid);
  
  mongoose.disconnect();
}

testAuth().catch(console.error);