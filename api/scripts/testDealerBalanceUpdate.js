require('dotenv').config();
const mongoose = require('mongoose');
// Load all models to ensure they are registered
require('../models');
const Dealer = require('../models/Dealer');

async function testDealerBalanceUpdate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
    console.log('✓ Connected to MongoDB');

    console.log('\n💰 Testing Dealer Balance Update Directly:');
    
    // Find a dealer
    const dealer = await Dealer.findOne({}).sort({ createdAt: -1 });
    
    if (!dealer) {
      console.log('❌ No dealers found in database');
      return;
    }
    
    console.log(`Found dealer: ${dealer.name}`);
    console.log(`Current balance: ₹${dealer.financialInfo?.currentBalance || 0}`);
    console.log(`Existing transactions: ${dealer.transactions?.length || 0}`);
    
    // Test 1: Direct balance update using the model method
    console.log('\n🧪 Test 1: Direct balance update (model method)');
    try {
      const originalBalance = dealer.financialInfo.currentBalance;
      await dealer.updateBalance(100, 'debit', 'Test transaction - validation fix', null);
      console.log('✅ Balance update via model method successful');
      console.log(`Balance changed from ₹${originalBalance} to ₹${dealer.financialInfo.currentBalance}`);
    } catch (error) {
      console.log('❌ Balance update via model method failed:', error.message);
      if (error.errors) {
        Object.keys(error.errors).forEach(key => {
          console.log(`   ${key}: ${error.errors[key].message}`);
        });
      }
    }
    
    // Test 2: Manual transaction creation (what inventory service does)
    console.log('\n🧪 Test 2: Manual transaction creation (inventory service style)');
    try {
      const testOrderId = new mongoose.Types.ObjectId();
      const testAmount = 250;
      
      // Save current state
      const beforeBalance = dealer.financialInfo.currentBalance;
      const beforeTransactionCount = dealer.transactions.length;
      
      // Update balance (similar to inventoryService.updateDealerBalance)
      dealer.financialInfo.currentBalance -= testAmount; // Debit
      
      // Add transaction record
      dealer.transactions.push({
        type: 'debit',
        amount: testAmount,
        description: `Test Order ${testOrderId} - Purchase`,
        reference: {
          type: 'Order',
          id: testOrderId
        },
        date: new Date(),
        balanceAfter: dealer.financialInfo.currentBalance
      });
      
      await dealer.save();
      
      console.log('✅ Manual transaction creation successful');
      console.log(`Balance: ₹${beforeBalance} → ₹${dealer.financialInfo.currentBalance}`);
      console.log(`Transactions: ${beforeTransactionCount} → ${dealer.transactions.length}`);
      
      // Check the new transaction
      const newTransaction = dealer.transactions[dealer.transactions.length - 1];
      console.log('New transaction details:');
      console.log(`  Type: ${newTransaction.type}`);
      console.log(`  Amount: ₹${newTransaction.amount}`);
      console.log(`  Reference Type: ${newTransaction.reference?.type}`);
      console.log(`  Reference ID: ${newTransaction.reference?.id}`);
      console.log(`  Balance After: ₹${newTransaction.balanceAfter}`);
      
    } catch (error) {
      console.log('❌ Manual transaction creation failed:', error.message);
      if (error.errors) {
        console.log('Validation errors:');
        Object.keys(error.errors).forEach(key => {
          console.log(`   ${key}: ${error.errors[key].message}`);
        });
      }
    }
    
    // Test 3: Test with the problematic reference values from the error
    console.log('\n🧪 Test 3: Testing with problematic reference values');
    try {
      dealer.transactions.push({
        type: 'adjustment',
        amount: 1,
        description: 'Testing problematic reference values',
        reference: {
          type: 'System',
          id: 'balance_fix'
        },
        date: new Date(),
        balanceAfter: dealer.financialInfo.currentBalance
      });
      
      await dealer.save();
      console.log('✅ Problematic reference values now work');
      
    } catch (error) {
      console.log('❌ Problematic reference values still fail:', error.message);
      if (error.errors) {
        console.log('Validation errors:');
        Object.keys(error.errors).forEach(key => {
          console.log(`   ${key}: ${error.errors[key].message}`);
        });
      }
    }
    
    // Test 4: Test with null/undefined reference
    console.log('\n🧪 Test 4: Testing with null reference');
    try {
      dealer.transactions.push({
        type: 'adjustment',
        amount: 1,
        description: 'Testing null reference',
        reference: {
          type: null,
          id: null
        },
        date: new Date(),
        balanceAfter: dealer.financialInfo.currentBalance
      });
      
      await dealer.save();
      console.log('✅ Null reference values work');
      
    } catch (error) {
      console.log('❌ Null reference values fail:', error.message);
    }
    
    console.log('\n✅ Dealer balance update test completed!');
    console.log('   All transaction types should now work without validation errors.');
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error during dealer balance test:', error);
    await mongoose.disconnect();
  }
}

testDealerBalanceUpdate();