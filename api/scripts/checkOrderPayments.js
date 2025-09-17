require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Dealer = require('../models/Dealer'); // Required for populate

async function checkOrderPayments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
    console.log('✓ Connected to MongoDB');

    // Get all orders with payment details
    const orders = await Order.find({ dealer: { $exists: true } })
      .select('orderNumber pricing payment status')
      .populate('dealer', 'name');
    
    console.log(`\n📦 Total Orders: ${orders.length}`);
    console.log('\n📊 Order Payment Details:');
    
    orders.forEach(order => {
      console.log(`\n  Order: ${order.orderNumber}`);
      console.log(`    Status: ${order.status}`);
      console.log(`    Total Amount: ₹${order.pricing?.total || 0}`);
      console.log(`    Payment Status: ${order.payment?.status || 'N/A'}`);
      console.log(`    Payment Method: ${order.payment?.method || 'N/A'}`);
      console.log(`    Paid Amount: ₹${order.payment?.paidAmount || 0}`);
      console.log(`    Due Amount: ₹${order.payment?.dueAmount || 0}`);
    });

    // Calculate summary
    const totalAmount = orders.reduce((sum, o) => sum + (o.pricing?.total || 0), 0);
    const totalPaid = orders.reduce((sum, o) => sum + (o.payment?.paidAmount || 0), 0);
    const totalDue = orders.reduce((sum, o) => sum + (o.payment?.dueAmount || 0), 0);
    
    console.log('\n💰 Payment Summary:');
    console.log(`  Total Order Value: ₹${totalAmount}`);
    console.log(`  Total Paid: ₹${totalPaid}`);
    console.log(`  Total Due: ₹${totalDue}`);
    console.log(`  Collection Efficiency: ${totalAmount > 0 ? ((totalPaid / totalAmount) * 100).toFixed(2) : 0}%`);

    // Check for payment structure issues
    const ordersWithoutPayment = orders.filter(o => !o.payment);
    const ordersWithoutPaidAmount = orders.filter(o => !o.payment?.paidAmount && o.payment?.paidAmount !== 0);
    const ordersWithoutDueAmount = orders.filter(o => !o.payment?.dueAmount && o.payment?.dueAmount !== 0);
    
    console.log('\n⚠️  Issues Found:');
    console.log(`  Orders without payment object: ${ordersWithoutPayment.length}`);
    console.log(`  Orders without paidAmount field: ${ordersWithoutPaidAmount.length}`);
    console.log(`  Orders without dueAmount field: ${ordersWithoutDueAmount.length}`);
    
    if (ordersWithoutPayment.length > 0 || ordersWithoutPaidAmount.length > 0) {
      console.log('\n🔧 Fixing payment structure...');
      
      for (const order of orders) {
        let needsUpdate = false;
        
        // Initialize payment object if missing
        if (!order.payment) {
          order.payment = {
            method: 'cash',
            status: 'pending',
            paidAmount: 0,
            dueAmount: order.pricing?.total || 0
          };
          needsUpdate = true;
        }
        
        // Fix missing paidAmount/dueAmount
        if (order.payment.paidAmount === undefined || order.payment.paidAmount === null) {
          order.payment.paidAmount = 0;
          needsUpdate = true;
        }
        
        if (order.payment.dueAmount === undefined || order.payment.dueAmount === null) {
          order.payment.dueAmount = order.pricing?.total || 0;
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await order.save();
          console.log(`  ✅ Fixed payment structure for order ${order.orderNumber}`);
        }
      }
    }

    // Simulate some payments for testing
    console.log('\n🎭 Simulating sample payments for testing...');
    
    // Mark first order as fully paid
    if (orders[0]) {
      orders[0].payment.paidAmount = orders[0].pricing?.total || 0;
      orders[0].payment.dueAmount = 0;
      orders[0].payment.status = 'completed';
      await orders[0].save();
      console.log(`  ✅ Marked ${orders[0].orderNumber} as fully paid`);
    }
    
    // Mark second order as partially paid (50%)
    if (orders[1]) {
      const halfAmount = (orders[1].pricing?.total || 0) / 2;
      orders[1].payment.paidAmount = halfAmount;
      orders[1].payment.dueAmount = halfAmount;
      orders[1].payment.status = 'partial';
      await orders[1].save();
      console.log(`  ✅ Marked ${orders[1].orderNumber} as 50% paid`);
    }

    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.disconnect();
  }
}

checkOrderPayments();