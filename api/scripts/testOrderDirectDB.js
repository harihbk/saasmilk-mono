require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Inventory = require('../models/Inventory');
const inventoryService = require('../services/inventoryService');

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
  console.log('✓ Connected to MongoDB');
}

async function testOrderWithInventoryDirect() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('        Direct DB Order/Inventory Test');
  console.log('═══════════════════════════════════════════════════════');
  
  try {
    await connectDB();

    // Step 1: Get available data
    console.log('\n📊 Checking available data...');
    
    const [products, customers, inventory] = await Promise.all([
      Product.find({ tenantId: 'TEST001' }).limit(3),
      Customer.find({ tenantId: 'TEST001' }).limit(1),
      Inventory.find({ tenantId: 'TEST001' }).populate('product', 'name').limit(5)
    ]);

    console.log(`✓ Found ${products.length} products, ${customers.length} customers, ${inventory.length} inventory items`);
    
    if (products.length < 2 || customers.length < 1) {
      console.log('❌ Insufficient data for testing');
      mongoose.disconnect();
      return;
    }

    // Show current inventory
    console.log('\n📦 Current Inventory:');
    inventory.forEach(item => {
      const available = item.stock.available - item.stock.reserved;
      console.log(`  ${item.product?.name || 'Unknown'}: ${available} available (${item.stock.available} total, ${item.stock.reserved} reserved)`);
    });

    // Step 2: Test stock availability check
    console.log('\n🔍 Testing stock availability service...');
    
    const testProductIds = [products[0]._id, products[1]._id];
    const stockAvailability = await inventoryService.getStockAvailability(testProductIds, 'Warehouse A', 'TEST001');
    
    console.log('✓ Stock availability check completed:');
    stockAvailability.forEach(stock => {
      console.log(`  ${stock.productName}: ${stock.available} available`);
    });

    // Step 3: Create test order
    console.log('\n📝 Creating test order...');
    
    const orderData = {
      customer: customers[0]._id,
      items: [
        {
          product: products[0]._id,
          quantity: 2,
          unitPrice: 10,
          pricePerUnit: 10,
          totalPrice: 20
        },
        {
          product: products[1]._id,
          quantity: 1,
          unitPrice: 15,
          pricePerUnit: 15,
          totalPrice: 15
        }
      ],
      payment: {
        method: 'cash',
        status: 'pending',
        paidAmount: 0,
        dueAmount: 35
      },
      shipping: {
        method: 'delivery',
        address: {
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'Test Country',
          warehouse: 'Warehouse A'
        }
      },
      pricing: {
        subtotal: 35,
        total: 35,
        discount: 0,
        tax: 0,
        shipping: 0
      },
      tenantId: 'TEST001',
      createdBy: new mongoose.Types.ObjectId()
    };

    const order = await Order.create(orderData);
    console.log(`✓ Order created: ${order._id}`);

    // Step 4: Process inventory for the order
    console.log('\n⚙️ Processing inventory for order...');
    
    const inventoryResult = await inventoryService.processOrder({
      ...order.toObject(),
      items: order.items.map(item => ({
        product: item.product,
        quantity: item.quantity
      })),
      userId: orderData.createdBy
    });

    if (inventoryResult.success) {
      console.log('✓ Inventory processed successfully');
    } else {
      console.log(`❌ Inventory processing failed: ${inventoryResult.message}`);
      await Order.findByIdAndDelete(order._id);
      mongoose.disconnect();
      return;
    }

    // Step 5: Test order update scenarios
    console.log('\n🔄 Testing order update scenarios...');

    // Scenario 1: Update to higher quantities
    console.log('\n  Test 1: Increasing quantities...');
    
    const originalItems = order.items.map(item => ({
      product: item.product,
      quantity: item.quantity
    }));
    
    const newItems = [
      { product: products[0]._id, quantity: 4 }, // 2 → 4
      { product: products[1]._id, quantity: 2 }  // 1 → 2
    ];

    // Simulate the update process: Release → Check → Reserve
    console.log('    Releasing original stock...');
    await inventoryService.releaseReservedStock(originalItems, order._id, 'Warehouse A');
    
    console.log('    Checking new stock availability...');
    const newStockAvailability = await inventoryService.getStockAvailability(
      newItems.map(item => item.product), 
      'Warehouse A', 
      'TEST001'
    );
    
    console.log('    New stock availability:');
    newStockAvailability.forEach(stock => {
      console.log(`      ${stock.productName}: ${stock.available} available`);
    });
    
    const canUpdate = newItems.every(item => {
      const stock = newStockAvailability.find(s => s.productId.toString() === item.product.toString());
      return stock && stock.available >= item.quantity;
    });
    
    if (canUpdate) {
      console.log('    ✓ Stock check passed, reserving new stock...');
      const reserveResult = await inventoryService.reserveStock(newItems, order._id, 'Warehouse A');
      
      if (reserveResult.success) {
        console.log('    ✓ New stock reserved successfully');
        
        // Update the order
        await Order.findByIdAndUpdate(order._id, {
          items: newItems.map(item => ({
            product: item.product,
            quantity: item.quantity,
            unitPrice: 10,
            pricePerUnit: 10,
            totalPrice: item.quantity * 10
          }))
        });
        
        console.log('    ✓ Order updated successfully');
      } else {
        console.log(`    ❌ Stock reservation failed: ${reserveResult.message}`);
        // Restore original reservations
        await inventoryService.reserveStock(originalItems, order._id, 'Warehouse A');
      }
    } else {
      console.log('    ❌ Insufficient stock for update');
      // Restore original reservations
      await inventoryService.reserveStock(originalItems, order._id, 'Warehouse A');
    }

    // Step 6: Show final inventory state
    console.log('\n📦 Final inventory state:');
    const finalInventory = await Inventory.find({ tenantId: 'TEST001' }).populate('product', 'name').limit(5);
    finalInventory.forEach(item => {
      const available = item.stock.available - item.stock.reserved;
      console.log(`  ${item.product?.name || 'Unknown'}: ${available} available (${item.stock.available} total, ${item.stock.reserved} reserved)`);
    });

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    
    // Cancel order to release stock
    await inventoryService.cancelOrder({
      ...order.toObject(),
      items: order.items.map(item => ({
        product: item.product,
        quantity: item.quantity
      }))
    });
    
    await Order.findByIdAndDelete(order._id);
    console.log('✓ Test order deleted and stock released');

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ Direct DB test completed successfully!');
    console.log('═══════════════════════════════════════════════════════');

    mongoose.disconnect();

  } catch (error) {
    console.error('❌ Test failed:', error);
    mongoose.disconnect();
  }
}

testOrderWithInventoryDirect();