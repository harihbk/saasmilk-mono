require('dotenv').config();
const mongoose = require('mongoose');
const Dealer = require('../models/Dealer');
const inventoryService = require('../services/inventoryService');

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
  console.log('✓ Connected to MongoDB');
}

async function testDealerBalanceLogic() {
  try {
    await connectDB();

    console.log('═══════════════════════════════════════════════════════');
    console.log('           Testing Dealer Balance Logic');
    console.log('═══════════════════════════════════════════════════════');

    // Find a dealer for tenant 005
    const dealer = await Dealer.findOne({ tenantId: '005', name: 'Nila' });
    if (!dealer) {
      console.log('❌ Dealer not found');
      mongoose.disconnect();
      return;
    }

    console.log(`📊 Testing with dealer: ${dealer.name}`);
    console.log(`   Current balance: ₹${dealer.financialInfo.currentBalance}`);
    console.log(`   Balance status: ${dealer.balanceStatus}`);
    console.log(`   Transaction count: ${dealer.transactions.length}`);

    // Show recent transactions
    console.log('\n📋 Recent transactions:');
    const recentTransactions = dealer.transactions.slice(-3);
    recentTransactions.forEach(txn => {
      const sign = txn.type === 'debit' ? '+' : '-';
      console.log(`   ${txn.type.toUpperCase()}: ${sign}₹${txn.amount} → Balance: ₹${txn.balanceAfter}`);
      console.log(`      Description: ${txn.description}`);
    });

    // Test scenario: Dealer with 1000 credit buys 116 worth of goods
    console.log('\n🧪 Testing scenario:');
    console.log('   Dealer has ₹1000 credit with us');
    console.log('   Dealer buys ₹116 worth of goods');
    console.log('   Expected result: ₹884 credit remaining (1000 - 116)');

    // Manually set dealer balance to 1000 to test
    const originalBalance = dealer.financialInfo.currentBalance;
    dealer.financialInfo.currentBalance = -1000; // Negative = dealer has credit
    await dealer.save();

    console.log(`\n🔧 Set dealer balance to: ₹${dealer.financialInfo.currentBalance} (${dealer.balanceStatus})`);

    // Test the updateDealerBalance function with a ₹116 order
    const testOrderId = new mongoose.Types.ObjectId();
    const result = await inventoryService.updateDealerBalance(
      dealer._id,
      116,
      testOrderId,
      'debit' // Dealer is making a purchase (debit transaction)
    );

    console.log(`\n📊 After ₹116 debit transaction:`);
    console.log(`   Success: ${result.success}`);
    if (result.success) {
      console.log(`   New balance: ₹${result.newBalance}`);
      
      // Refresh dealer data
      const updatedDealer = await Dealer.findById(dealer._id);
      console.log(`   Actual balance: ₹${updatedDealer.financialInfo.currentBalance}`);
      console.log(`   Balance status: ${updatedDealer.balanceStatus}`);
      
      // Check what the balance should be
      const expectedBalance = -1000 + 116; // Should be -884 (₹884 credit remaining)
      const isCorrect = Math.abs(updatedDealer.financialInfo.currentBalance - expectedBalance) < 0.01;
      
      console.log(`\n🔍 Analysis:`);
      console.log(`   Expected balance: ₹${expectedBalance} (₹${Math.abs(expectedBalance)} credit remaining)`);
      console.log(`   Actual balance: ₹${updatedDealer.financialInfo.currentBalance}`);
      console.log(`   Logic correct: ${isCorrect ? '✅' : '❌'}`);
      
      if (!isCorrect) {
        console.log(`\n❌ PROBLEM IDENTIFIED:`);
        console.log(`   The balance calculation is wrong!`);
        console.log(`   When dealer buys goods, their credit should DECREASE`);
        console.log(`   Starting: ₹1000 credit (balance: -1000)`);
        console.log(`   After ₹116 purchase: ₹884 credit (balance: -884)`);
        console.log(`   But got: ₹${updatedDealer.financialInfo.currentBalance}`);
      }
    } else {
      console.log(`   Error: ${result.message}`);
    }

    // Restore original balance
    dealer.financialInfo.currentBalance = originalBalance;
    await dealer.save();

    mongoose.disconnect();

  } catch (error) {
    console.error('❌ Test error:', error);
    mongoose.disconnect();
  }
}

testDealerBalanceLogic();