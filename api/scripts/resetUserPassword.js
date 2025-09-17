require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function resetUserPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
    console.log('✓ Connected to MongoDB');

    // Reset password for test@test.com
    const email = 'test@test.com';
    const newPassword = 'password123';
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    const user = await User.findOneAndUpdate(
      { email },
      { password: hashedPassword },
      { new: true }
    );
    
    if (user) {
      console.log(`✅ Password reset successfully for ${email}`);
      console.log(`   New password: ${newPassword}`);
    } else {
      console.log(`❌ User ${email} not found`);
    }

    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.disconnect();
  }
}

resetUserPassword();