require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');

async function checkOrderNumbers() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
  
  const orders = await Order.find({ dealer: { $exists: true } })
    .populate('dealer', 'name')
    .select('_id orderNumber dealer pricing createdAt')
    .sort({ createdAt: 1 });
  
  console.log('All Dealer Orders:');
  orders.forEach(order => {
    console.log(`${order.orderNumber} (ID: ${order._id}) - ${order.dealer?.name} - ₹${order.pricing?.total} - ${order.createdAt?.toISOString()}`);
  });
  
  // Check for duplicate order numbers
  const orderNumbers = {};
  orders.forEach(order => {
    const num = order.orderNumber;
    if (!orderNumbers[num]) {
      orderNumbers[num] = [];
    }
    orderNumbers[num].push(order._id);
  });
  
  console.log('\nOrder Number Analysis:');
  Object.entries(orderNumbers).forEach(([num, ids]) => {
    if (ids.length > 1) {
      console.log(`❌ ${num}: ${ids.length} orders (DUPLICATE NUMBER!) - IDs: ${ids.join(', ')}`);
    } else {
      console.log(`✅ ${num}: 1 order`);
    }
  });
  
  mongoose.disconnect();
}

checkOrderNumbers().catch(console.error);