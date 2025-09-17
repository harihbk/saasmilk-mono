require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Dealer = require('../models/Dealer');

async function updateOrderPayments() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
    console.log('✓ Connected to MongoDB');

    // Get all orders
    const orders = await Order.find({ dealer: { $exists: true } });
    
    console.log(`\n📦 Found ${orders.length} orders to update`);
    
    // Update payments directly in database to avoid validation issues
    if (orders.length > 0) {
      // Make first order fully paid
      const firstOrder = orders[0];
      const firstTotal = firstOrder.pricing?.total || 0;
      
      await Order.updateOne(
        { _id: firstOrder._id },
        { 
          $set: { 
            'payment.paidAmount': firstTotal,
            'payment.dueAmount': 0,
            'payment.status': 'completed'
          }
        }
      );
      console.log(`  ✅ Order ${firstOrder.orderNumber}: Marked as FULLY PAID (₹${firstTotal})`);
    }
    
    if (orders.length > 1) {
      // Make second order partially paid (50%)
      const secondOrder = orders[1];
      const secondTotal = secondOrder.pricing?.total || 0;
      const halfAmount = secondTotal / 2;
      
      await Order.updateOne(
        { _id: secondOrder._id },
        { 
          $set: { 
            'payment.paidAmount': halfAmount,
            'payment.dueAmount': halfAmount,
            'payment.status': 'partial'
          }
        }
      );
      console.log(`  ✅ Order ${secondOrder.orderNumber}: Marked as PARTIALLY PAID (₹${halfAmount} of ₹${secondTotal})`);
    }
    
    // Verify the updates
    console.log('\n📊 Verifying Updates:');
    const updatedOrders = await Order.find({ dealer: { $exists: true } })
      .select('orderNumber pricing payment');
    
    let totalAmount = 0;
    let totalPaid = 0;
    let totalDue = 0;
    
    updatedOrders.forEach(order => {
      const amount = order.pricing?.total || 0;
      const paid = order.payment?.paidAmount || 0;
      const due = order.payment?.dueAmount || 0;
      
      totalAmount += amount;
      totalPaid += paid;
      totalDue += due;
      
      console.log(`  ${order.orderNumber}:`);
      console.log(`    Total: ₹${amount}`);
      console.log(`    Paid: ₹${paid}`);
      console.log(`    Due: ₹${due}`);
      console.log(`    Status: ${order.payment?.status}`);
    });
    
    const collectionEfficiency = totalAmount > 0 ? (totalPaid / totalAmount * 100).toFixed(2) : 0;
    
    console.log('\n💰 Summary:');
    console.log(`  Total Amount: ₹${totalAmount}`);
    console.log(`  Total Paid: ₹${totalPaid}`);
    console.log(`  Total Due: ₹${totalDue}`);
    console.log(`  Collection Efficiency: ${collectionEfficiency}%`);

    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.disconnect();
  }
}

updateOrderPayments();