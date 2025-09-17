require('dotenv').config();
const mongoose = require('mongoose');
const Dealer = require('../models/Dealer');

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
  console.log('✓ Connected to MongoDB');
}

async function fixDealerBalances() {
  try {
    await connectDB();

    console.log('═══════════════════════════════════════════════════════');
    console.log('           Fixing Dealer Balance Calculations');
    console.log('═══════════════════════════════════════════════════════');

    const dealers = await Dealer.find();
    console.log(`\n📊 Found ${dealers.length} dealers to fix`);

    for (const dealer of dealers) {
      console.log(`\n🔧 Fixing dealer: ${dealer.name || dealer.businessName}`);
      
      const originalBalance = dealer.financialInfo?.currentBalance || 0;
      console.log(`  Original balance: ₹${originalBalance}`);

      // Recalculate balance from transactions
      let calculatedBalance = dealer.financialInfo?.openingBalance || 0;
      
      if (dealer.transactions && dealer.transactions.length > 0) {
        console.log(`  Processing ${dealer.transactions.length} transactions:`);
        
        dealer.transactions.forEach((txn, index) => {
          const oldBalance = calculatedBalance;
          
          // Apply correct logic: debit = owes more (negative), credit = paid (positive)
          if (txn.type === 'debit') {
            calculatedBalance -= txn.amount; // Dealer owes more
          } else {
            calculatedBalance += txn.amount; // Dealer paid
          }
          
          console.log(`    ${index + 1}. ${txn.type.toUpperCase()} ₹${txn.amount}: ₹${oldBalance} → ₹${calculatedBalance}`);
          
          // Update the transaction's balanceAfter field
          txn.balanceAfter = calculatedBalance;
        });
      }

      // Update the dealer's current balance
      dealer.financialInfo.currentBalance = calculatedBalance;
      
      console.log(`  Final balance: ₹${calculatedBalance}`);
      console.log(`  Change: ₹${originalBalance} → ₹${calculatedBalance} (${calculatedBalance - originalBalance >= 0 ? '+' : ''}${(calculatedBalance - originalBalance).toFixed(2)})`);
      
      await dealer.save();
      console.log(`  ✅ Dealer balance updated`);
    }

    // Show final summary
    console.log(`\n📈 Final Summary:`);
    const updatedDealers = await Dealer.find().select('name businessName financialInfo');
    
    let totalPositive = 0;
    let totalNegative = 0;
    
    updatedDealers.forEach(dealer => {
      const balance = dealer.financialInfo?.currentBalance || 0;
      console.log(`  ${dealer.name || dealer.businessName}: ₹${balance.toFixed(2)} ${balance >= 0 ? '(Credit)' : '(Owes)'}`);
      
      if (balance >= 0) {
        totalPositive += balance;
      } else {
        totalNegative += Math.abs(balance);
      }
    });

    console.log(`\n💰 Outstanding Amounts:`);
    console.log(`  Total Credit Balance: ₹${totalPositive.toFixed(2)} (Dealers have prepaid)`);
    console.log(`  Total Outstanding: ₹${totalNegative.toFixed(2)} (Dealers owe money)`);

    console.log(`\n✅ All dealer balances have been recalculated with correct logic!`);

    mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error fixing dealer balances:', error);
    mongoose.disconnect();
  }
}

fixDealerBalances();