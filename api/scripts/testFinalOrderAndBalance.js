require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Dealer = require('../models/Dealer');

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
  console.log('✓ Connected to MongoDB');
}

async function testFinalOrderAndBalance() {
  try {
    await connectDB();

    console.log('═══════════════════════════════════════════════════════');
    console.log('    Final Test: Order Creation with Dealer Balance');
    console.log('═══════════════════════════════════════════════════════');

    // Get dealer for tenant 005
    const dealer = await Dealer.findOne({ tenantId: '005', name: 'Nila' });
    if (!dealer) {
      console.log('❌ Dealer not found');
      mongoose.disconnect();
      return;
    }

    console.log(`📊 Dealer: ${dealer.name} (${dealer._id})`);
    console.log(`   Balance before: ₹${dealer.financialInfo.currentBalance} (${dealer.balanceStatus})`);
    if (dealer.financialInfo.currentBalance < 0) {
      console.log(`   This means dealer has ₹${Math.abs(dealer.financialInfo.currentBalance)} credit with you`);
    } else {
      console.log(`   This means dealer owes you ₹${dealer.financialInfo.currentBalance}`);
    }

    // Check recent orders for tenant 005
    const recentOrders = await Order.find({ tenantId: '005' })
      .sort({ orderNumber: -1 })
      .limit(3)
      .select('orderNumber status pricing dealer');

    console.log(`\n📋 Recent orders for tenant 005:`);
    recentOrders.forEach(order => {
      console.log(`   ${order.orderNumber}: ${order.status} - ₹${order.pricing.total}`);
    });

    // Show dealer transactions
    console.log(`\n💳 Recent dealer transactions:`);
    const recentTransactions = dealer.transactions.slice(-5);
    recentTransactions.forEach(txn => {
      const sign = txn.type === 'debit' ? '+' : '-';
      console.log(`   ${txn.type.toUpperCase()}: ${sign}₹${txn.amount} → Balance: ₹${txn.balanceAfter}`);
      console.log(`      ${txn.description}`);
    });

    // Verify balance logic with a concrete example
    console.log(`\n🧮 Balance Logic Verification:`);
    console.log(`   Current dealer balance: ₹${dealer.financialInfo.currentBalance}`);
    
    if (dealer.financialInfo.currentBalance < 0) {
      const creditAmount = Math.abs(dealer.financialInfo.currentBalance);
      console.log(`   ✅ CORRECT: Negative balance means dealer has ₹${creditAmount} credit`);
      console.log(`   📝 When dealer makes ₹100 purchase:`);
      console.log(`      Old credit: ₹${creditAmount}`);
      console.log(`      New credit: ₹${creditAmount - 100} (${creditAmount} - 100)`);
      console.log(`      New balance: ₹${dealer.financialInfo.currentBalance + 100} (${dealer.financialInfo.currentBalance} + 100)`);
    } else {
      console.log(`   ✅ CORRECT: Positive balance means dealer owes ₹${dealer.financialInfo.currentBalance}`);
      console.log(`   📝 When dealer makes ₹100 purchase:`);
      console.log(`      Old debt: ₹${dealer.financialInfo.currentBalance}`);
      console.log(`      New debt: ₹${dealer.financialInfo.currentBalance + 100} (${dealer.financialInfo.currentBalance} + 100)`);
    }

    console.log(`\n✅ Summary:`);
    console.log(`   • Negative balance = Dealer has credit with you`);
    console.log(`   • Positive balance = Dealer owes you money`);
    console.log(`   • Debit transaction (purchase) = Increases balance (reduces credit or increases debt)`);
    console.log(`   • Credit transaction (payment) = Decreases balance (increases credit or reduces debt)`);

    mongoose.disconnect();

  } catch (error) {
    console.error('❌ Test error:', error);
    mongoose.disconnect();
  }
}

testFinalOrderAndBalance();