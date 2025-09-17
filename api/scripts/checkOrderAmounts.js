require('dotenv').config();
const mongoose = require('mongoose');
const Order = require('../models/Order');

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
  console.log('✓ Connected to MongoDB');
}

async function checkOrderAmounts() {
  try {
    await connectDB();

    console.log('═══════════════════════════════════════════════════════');
    console.log('           Order Amounts Diagnostic Report');
    console.log('═══════════════════════════════════════════════════════');

    // Check total orders
    const totalOrders = await Order.countDocuments();
    console.log(`\n📊 Total Orders in Database: ${totalOrders}`);

    if (totalOrders === 0) {
      console.log('❌ No orders found in database');
      mongoose.disconnect();
      return;
    }

    // Check orders by tenant
    const ordersByTenant = await Order.aggregate([
      {
        $group: {
          _id: '$tenantId',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' },
          avgOrderValue: { $avg: '$pricing.total' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📈 Orders by Tenant:');
    ordersByTenant.forEach(tenant => {
      console.log(`  Tenant ${tenant._id}: ${tenant.count} orders, ₹${tenant.totalRevenue?.toFixed(2) || 0} revenue, ₹${tenant.avgOrderValue?.toFixed(2) || 0} avg`);
    });

    // Check orders by status
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalValue: { $sum: '$pricing.total' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('\n📋 Orders by Status:');
    ordersByStatus.forEach(status => {
      console.log(`  ${status._id}: ${status.count} orders, ₹${status.totalValue?.toFixed(2) || 0} total value`);
    });

    // Check for orders with missing or invalid pricing
    const ordersWithIssues = await Order.find({
      $or: [
        { 'pricing.total': { $exists: false } },
        { 'pricing.total': null },
        { 'pricing.total': { $lte: 0 } },
        { 'pricing.subtotal': { $exists: false } },
        { 'pricing.subtotal': null }
      ]
    }).select('_id orderNumber status pricing tenantId');

    console.log(`\n❌ Orders with Pricing Issues: ${ordersWithIssues.length}`);
    if (ordersWithIssues.length > 0) {
      ordersWithIssues.forEach(order => {
        console.log(`  Order ${order.orderNumber || order._id}: Status ${order.status}, Total: ${order.pricing?.total}, Subtotal: ${order.pricing?.subtotal}`);
      });
    }

    // Sample some recent orders to check their structure
    const sampleOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(3)
      .select('orderNumber status pricing payment items tenantId createdAt');

    console.log('\n📝 Sample Recent Orders:');
    sampleOrders.forEach(order => {
      console.log(`  Order ${order.orderNumber || order._id}:`);
      console.log(`    Status: ${order.status}`);
      console.log(`    Tenant: ${order.tenantId}`);
      console.log(`    Items: ${order.items?.length || 0}`);
      console.log(`    Subtotal: ₹${order.pricing?.subtotal || 0}`);
      console.log(`    Tax: ₹${order.pricing?.tax || 0}`);
      console.log(`    Discount: ₹${order.pricing?.discount || 0}`);
      console.log(`    Total: ₹${order.pricing?.total || 0}`);
      console.log(`    Paid: ₹${order.payment?.paidAmount || 0}`);
      console.log(`    Due: ₹${order.payment?.dueAmount || 0}`);
      console.log(`    Created: ${order.createdAt?.toISOString() || 'Unknown'}`);
      console.log('');
    });

    // Test the current stats endpoint logic
    console.log('\n🔍 Testing Stats Endpoint Logic:');
    
    const stats = await Order.aggregate([
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.total' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          completedOrders: {
            $sum: { $cond: [{ $in: ['$status', ['delivered', 'completed']] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    console.log('Stats Result:', stats[0] || 'No data');

    mongoose.disconnect();

  } catch (error) {
    console.error('❌ Error checking order amounts:', error);
    mongoose.disconnect();
  }
}

checkOrderAmounts();