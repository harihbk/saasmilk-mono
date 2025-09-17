const mongoose = require('mongoose');
require('../models');

const Dealer = mongoose.model('Dealer');

async function explainBalanceSystem() {
  try {
    await mongoose.connect('mongodb://localhost:27017/milkDB');
    console.log('=== BALANCE SYSTEM EXPLANATION ===\n');
    
    console.log('DATABASE REPRESENTATION:');
    console.log('------------------------');
    console.log('• NEGATIVE balance (-) = Dealer has CREDIT (advance payment/we owe them)');
    console.log('• POSITIVE balance (+) = Dealer has DEBIT (they owe us money)');
    console.log('• ZERO balance (0) = Balanced (no dues either way)\n');
    
    console.log('FRONTEND DISPLAY:');
    console.log('-----------------');
    console.log('• Shows absolute value with CR/DR suffix');
    console.log('• ₹912.5 CR = Database has -912.5 (dealer has credit)');
    console.log('• ₹500 DR = Database has +500 (dealer owes money)\n');
    
    console.log('TRANSACTION LOGIC:');
    console.log('------------------');
    console.log('• When dealer makes payment: balance becomes MORE negative (more credit)');
    console.log('• When dealer places order: balance becomes LESS negative or positive (uses credit or creates debt)');
    console.log('• Opening balance "credit" type = negative value in database\n');
    
    // Show actual examples from database
    const dealers = await Dealer.find({ tenantId: '006' })
      .select('name financialInfo.currentBalance');
    
    console.log('CURRENT EXAMPLES FROM DATABASE:');
    console.log('--------------------------------');
    dealers.forEach(dealer => {
      const balance = dealer.financialInfo.currentBalance;
      const displayBalance = Math.abs(balance);
      const type = balance < 0 ? 'CR' : balance > 0 ? 'DR' : 'BALANCED';
      const meaning = balance < 0 ? 'has credit/advance' : balance > 0 ? 'owes money' : 'no dues';
      
      console.log(`${dealer.name}:`);
      console.log(`  Database: ${balance}`);
      console.log(`  Frontend: ₹${displayBalance} ${type}`);
      console.log(`  Meaning: Dealer ${meaning}`);
      console.log('');
    });
    
    // Specific example for Hari Babu
    const hariBabu = await Dealer.findOne({ name: 'Hari Babu', tenantId: '006' });
    if (hariBabu) {
      console.log('HARI BABU SPECIFIC ANALYSIS:');
      console.log('-----------------------------');
      console.log(`Database currentBalance: ${hariBabu.financialInfo.currentBalance}`);
      console.log(`This means: Dealer has ₹${Math.abs(hariBabu.financialInfo.currentBalance)} CREDIT`);
      console.log(`Frontend shows: ₹${Math.abs(hariBabu.financialInfo.currentBalance)} CR`);
      console.log(`\nTransaction History shows:`);
      
      hariBabu.transactions.slice(-5).forEach(t => {
        console.log(`- ${t.type.toUpperCase()}: ₹${t.amount} | Balance After: ${t.balanceAfter} | ${t.description}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

explainBalanceSystem();