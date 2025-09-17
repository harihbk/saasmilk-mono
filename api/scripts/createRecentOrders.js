const mongoose = require('mongoose');
require('../models');

const Order = mongoose.model('Order');
const Dealer = mongoose.model('Dealer');

async function createRecentOrders() {
  try {
    await mongoose.connect('mongodb://localhost:27017/milkDB');
    console.log('Connected to MongoDB');

    const tenantId = '006';
    
    // Get existing dealers
    const dealers = await Dealer.find({ tenantId });
    if (dealers.length === 0) {
      console.log('No dealers found for tenant', tenantId);
      process.exit(1);
    }

    console.log(`Found ${dealers.length} dealers`);

    // Create recent orders (within last 7 days)
    const orders = [];
    for (let i = 1; i <= 10; i++) {
      const dealer = dealers[Math.floor(Math.random() * dealers.length)];
      const totalAmount = Math.floor(Math.random() * 1000) + 100; // Random amount between 100-1100
      
      // Create different payment scenarios
      let paidAmount = 0;
      let paymentStatus = 'pending';
      
      if (i % 3 === 0) {
        // Fully paid (33%)
        paidAmount = totalAmount;
        paymentStatus = 'completed';
      } else if (i % 3 === 1) {
        // Partially paid (33%)
        paidAmount = Math.floor(totalAmount * 0.6);
        paymentStatus = 'processing';
      } else {
        // Unpaid (33%)
        paidAmount = 0;
        paymentStatus = 'pending';
      }

      const order = await Order.create({
        dealer: dealer._id,
        orderType: 'dealer',
        items: [], // Empty items for simplicity
        pricing: {
          subtotal: totalAmount,
          total: totalAmount
        },
        payment: {
          method: 'credit',
          status: paymentStatus,
          paidAmount: paidAmount,
          dueAmount: totalAmount - paidAmount
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
        status: 'delivered',
        tenantId: tenantId,
        createdBy: dealer.createdBy,
        createdAt: new Date() // Today's date
      });
      orders.push(order);
      console.log(`Created recent order ${i}: ${order.orderNumber} for ${dealer.name} - Total: ₹${totalAmount}, Paid: ₹${paidAmount}, Due: ₹${totalAmount - paidAmount}`);
    }

    console.log(`Created ${orders.length} recent orders for testing`);
    
    // Check aggregation with today's data
    console.log('\nTesting aggregation with recent data...');
    const pipeline = [
      {
        $match: {
          dealer: { $exists: true },
          tenantId: tenantId,
          createdAt: {
            $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      },
      {
        $lookup: {
          from: 'dealers',
          localField: 'dealer',
          foreignField: '_id',
          as: 'dealerInfo',
          pipeline: [
            { $match: { tenantId } }
          ]
        }
      },
      {
        $unwind: '$dealerInfo'
      },
      {
        $lookup: {
          from: 'routes',
          localField: 'dealerInfo.route',
          foreignField: '_id',
          as: 'routeInfo',
          pipeline: [
            { $match: { tenantId } }
          ]
        }
      },
      {
        $unwind: {
          path: '$routeInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: {
          'routeInfo._id': { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: {
            routeId: '$routeInfo._id',
            routeCode: '$routeInfo.code',
            routeName: '$routeInfo.name'
          },
          totalOrders: { $sum: 1 },
          totalAmount: { $sum: { $ifNull: ['$pricing.total', 0] } },
          paidAmount: { $sum: { $ifNull: ['$payment.paidAmount', 0] } },
          outstandingAmount: {
            $sum: {
              $cond: [
                { $and: [
                  { $gt: [{ $ifNull: ['$payment.dueAmount', { $subtract: [{ $ifNull: ['$pricing.total', 0] }, { $ifNull: ['$payment.paidAmount', 0] }] }] }, 0] },
                  { $ne: ['$status', 'cancelled'] },
                  { $ne: ['$status', 'refunded'] }
                ]},
                { $ifNull: ['$payment.dueAmount', { $subtract: [{ $ifNull: ['$pricing.total', 0] }, { $ifNull: ['$payment.paidAmount', 0] }] }] },
                0
              ]
            }
          }
        }
      }
    ];

    const testResults = await Order.aggregate(pipeline);
    console.log('Recent aggregation results:', JSON.stringify(testResults, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating recent orders:', error);
    process.exit(1);
  }
}

createRecentOrders();