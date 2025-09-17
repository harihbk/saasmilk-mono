const mongoose = require('mongoose');
require('../models');

const Order = mongoose.model('Order');
const Dealer = mongoose.model('Dealer');

async function explainPaymentStatus() {
  try {
    await mongoose.connect('mongodb://localhost:27017/milkDB');
    console.log('=== PAYMENT STATUS EXPLANATION ===\n');

    // Get Hari Babu dealer
    const dealer = await Dealer.findOne({ name: 'Hari Babu', tenantId: '006' });
    if (!dealer) {
      console.log('Dealer "Hari Babu" not found');
      process.exit(1);
    }

    console.log(`Dealer: ${dealer.name}`);
    console.log(`Current Balance: ₹${dealer.financialInfo.currentBalance}`);
    console.log(`Credit Available: ₹${Math.abs(dealer.financialInfo.currentBalance)} (${dealer.financialInfo.currentBalance < 0 ? 'HAS CREDIT' : 'NO CREDIT'})\n`);

    // Get recent orders for this dealer
    const orders = await Order.find({ 
      dealer: dealer._id, 
      tenantId: '006' 
    }).sort({ createdAt: -1 }).limit(3);

    console.log('Recent Orders:');
    orders.forEach((order, index) => {
      const canAutoPay = dealer.financialInfo.currentBalance < 0 && 
                        Math.abs(dealer.financialInfo.currentBalance) >= order.pricing.total;
      
      console.log(`${index + 1}. Order ${order.orderNumber}:`);
      console.log(`   - Total: ₹${order.pricing.total}`);
      console.log(`   - Payment Method: ${order.payment.method}`);
      console.log(`   - Payment Status: ${order.payment.status}`);
      console.log(`   - Can Auto-Pay Now: ${canAutoPay ? 'YES' : 'NO'} (${canAutoPay ? 'Sufficient credit' : 'Insufficient credit'})`);
      console.log('');
    });

    console.log('=== WHY PAYMENT STATUS IS PENDING ===');
    console.log('1. Automatic payment processing only works for NEW orders when they are created');
    console.log('2. It checks if dealer has sufficient credit balance at the time of order creation');
    console.log('3. After the first order (ORD2508170042) was auto-paid, dealer balance reduced from ₹-1000 to ₹-130');
    console.log('4. The second order (ORD2508170041) requires ₹870 but dealer only has ₹130 credit remaining');
    console.log('5. Therefore, payment status remains "pending" until dealer adds more credit or pays manually\n');

    console.log('=== SOLUTIONS ===');
    console.log('To complete the pending payment, you can:');
    console.log('1. Add more credit to dealer balance');
    console.log('2. Process payment manually');
    console.log('3. Change payment method to "cash" and collect payment');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

explainPaymentStatus();