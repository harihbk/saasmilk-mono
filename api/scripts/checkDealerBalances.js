require('dotenv').config();
const mongoose = require('mongoose');
const Dealer = require('../models/Dealer');
const Order = require('../models/Order');

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
  console.log('✓ Connected to MongoDB');
}

async function checkDealerBalances() {
  try {
    await connectDB();

    console.log('═══════════════════════════════════════════════════════');
    console.log('           Dealer Balance Analysis');
    console.log('═══════════════════════════════════════════════════════');

    // Get all dealers with their financial info
    const dealers = await Dealer.find().select('name businessName financialInfo transactions tenantId');
    console.log(`\n📊 Total Dealers: ${dealers.length}`);

    if (dealers.length === 0) {
      console.log('❌ No dealers found in database');
      mongoose.disconnect();
      return;
    }

    // Analyze dealer balances
    let totalPositiveBalance = 0;
    let totalNegativeBalance = 0;
    let positiveCount = 0;
    let negativeCount = 0;

    console.log('\n💰 Dealer Balance Breakdown:');
    dealers.forEach(dealer => {
      const balance = dealer.financialInfo?.currentBalance || 0;
      const status = balance > 0 ? 'CREDIT' : balance < 0 ? 'DEBIT' : 'ZERO';
      
      console.log(`  ${dealer.name || dealer.businessName}: ₹${balance.toFixed(2)} (${status}) - Tenant: ${dealer.tenantId}`);
      
      if (balance > 0) {
        totalPositiveBalance += balance;
        positiveCount++;
      } else if (balance < 0) {
        totalNegativeBalance += Math.abs(balance);
        negativeCount++;
      }
    });

    console.log(`\n📈 Summary:`);
    console.log(`  Dealers with positive balance (they have credit): ${positiveCount} dealers, ₹${totalPositiveBalance.toFixed(2)} total`);
    console.log(`  Dealers with negative balance (they owe money): ${negativeCount} dealers, ₹${totalNegativeBalance.toFixed(2)} total`);
    console.log(`  Outstanding Amount (money owed to you): ₹${totalNegativeBalance.toFixed(2)}`);

    // Check dealer orders to understand balance sources
    console.log('\n📋 Orders Affecting Dealer Balances:');
    
    const dealerOrders = await Order.find({ 
      dealer: { $exists: true, $ne: null } 
    })
    .populate('dealer', 'name businessName')
    .select('orderNumber dealer pricing payment status createdAt tenantId')
    .sort({ createdAt: -1 })
    .limit(10);

    console.log(`\nFound ${dealerOrders.length} recent dealer orders:`);
    dealerOrders.forEach(order => {
      console.log(`  Order ${order.orderNumber}: ${order.dealer?.name || 'Unknown'} - ₹${order.pricing?.total || 0} (${order.status}) - Tenant: ${order.tenantId}`);
      console.log(`    Payment: ₹${order.payment?.paidAmount || 0} paid, ₹${order.payment?.dueAmount || 0} due`);
    });

    // Check dealer transactions
    console.log('\n💳 Recent Dealer Transactions:');
    const dealersWithTransactions = await Dealer.find({ 
      'transactions.0': { $exists: true } 
    }).select('name businessName transactions tenantId').limit(3);

    dealersWithTransactions.forEach(dealer => {
      console.log(`\n  ${dealer.name || dealer.businessName} (Tenant: ${dealer.tenantId}):`);
      const recentTransactions = dealer.transactions.slice(-5);
      recentTransactions.forEach(txn => {
        const sign = txn.type === 'debit' ? '+' : '-';
        console.log(`    ${txn.date?.toISOString()?.slice(0,10) || 'Unknown'}: ${txn.type.toUpperCase()} ${sign}₹${txn.amount} - ${txn.description}`);
        console.log(`      Balance after: ₹${txn.balanceAfter}`);
      });
    });

    // Check if balance calculations match transaction history
    console.log('\n🔍 Balance Verification:');
    for (const dealer of dealers.slice(0, 3)) {
      if (dealer.transactions && dealer.transactions.length > 0) {
        const lastTransaction = dealer.transactions[dealer.transactions.length - 1];
        const recordedBalance = dealer.financialInfo?.currentBalance || 0;
        const lastTxnBalance = lastTransaction.balanceAfter || 0;
        
        console.log(`  ${dealer.name}: Current ₹${recordedBalance} vs Last Txn ₹${lastTxnBalance} - Match: ${Math.abs(recordedBalance - lastTxnBalance) < 0.01 ? '✅' : '❌'}`);
      }
    }

    mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error checking dealer balances:', error);
    mongoose.disconnect();
  }
}

checkDealerBalances();