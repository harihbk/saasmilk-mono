require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
    console.log('✓ Connected to MongoDB');

    const users = await User.find().select('name email role');
    console.log(`\n👥 Total Users: ${users.length}`);
    
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.name}) - Role: ${user.role}`);
    });

    if (users.length === 0) {
      console.log('\n⚠️  No users found! Creating admin user...');
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      const adminUser = await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      });
      
      console.log('✅ Admin user created:');
      console.log('   Email: admin@example.com');
      console.log('   Password: admin123');
    } else {
      console.log('\n💡 Use one of the above emails to login');
      console.log('   Default password is usually: admin123 or password123');
    }

    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.disconnect();
  }
}

checkUsers();