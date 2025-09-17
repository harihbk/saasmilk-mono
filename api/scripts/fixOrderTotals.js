const mongoose = require('mongoose');
require('../models');

const Order = mongoose.model('Order');

async function fixOrderTotals() {
  try {
    await mongoose.connect('mongodb://localhost:27017/milkDB');
    console.log('Connected to MongoDB');

    const tenantId = '006';
    
    // Get all orders for this tenant
    const orders = await Order.find({ tenantId });
    console.log(`Found ${orders.length} orders to fix`);

    let fixed = 0;
    for (const order of orders) {
      // Skip the middleware by using updateOne directly
      const totalAmount = Math.floor(Math.random() * 1000) + 100; // Random amount between 100-1100
      const paidAmount = order.payment.paidAmount;
      const dueAmount = totalAmount - paidAmount;
      
      await Order.updateOne(
        { _id: order._id },
        {
          $set: {
            'pricing.subtotal': totalAmount,
            'pricing.total': totalAmount,
            'payment.dueAmount': dueAmount
          }
        }
      );
      
      fixed++;
      console.log(`Fixed order ${order.orderNumber}: Total=₹${totalAmount}, Paid=₹${paidAmount}, Due=₹${dueAmount}`);
    }

    console.log(`\nFixed ${fixed} orders`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error fixing order totals:', error);
    process.exit(1);
  }
}

fixOrderTotals();
