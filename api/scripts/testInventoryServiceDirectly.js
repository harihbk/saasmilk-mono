require('dotenv').config();
const mongoose = require('mongoose');
const inventoryService = require('../services/inventoryService');
const Order = require('../models/Order');
const Dealer = require('../models/Dealer');

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
  console.log('✓ Connected to MongoDB');
}

async function testInventoryService() {
  try {
    await connectDB();

    console.log('═══════════════════════════════════════════════════════');
    console.log('           Testing Inventory Service Directly');
    console.log('═══════════════════════════════════════════════════════');

    // Get an existing order that doesn't have dealer balance impact
    const testOrder = await Order.findOne({ 
      tenantId: '005', 
      orderNumber: 'ORD2508170001' 
    });
    
    if (!testOrder) {
      console.log('❌ Test order ORD2508170001 not found');
      mongoose.disconnect();
      return;
    }

    console.log(`📋 Testing with order: ${testOrder.orderNumber}`);
    console.log(`   Order ID: ${testOrder._id}`);
    console.log(`   Dealer: ${testOrder.dealer}`);
    console.log(`   Total: ₹${testOrder.pricing.total}`);
    console.log(`   Status: ${testOrder.status}`);

    // Get dealer balance before
    const dealerBefore = await Dealer.findById(testOrder.dealer);
    console.log(`\n💰 Dealer balance before: ₹${dealerBefore.financialInfo.currentBalance}`);
    console.log(`   Transaction count before: ${dealerBefore.transactions.length}`);

    // Test processOrder function directly
    console.log('\n🔧 Calling inventoryService.processOrder() directly...');
    
    const inventoryResult = await inventoryService.processOrder({
      ...testOrder.toObject(),
      items: testOrder.items.map(item => ({
        product: item.product,
        quantity: item.quantity
      })),
      userId: new mongoose.Types.ObjectId() // Mock user ID
    });

    console.log(`\n📊 Inventory service result:`);
    console.log(`   Success: ${inventoryResult.success}`);
    console.log(`   Message: ${inventoryResult.message}`);
    if (inventoryResult.stockReservations) {
      console.log(`   Stock reservations: ${inventoryResult.stockReservations.length}`);
    }
    if (!inventoryResult.success) {
      console.log(`   Error step: ${inventoryResult.step}`);
    }

    // Get dealer balance after
    const dealerAfter = await Dealer.findById(testOrder.dealer);
    console.log(`\n💰 Dealer balance after: ₹${dealerAfter.financialInfo.currentBalance}`);
    console.log(`   Transaction count after: ${dealerAfter.transactions.length}`);
    
    const balanceChanged = dealerAfter.financialInfo.currentBalance !== dealerBefore.financialInfo.currentBalance;
    const transactionAdded = dealerAfter.transactions.length > dealerBefore.transactions.length;
    
    console.log(`\n🔍 Analysis:`);
    console.log(`   Balance changed: ${balanceChanged ? '✅' : '❌'}`);
    console.log(`   Transaction added: ${transactionAdded ? '✅' : '❌'}`);
    
    if (transactionAdded) {
      const lastTransaction = dealerAfter.transactions[dealerAfter.transactions.length - 1];
      console.log(`   Last transaction: ${lastTransaction.type} ₹${lastTransaction.amount} - ${lastTransaction.description}`);
      console.log(`   Reference: ${lastTransaction.reference?.type} ${lastTransaction.reference?.id}`);
    }

    // Test updateDealerBalance function directly 
    console.log('\n🔧 Testing updateDealerBalance function directly...');
    
    const balanceResult = await inventoryService.updateDealerBalance(
      testOrder.dealer,
      testOrder.pricing.total,
      testOrder._id,
      'debit'
    );

    console.log(`\n📊 Balance update result:`);
    console.log(`   Success: ${balanceResult.success}`);
    console.log(`   Message: ${balanceResult.message}`);
    if (balanceResult.newBalance !== undefined) {
      console.log(`   New balance: ₹${balanceResult.newBalance}`);
    }

    // Final dealer state
    const dealerFinal = await Dealer.findById(testOrder.dealer);
    console.log(`\n💰 Final dealer balance: ₹${dealerFinal.financialInfo.currentBalance}`);
    console.log(`   Final transaction count: ${dealerFinal.transactions.length}`);

    mongoose.disconnect();

  } catch (error) {
    console.error('❌ Test error:', error);
    mongoose.disconnect();
  }
}

testInventoryService();