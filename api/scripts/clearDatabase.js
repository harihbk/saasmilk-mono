const mongoose = require('mongoose');
require('dotenv').config();

// Import all models that need to be cleared
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const User = require('../models/User');
const Company = require('../models/Company');
const Category = require('../models/Category');
const Supplier = require('../models/Supplier');
const Inventory = require('../models/Inventory');
const Order = require('../models/Order');

async function clearDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('🚨 WARNING: This will delete ALL data from the database!');
    console.log('This includes:');
    console.log('- All products');
    console.log('- All customers');
    console.log('- All tenant users (but keeps super admin users)');
    console.log('- All companies');
    console.log('- All categories');
    console.log('- All suppliers');
    console.log('- All inventory');
    console.log('- All orders');
    console.log('');

    // Clear all tenant-specific data
    console.log('Clearing Products...');
    const productsDeleted = await Product.deleteMany({});
    console.log(`✅ Deleted ${productsDeleted.deletedCount} products`);

    console.log('Clearing Customers...');
    const customersDeleted = await Customer.deleteMany({});
    console.log(`✅ Deleted ${customersDeleted.deletedCount} customers`);

    console.log('Clearing Categories...');
    const categoriesDeleted = await Category.deleteMany({});
    console.log(`✅ Deleted ${categoriesDeleted.deletedCount} categories`);

    console.log('Clearing Suppliers...');
    const suppliersDeleted = await Supplier.deleteMany({});
    console.log(`✅ Deleted ${suppliersDeleted.deletedCount} suppliers`);

    console.log('Clearing Inventory...');
    const inventoryDeleted = await Inventory.deleteMany({});
    console.log(`✅ Deleted ${inventoryDeleted.deletedCount} inventory records`);

    console.log('Clearing Orders...');
    const ordersDeleted = await Order.deleteMany({});
    console.log(`✅ Deleted ${ordersDeleted.deletedCount} orders`);

    console.log('Clearing Tenant Users (keeping super admins)...');
    const usersDeleted = await User.deleteMany({ 
      role: { $ne: 'super_admin' } 
    });
    console.log(`✅ Deleted ${usersDeleted.deletedCount} tenant users`);

    console.log('Clearing Companies...');
    const companiesDeleted = await Company.deleteMany({});
    console.log(`✅ Deleted ${companiesDeleted.deletedCount} companies`);

    console.log('');
    console.log('🎉 Database cleared successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Create new companies through SaaS Admin panel');
    console.log('2. Create users for each company');
    console.log('3. Login as tenant users and create data');
    console.log('4. Verify tenant isolation is working');

  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the script
clearDatabase();
