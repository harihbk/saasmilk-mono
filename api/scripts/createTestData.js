require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');
const Warehouse = require('../models/Warehouse');

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
  console.log('✓ Connected to MongoDB');
}

async function createTestData() {
  try {
    await connectDB();

    const tenantId = 'TEST001';

    // Create warehouse if not exists
    let warehouse = await Warehouse.findOne({ code: 'WH-001', tenantId });
    if (!warehouse) {
      warehouse = await Warehouse.create({
        name: 'Main Warehouse',
        code: 'WH-001',
        address: {
          street: '123 Warehouse St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country'
        },
        capacity: {
          maxWeight: 10000,
          maxVolume: 5000
        },
        status: 'active',
        tenantId,
        createdBy: new mongoose.Types.ObjectId()
      });
      console.log('✓ Warehouse created');
    }

    // Create products
    const productsData = [
      { name: 'Apple', sku: 'APPLE001', price: 10, category: 'Fruits' },
      { name: 'Orange', sku: 'ORANGE001', price: 8, category: 'Fruits' },
      { name: 'Milk', sku: 'MILK001', price: 5, category: 'Dairy' }
    ];

    const products = [];
    for (const productData of productsData) {
      let product = await Product.findOne({ sku: productData.sku, tenantId });
      if (!product) {
        product = await Product.create({
          ...productData,
          description: `Fresh ${productData.name}`,
          status: 'active',
          tenantId,
          createdBy: new mongoose.Types.ObjectId()
        });
        console.log(`✓ Product created: ${product.name}`);
      }
      products.push(product);
    }

    // Create inventory for products
    for (const product of products) {
      let inventory = await Inventory.findOne({ 
        product: product._id, 
        'location.warehouse': warehouse._id,
        tenantId 
      });
      
      if (!inventory) {
        inventory = await Inventory.create({
          product: product._id,
          stock: {
            available: 100,
            reserved: 0,
            damaged: 0,
            expired: 0
          },
          location: {
            warehouse: warehouse._id,
            zone: 'A',
            shelf: '1',
            bin: '1'
          },
          thresholds: {
            minimum: 10,
            reorderPoint: 20,
            maximum: 1000
          },
          tenantId,
          createdBy: new mongoose.Types.ObjectId()
        });
        console.log(`✓ Inventory created for ${product.name}: 100 units`);
      }
    }

    // Create customer
    let customer = await Customer.findOne({ tenantId });
    if (!customer) {
      customer = await Customer.create({
        personalInfo: {
          firstName: 'Test',
          lastName: 'Customer',
          email: 'customer@test.com',
          phone: '+1234567890'
        },
        address: {
          street: '456 Customer St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country'
        },
        tenantId,
        createdBy: new mongoose.Types.ObjectId()
      });
      console.log('✓ Customer created');
    }

    console.log('\n✅ Test data creation completed!');
    console.log(`   Tenant: ${tenantId}`);
    console.log(`   Products: ${products.length}`);
    console.log(`   Customer: ${customer.personalInfo.firstName} ${customer.personalInfo.lastName}`);
    console.log(`   Warehouse: ${warehouse.name}`);

    mongoose.disconnect();

  } catch (error) {
    console.error('❌ Failed to create test data:', error);
    mongoose.disconnect();
  }
}

createTestData();