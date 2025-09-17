require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkUser() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
  
  const user = await User.findOne({ email: 'fleettest@test.com' });
  console.log('User found:', user ? 'Yes' : 'No');
  if (user) {
    console.log('User details:', {
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      isActive: user.isActive,
      hasPassword: !!user.password
    });
  }
  
  mongoose.disconnect();
}

checkUser().catch(console.error);