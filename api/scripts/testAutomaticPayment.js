const mongoose = require('mongoose');
require('../models');

const Order = mongoose.model('Order');
const Dealer = mongoose.model('Dealer');
const User = mongoose.model('User');
const DealerGroup = mongoose.model('DealerGroup');
const Route = mongoose.model('Route');

async function testAutomaticPayment() {
  try {
    await mongoose.connect('mongodb://localhost:27017/milkDB');
    console.log('Connected to MongoDB');

    const tenantId = '006';
    
    // Find or create test dealer with sufficient balance
    let dealer = await Dealer.findOne({ tenantId, name: 'Hari Babu' });
    if (!dealer) {
      // Create route first
      let route = await Route.findOne({ tenantId, code: 'RT001' });
      if (!route) {
        // Get user for createdBy
        const user = await User.findOne({ tenantId });
        if (!user) {
          console.log('No user found for tenant', tenantId);
          process.exit(1);
        }

        route = await Route.create({
          name: 'Test Route',
          code: 'RT001',
          description: 'Test route for payment processing',
          city: 'Test City',
          state: 'Test State',
          tenantId: tenantId,
          createdBy: user._id,
          status: 'active'
        });
      }

      // Create dealer group
      let dealerGroup = await DealerGroup.findOne({ tenantId });
      if (!dealerGroup) {
        const user = await User.findOne({ tenantId });
        dealerGroup = await DealerGroup.create({
          name: 'Test Dealer Group',
          code: 'TDG001',
          description: 'Test dealer group',
          tenantId: tenantId,
          createdBy: user._id
        });
      }

      const user = await User.findOne({ tenantId });
      dealer = await Dealer.create({
        name: 'Hari Babu',
        businessName: 'Hari Babu Dairy',
        dealerGroup: dealerGroup._id,
        route: route._id,
        contactInfo: {
          primaryPhone: '1234567890'
        },
        address: {
          street: 'Test Street',
          city: 'Test City',
          state: 'Test State',
          postalCode: '123456'
        },
        tenantId: tenantId,
        createdBy: user._id,
        financialInfo: {
          openingBalance: 1000, // ₹1000 opening balance
          openingBalanceType: 'credit', // Dealer has credit (negative balance in system)
          creditLimit: 5000
        }
      });
      console.log(`Created dealer: ${dealer.name} with balance ₹${dealer.financialInfo.currentBalance}`);
    } else {
      // Update existing dealer balance to ₹1000 credit (negative balance)
      dealer.financialInfo.openingBalance = 1000;
      dealer.financialInfo.openingBalanceType = 'credit';
      dealer.financialInfo.currentBalance = -1000; // Negative means dealer has credit
      await dealer.save();
      console.log(`Updated dealer: ${dealer.name} balance to ₹${dealer.financialInfo.currentBalance}`);
    }

    // Create order for 5 qty at ₹870 total with credit payment
    console.log('\nCreating order with automatic payment processing...');
    const order = await Order.create({
      dealer: dealer._id,
      orderType: 'dealer',
      items: [{
        product: new mongoose.Types.ObjectId(), // Dummy product ID
        quantity: 5,
        unitPrice: 150, // 5 × ₹150 = ₹750
        totalPrice: 750,
        discount: 0,
        taxAmount: 0
      }],
      pricing: {
        subtotal: 750,
        discount: 0,
        tax: 120, // Adding some tax to make total ₹870
        total: 870
      },
      payment: {
        method: 'credit', // This should trigger automatic payment processing
        status: 'pending', // Will be automatically changed to 'completed'
        paidAmount: 0,
        dueAmount: 870
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

    console.log(`Order created: ${order.orderNumber}`);
    console.log(`Payment status: ${order.payment.status}`);
    console.log(`Paid amount: ₹${order.payment.paidAmount}`);
    console.log(`Due amount: ₹${order.payment.dueAmount}`);
    console.log(`Total amount: ₹${order.pricing.total}`);

    // Check dealer balance after order
    const updatedDealer = await Dealer.findById(dealer._id);
    console.log(`Dealer balance after order: ₹${updatedDealer.financialInfo.currentBalance}`);

    // Verify the automatic payment processing worked
    if (order.payment.status === 'completed' && order.payment.paidAmount === order.pricing.total) {
      console.log('\n✅ SUCCESS: Automatic payment processing worked!');
      console.log(`- Payment status changed from 'pending' to 'completed'`);
      console.log(`- Dealer balance reduced from ₹1000 to ₹${updatedDealer.financialInfo.currentBalance}`);
      console.log(`- Order is fully paid`);
    } else {
      console.log('\n❌ FAILED: Automatic payment processing did not work');
      console.log(`- Payment status: ${order.payment.status} (expected: completed)`);
      console.log(`- Paid amount: ₹${order.payment.paidAmount} (expected: ₹${order.pricing.total})`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error testing automatic payment:', error);
    process.exit(1);
  }
}

testAutomaticPayment();