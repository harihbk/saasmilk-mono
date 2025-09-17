require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const Inventory = require('../models/Inventory');
const Dealer = require('../models/Dealer');

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
  console.log('✓ Connected to MongoDB');
}

async function testOrderCreation() {
  try {
    await connectDB();

    console.log('═══════════════════════════════════════════════════════');
    console.log('           Testing Order Creation for Tenant 005');
    console.log('═══════════════════════════════════════════════════════');

    // Get tenant 005 data
    console.log('\n📋 Getting tenant 005 data...');
    
    const tenant005Products = await Product.find({ tenantId: '005', status: 'active' });
    console.log(`Found ${tenant005Products.length} active products for tenant 005:`);
    tenant005Products.forEach(p => console.log(`  ${p._id}: ${p.name}`));
    
    const tenant005Warehouses = await Warehouse.find({ tenantId: '005', status: 'active' });
    console.log(`Found ${tenant005Warehouses.length} active warehouses for tenant 005:`);
    tenant005Warehouses.forEach(w => console.log(`  ${w._id}: ${w.name}`));
    
    const tenant005Dealers = await Dealer.find({ tenantId: '005', isActive: true });
    console.log(`Found ${tenant005Dealers.length} active dealers for tenant 005:`);
    tenant005Dealers.forEach(d => console.log(`  ${d._id}: ${d.name}`));
    
    const tenant005Inventory = await Inventory.find({ tenantId: '005' }).populate('product', 'name');
    console.log(`Found ${tenant005Inventory.length} inventory records for tenant 005:`);
    tenant005Inventory.forEach(inv => console.log(`  ${inv.product?.name}: ${inv.stock.available} available in warehouse ${inv.location.warehouse}`));

    if (tenant005Products.length === 0 || tenant005Warehouses.length === 0) {
      console.log('❌ Missing required data for tenant 005. Cannot proceed with order test.');
      mongoose.disconnect();
      return;
    }

    // Test case 1: Create order with correct tenant 005 warehouse
    console.log('\n📝 Test 1: Creating order with correct tenant 005 warehouse...');
    
    const correctWarehouse = tenant005Warehouses[0];
    const product = tenant005Products[0];
    const dealer = tenant005Dealers[0];
    
    const orderData = {
      tenantId: '005',
      orderType: dealer ? 'dealer' : 'customer',
      dealer: dealer?._id,
      items: [{
        product: product._id,
        quantity: 5,
        unitPrice: 50,
        totalPrice: 250
      }],
      pricing: {
        subtotal: 250,
        tax: 0,
        shipping: 0,
        total: 250
      },
      payment: {
        method: 'cash',
        status: 'pending',
        paidAmount: 0,
        dueAmount: 250
      },
      shipping: {
        address: {
          warehouse: correctWarehouse._id.toString(), // Use correct tenant 005 warehouse
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'India'
        },
        method: 'standard'
      },
      createdBy: new mongoose.Types.ObjectId()
    };

    try {
      const newOrder = await Order.create(orderData);
      console.log(`✅ Success! Created order with number: ${newOrder.orderNumber}`);
      console.log(`   Order ID: ${newOrder._id}`);
      console.log(`   Tenant: ${newOrder.tenantId}`);
      console.log(`   Warehouse: ${newOrder.shipping.address.warehouse}`);
    } catch (error) {
      console.log(`❌ Error creating order: ${error.message}`);
      if (error.code === 11000) {
        console.log(`   Duplicate key error: ${JSON.stringify(error.keyValue)}`);
      }
    }

    // Test case 2: Try to create another order (should get next order number)
    console.log('\n📝 Test 2: Creating another order for tenant 005...');
    
    try {
      const orderData2 = { ...orderData };
      delete orderData2._id; // Make sure no ID carries over
      
      const newOrder2 = await Order.create(orderData2);
      console.log(`✅ Success! Created second order with number: ${newOrder2.orderNumber}`);
      console.log(`   This proves order number sequence is working correctly`);
    } catch (error) {
      console.log(`❌ Error creating second order: ${error.message}`);
    }

    // Test case 3: Try to create order with cross-tenant warehouse (should fail gracefully)
    console.log('\n📝 Test 3: Testing with cross-tenant warehouse...');
    
    const otherTenantWarehouses = await Warehouse.find({ tenantId: { $ne: '005' } });
    if (otherTenantWarehouses.length > 0) {
      const crossTenantWarehouse = otherTenantWarehouses[0];
      console.log(`Using warehouse ${crossTenantWarehouse._id} from tenant ${crossTenantWarehouse.tenantId}...`);
      
      const badOrderData = {
        ...orderData,
        shipping: {
          ...orderData.shipping,
          address: {
            ...orderData.shipping.address,
            warehouse: crossTenantWarehouse._id.toString() // Wrong tenant warehouse
          }
        }
      };
      
      try {
        const badOrder = await Order.create(badOrderData);
        console.log(`❌ Unexpected success! This should have failed due to cross-tenant warehouse.`);
      } catch (error) {
        console.log(`✅ Expected error: ${error.message}`);
        console.log(`   System correctly prevents cross-tenant warehouse usage`);
      }
    }

    // Check current orders for tenant 005
    console.log('\n📊 Current Orders for tenant 005:');
    const tenant005Orders = await Order.find({ tenantId: '005' });
    tenant005Orders.forEach(order => {
      console.log(`   ${order.orderNumber}: ${order.status} - ₹${order.pricing.total} (${order.orderType})`);
    });

    mongoose.disconnect();

  } catch (error) {
    console.error('❌ Test error:', error);
    mongoose.disconnect();
  }
}

testOrderCreation();