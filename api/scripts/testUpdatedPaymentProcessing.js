const mongoose = require('mongoose');
require('../models');

const Order = mongoose.model('Order');
const Dealer = mongoose.model('Dealer');

async function testUpdatedPaymentProcessing() {
  try {
    await mongoose.connect('mongodb://localhost:27017/milkDB');
    console.log('=== Testing Updated Payment Processing ===\n');

    const tenantId = '006';
    
    // Find Hari Babu dealer
    const dealer = await Dealer.findOne({ name: 'Hari Babu', tenantId });
    if (!dealer) {
      console.log('Dealer "Hari Babu" not found');
      process.exit(1);
    }

    console.log(`Current dealer balance: ₹${dealer.financialInfo.currentBalance}`);
    
    // Add ₹1000 more credit to the dealer
    console.log('Adding ₹1000 credit to dealer...');
    dealer.financialInfo.currentBalance -= 1000; // Make balance more negative (more credit)
    await dealer.save();
    console.log(`New dealer balance: ₹${dealer.financialInfo.currentBalance}\n`);

    // Test 1: Create a new order with credit payment
    console.log('Test 1: Creating new order with credit payment method...');
    const newOrder = await Order.create({
      dealer: dealer._id,
      orderType: 'dealer',
      items: [{
        product: new mongoose.Types.ObjectId(),
        quantity: 2,
        unitPrice: 100,
        totalPrice: 200,
        discount: 0,
        taxAmount: 0
      }],
      pricing: {
        subtotal: 200,
        discount: 0,
        tax: 0,
        total: 200
      },
      payment: {
        method: 'credit',
        status: 'pending',
        paidAmount: 0,
        dueAmount: 200
      },
      shipping: {
        method: 'pickup',
        address: {
          street: dealer.address.street,
          city: dealer.address.city,
          state: dealer.address.state,
          zipCode: dealer.address.postalCode
        }
      },
      status: 'pending',
      tenantId: tenantId,
      createdBy: dealer.createdBy
    });

    console.log(`New order created: ${newOrder.orderNumber}`);
    console.log(`Payment status: ${newOrder.payment.status}`);
    console.log(`Paid amount: ₹${newOrder.payment.paidAmount}\n`);

    // Test 2: Update existing pending order to use credit payment
    console.log('Test 2: Finding existing pending order...');
    const pendingOrder = await Order.findOne({ 
      tenantId,
      'payment.status': 'pending',
      'payment.method': { $ne: 'credit' }
    });

    if (pendingOrder) {
      console.log(`Found pending order: ${pendingOrder.orderNumber} (Method: ${pendingOrder.payment.method}, Total: ₹${pendingOrder.pricing.total})`);
      
      // Update payment method to credit
      console.log('Changing payment method to credit...');
      pendingOrder.payment.method = 'credit';
      await pendingOrder.save();
      
      console.log(`Updated order payment status: ${pendingOrder.payment.status}`);
      console.log(`Updated order paid amount: ₹${pendingOrder.payment.paidAmount}`);
    } else {
      console.log('No pending orders with non-credit payment method found');
    }

    // Check final dealer balance
    const updatedDealer = await Dealer.findById(dealer._id);
    console.log(`\nFinal dealer balance: ₹${updatedDealer.financialInfo.currentBalance}`);

    process.exit(0);
  } catch (error) {
    console.error('Error testing updated payment processing:', error);
    process.exit(1);
  }
}

testUpdatedPaymentProcessing();