require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Route = require('../models/Route');
const Dealer = require('../models/Dealer');
const Order = require('../models/Order');

async function checkTenants() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
    console.log('✓ Connected to MongoDB');

    // Check users and their tenants
    const users = await User.find().select('email tenantId role');
    console.log('\n👥 Users and their tenants:');
    users.forEach(user => {
      console.log(`  ${user.email}: Tenant ${user.tenantId || 'NONE'} (${user.role})`);
    });

    // Check routes and their tenants
    const routes = await Route.find();
    console.log('\n📍 Routes and their tenants:');
    routes.forEach(route => {
      console.log(`  ${route.code} - ${route.name}: Tenant ${route.tenantId || 'NONE'}`);
    });

    // Check dealers and their tenants
    const dealers = await Dealer.find().select('name tenantId');
    console.log('\n🏪 Dealers and their tenants:');
    dealers.forEach(dealer => {
      console.log(`  ${dealer.name}: Tenant ${dealer.tenantId || 'NONE'}`);
    });

    // Check orders and their tenants
    const orders = await Order.find().select('orderNumber tenantId').limit(5);
    console.log('\n📦 Orders and their tenants:');
    orders.forEach(order => {
      console.log(`  ${order.orderNumber}: Tenant ${order.tenantId || 'NONE'}`);
    });

    // Fix: Assign TEST001 tenant to all data if needed
    console.log('\n🔧 Fixing tenant assignments...');
    
    // Update routes
    const routeUpdate = await Route.updateMany(
      { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] },
      { $set: { tenantId: 'TEST001' } }
    );
    console.log(`  ✅ Updated ${routeUpdate.modifiedCount} routes to TEST001`);
    
    // Update dealers
    const dealerUpdate = await Dealer.updateMany(
      { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] },
      { $set: { tenantId: 'TEST001' } }
    );
    console.log(`  ✅ Updated ${dealerUpdate.modifiedCount} dealers to TEST001`);
    
    // Update orders
    const orderUpdate = await Order.updateMany(
      { $or: [{ tenantId: { $exists: false } }, { tenantId: null }] },
      { $set: { tenantId: 'TEST001' } }
    );
    console.log(`  ✅ Updated ${orderUpdate.modifiedCount} orders to TEST001`);

    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.disconnect();
  }
}

checkTenants();