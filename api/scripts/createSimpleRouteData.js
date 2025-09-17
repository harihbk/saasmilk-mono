const mongoose = require('mongoose');
require('../models');

const User = mongoose.model('User');
const Company = mongoose.model('Company');
const DealerGroup = mongoose.model('DealerGroup');
const Route = mongoose.model('Route');
const Dealer = mongoose.model('Dealer');
const Order = mongoose.model('Order');

async function createSimpleRouteData() {
  try {
    console.log('Creating simple test data for route reports...');
    
    await mongoose.connect('mongodb://localhost:27017/milkDB');
    console.log('Connected to MongoDB');

    const tenantId = '006';

    // Check if company exists
    let company = await Company.findOne({ tenantId });
    if (!company) {
      company = await Company.create({
        name: 'Test Milk Company',
        slug: 'test-milk-company',
        tenantId: tenantId,
        contactInfo: {
          email: 'test@testmilk.com',
          phone: '1234567890'
        },
        businessInfo: {
          type: 'dairy'
        },
        subscription: {
          plan: 'trial',
          status: 'active'
        }
      });
    }

    // Check if user exists
    let user = await User.findOne({ tenantId, role: 'company_admin' });
    if (!user) {
      user = await User.create({
        name: 'Test Admin',
        email: 'admin@testmilk.com',
        password: 'password123',
        role: 'company_admin',
        company: company._id,
        tenantId: tenantId
      });
    }

    // Create dealer group
    let dealerGroup = await DealerGroup.findOne({ tenantId });
    if (!dealerGroup) {
      dealerGroup = await DealerGroup.create({
        name: 'Test Dealer Group',
        code: 'TDG001',
        description: 'Test dealer group for route testing',
        tenantId: tenantId,
        createdBy: user._id
      });
    }

    // Create routes
    const routeNames = ['North Route', 'South Route', 'East Route'];
    const routes = [];
    for (let i = 0; i < routeNames.length; i++) {
      let route = await Route.findOne({ tenantId, code: `RT${(i+1).toString().padStart(3, '0')}` });
      if (!route) {
        route = await Route.create({
          name: routeNames[i],
          code: `RT${(i+1).toString().padStart(3, '0')}`,
          description: `Test route ${i+1}`,
          city: 'Test City',
          state: 'Test State',
          tenantId: tenantId,
          createdBy: user._id,
          status: 'active'
        });
      }
      routes.push(route);
      console.log(`Route ready: ${route.name}`);
    }

    // Create dealers
    const dealers = [];
    for (let i = 1; i <= 6; i++) {
      const routeIndex = Math.floor((i - 1) / 2); // 2 dealers per route
      let dealer = await Dealer.findOne({ tenantId, name: `Test Dealer ${i}` });
      if (!dealer) {
        dealer = await Dealer.create({
          name: `Test Dealer ${i}`,
          businessName: `Dealer Business ${i}`,
          dealerGroup: dealerGroup._id,
          route: routes[routeIndex]._id,
          contactInfo: {
            primaryPhone: `123456789${i}`
          },
          address: {
            street: `Street ${i}`,
            city: 'Test City',
            state: 'Test State',
            postalCode: '123456'
          },
          tenantId: tenantId,
          createdBy: user._id,
          financialInfo: {
            currentBalance: 0
          }
        });
      }
      dealers.push(dealer);
      console.log(`Dealer ready: ${dealer.name} on ${routes[routeIndex].name}`);
    }

    // Clear existing orders for this tenant
    await Order.deleteMany({ tenantId });
    console.log('Cleared existing orders');

    // Create orders without products (simplified)
    const orders = [];
    for (let i = 1; i <= 30; i++) {
      const dealer = dealers[Math.floor(Math.random() * dealers.length)];
      const totalAmount = Math.floor(Math.random() * 1000) + 100; // Random amount between 100-1100
      
      // Create different payment scenarios
      let paidAmount = 0;
      let paymentStatus = 'pending';
      
      if (i % 4 === 0) {
        // Fully paid (25%)
        paidAmount = totalAmount;
        paymentStatus = 'completed';
      } else if (i % 4 === 1) {
        // Partially paid (25%)
        paidAmount = Math.floor(totalAmount * 0.5);
        paymentStatus = 'processing';
      } else {
        // Unpaid (50%)
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
          method: 'pickup', // Use pickup to avoid address validation
          address: {
            street: dealer.address.street,
            city: dealer.address.city,
            state: dealer.address.state,
            zipCode: dealer.address.postalCode
          }
        },
        status: Math.random() > 0.1 ? 'delivered' : 'cancelled', // 90% delivered, 10% cancelled
        tenantId: tenantId,
        createdBy: user._id,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random date within last 30 days
      });
      orders.push(order);
    }

    console.log(`Created ${orders.length} orders`);

    // Update dealer counts in routes
    for (const route of routes) {
      await route.updateDealerCount();
    }

    console.log('Simple test data creation completed successfully!');
    console.log('Summary:');
    console.log(`- Company: ${company.name}`);
    console.log(`- Routes: ${routes.length}`);
    console.log(`- Dealers: ${dealers.length}`);
    console.log(`- Orders: ${orders.length}`);
    
    // Test the aggregation pipeline
    console.log('\nTesting route metrics aggregation...');
    const pipeline = [
      {
        $match: {
          dealer: { $exists: true },
          tenantId: tenantId
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
    console.log('Aggregation test results:', JSON.stringify(testResults, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
}

createSimpleRouteData();