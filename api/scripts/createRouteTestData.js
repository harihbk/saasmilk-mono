const mongoose = require('mongoose');
require('../models');

const User = mongoose.model('User');
const Company = mongoose.model('Company');
const DealerGroup = mongoose.model('DealerGroup');
const Route = mongoose.model('Route');
const Dealer = mongoose.model('Dealer');
const Product = mongoose.model('Product');
const Category = mongoose.model('Category');
const Order = mongoose.model('Order');

async function createRouteTestData() {
  try {
    console.log('Creating test data for route reports...');
    
    await mongoose.connect('mongodb://localhost:27017/milkDB');
    console.log('Connected to MongoDB');

    const tenantId = '006';

    // Create a test company
    const company = await Company.create({
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

    // Create a test user
    const user = await User.create({
      name: 'Test Admin',
      email: 'admin@testmilk.com',
      password: 'password123',
      role: 'company_admin',
      company: company._id,
      tenantId: tenantId
    });

    // Create dealer group
    const dealerGroup = await DealerGroup.create({
      name: 'Test Dealer Group',
      code: 'TDG001',
      description: 'Test dealer group for route testing',
      tenantId: tenantId,
      createdBy: user._id
    });

    // Create routes
    const routes = [];
    for (let i = 1; i <= 3; i++) {
      const route = await Route.create({
        name: `Route ${i}`,
        code: `RT${i.toString().padStart(3, '0')}`,
        description: `Test route ${i}`,
        city: 'Test City',
        state: 'Test State',
        tenantId: tenantId,
        createdBy: user._id,
        status: 'active'
      });
      routes.push(route);
      console.log(`Created route: ${route.name}`);
    }

    // Create dealers
    const dealers = [];
    for (let i = 1; i <= 6; i++) {
      const routeIndex = Math.floor((i - 1) / 2); // 2 dealers per route
      const dealer = await Dealer.create({
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
      dealers.push(dealer);
      console.log(`Created dealer: ${dealer.name} on ${routes[routeIndex].name}`);
    }

    // Create product category
    const category = await Category.create({
      name: 'milk',
      displayName: 'Milk',
      description: 'Fresh dairy milk',
      tenantId: tenantId,
      createdBy: user._id
    });

    // Create products
    const products = [];
    const productTypes = ['Whole Milk', 'Skim Milk', 'Cream'];
    for (let i = 0; i < productTypes.length; i++) {
      const product = await Product.create({
        name: productTypes[i],
        code: `MILK${i + 1}`,
        category: category._id,
        price: 50 + (i * 10), // 50, 60, 70
        unit: 'liter',
        tenantId: tenantId,
        createdBy: user._id
      });
      products.push(product);
      console.log(`Created product: ${product.name}`);
    }

    // Create orders with different payment statuses
    const orders = [];
    for (let i = 1; i <= 20; i++) {
      const dealer = dealers[Math.floor(Math.random() * dealers.length)];
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 5) + 1; // 1-5
      const unitPrice = product.price;
      const totalPrice = quantity * unitPrice;
      
      // Create different payment scenarios
      let paidAmount = 0;
      let paymentStatus = 'pending';
      
      if (i % 4 === 0) {
        // Fully paid (25%)
        paidAmount = totalPrice;
        paymentStatus = 'completed';
      } else if (i % 4 === 1) {
        // Partially paid (25%)
        paidAmount = Math.floor(totalPrice * 0.5);
        paymentStatus = 'processing';
      } else {
        // Unpaid (50%)
        paidAmount = 0;
        paymentStatus = 'pending';
      }

      const order = await Order.create({
        dealer: dealer._id,
        orderType: 'dealer',
        items: [{
          product: product._id,
          quantity: quantity,
          unitPrice: unitPrice,
          totalPrice: totalPrice
        }],
        pricing: {
          subtotal: totalPrice,
          total: totalPrice
        },
        payment: {
          method: 'credit',
          status: paymentStatus,
          paidAmount: paidAmount,
          dueAmount: totalPrice - paidAmount
        },
        status: 'delivered',
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

    console.log('Test data creation completed successfully!');
    console.log('Summary:');
    console.log(`- Company: ${company.name}`);
    console.log(`- Routes: ${routes.length}`);
    console.log(`- Dealers: ${dealers.length}`);
    console.log(`- Products: ${products.length}`);
    console.log(`- Orders: ${orders.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating test data:', error);
    process.exit(1);
  }
}

createRouteTestData();