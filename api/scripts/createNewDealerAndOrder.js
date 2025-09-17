const mongoose = require('mongoose');
require('../models');

const Dealer = mongoose.model('Dealer');
const Order = mongoose.model('Order');
const User = mongoose.model('User');
const DealerGroup = mongoose.model('DealerGroup');
const Route = mongoose.model('Route');
const Product = mongoose.model('Product');
const Category = mongoose.model('Category');
const Supplier = mongoose.model('Supplier');

async function createNewDealerAndOrder() {
  try {
    await mongoose.connect('mongodb://localhost:27017/milkDB');
    console.log('Connected to MongoDB\n');

    const tenantId = '006';
    
    // Get required references
    const user = await User.findOne({ tenantId, role: 'company_admin' });
    if (!user) {
      console.log('No admin user found for tenant 006');
      process.exit(1);
    }

    // Get or create dealer group
    let dealerGroup = await DealerGroup.findOne({ tenantId });
    if (!dealerGroup) {
      dealerGroup = await DealerGroup.create({
        name: 'Default Group',
        code: 'DG001',
        description: 'Default dealer group',
        tenantId: tenantId,
        createdBy: user._id
      });
    }

    // Get or create route
    let route = await Route.findOne({ tenantId });
    if (!route) {
      route = await Route.create({
        name: 'Main Route',
        code: 'RT001',
        description: 'Main delivery route',
        city: 'Chennai',
        state: 'Tamil Nadu',
        tenantId: tenantId,
        createdBy: user._id,
        status: 'active'
      });
    }

    // Create new dealer
    console.log('=== CREATING NEW DEALER ===');
    const newDealer = await Dealer.create({
      name: 'Test Customer',
      businessName: 'Test Customer Business',
      dealerGroup: dealerGroup._id,
      route: route._id,
      contactInfo: {
        primaryPhone: '9876543210',
        email: 'testcustomer@example.com'
      },
      address: {
        street: '123 Test Street',
        city: 'Chennai',
        state: 'Tamil Nadu',
        postalCode: '600001',
        country: 'India'
      },
      financialInfo: {
        openingBalance: 1000,
        openingBalanceType: 'credit', // Dealer has ₹1000 credit
        creditLimit: 5000,
        creditDays: 15,
        discountPercentage: 5
      },
      preferences: {
        paymentTerms: 'credit',
        deliveryMode: 'delivery',
        preferredDeliveryTime: 'morning'
      },
      status: 'active',
      tenantId: tenantId,
      createdBy: user._id
    });

    console.log(`✅ Dealer Created:`);
    console.log(`   Name: ${newDealer.name}`);
    console.log(`   Code: ${newDealer.dealerCode}`);
    console.log(`   ID: ${newDealer._id}`);
    console.log(`   Opening Balance: ₹${newDealer.financialInfo.openingBalance} (${newDealer.financialInfo.openingBalanceType})`);
    console.log(`   Current Balance: ₹${newDealer.financialInfo.currentBalance} (${newDealer.financialInfo.currentBalance < 0 ? 'CR' : 'DR'})`);
    console.log('');

    // Get or create a product for the order
    let product = await Product.findOne({ tenantId });
    if (!product) {
      // Create category and supplier first
      let category = await Category.findOne({ tenantId });
      if (!category) {
        category = await Category.create({
          name: 'Dairy Products',
          description: 'Milk and dairy products',
          tenantId: tenantId,
          createdBy: user._id
        });
      }

      let supplier = await Supplier.findOne({ tenantId });
      if (!supplier) {
        supplier = await Supplier.create({
          supplierNumber: 'SUP001',
          companyInfo: {
            name: 'Default Supplier Company',
            businessType: 'manufacturer'
          },
          contactInfo: {
            primaryContact: {
              name: 'John Doe',
              email: 'supplier@example.com',
              phone: '1234567890'
            }
          },
          addresses: {
            headquarters: {
              street: 'Supplier Street',
              city: 'Chennai',
              state: 'Tamil Nadu',
              zipCode: '600001',
              country: 'India'
            }
          },
          businessDetails: {
            taxId: 'TAX123456',
            registrationNumber: 'REG123456'
          },
          status: 'active',
          tenantId: tenantId,
          createdBy: user._id
        });
      }

      product = await Product.create({
        name: 'Fresh Milk',
        description: 'Fresh cow milk',
        category: category._id,
        brand: 'Test Brand',
        sku: 'MILK001',
        price: {
          cost: 40,
          selling: 50,
          wholesale: 45
        },
        packaging: {
          type: 'pouch',
          size: {
            value: 500,
            unit: 'ml'
          }
        },
        supplier: supplier._id,
        status: 'active',
        tenantId: tenantId,
        createdBy: user._id
      });
    }

    // Create new order
    console.log('=== CREATING NEW ORDER ===');
    const newOrder = await Order.create({
      dealer: newDealer._id,
      orderType: 'dealer',
      items: [{
        product: product._id,
        quantity: 10,
        unitPrice: 50,
        totalPrice: 500,
        discount: 0,
        taxAmount: 80, // 16% tax
        cgst: 8,
        sgst: 8
      }],
      pricing: {
        subtotal: 500,
        discount: 0,
        tax: 80,
        shipping: 0,
        total: 580
      },
      payment: {
        method: 'credit', // Will trigger automatic payment
        status: 'pending',
        paidAmount: 0,
        dueAmount: 580
      },
      shipping: {
        method: 'standard',
        address: {
          street: newDealer.address.street,
          city: newDealer.address.city,
          state: newDealer.address.state,
          zipCode: newDealer.address.postalCode,
          country: 'India'
        },
        estimatedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
      },
      status: 'confirmed',
      notes: {
        customer: 'Please deliver in the morning',
        internal: 'New customer order'
      },
      tenantId: tenantId,
      createdBy: user._id
    });

    console.log(`✅ Order Created:`);
    console.log(`   Order Number: ${newOrder.orderNumber}`);
    console.log(`   ID: ${newOrder._id}`);
    console.log(`   Items: ${newOrder.items.length} item(s)`);
    console.log(`   Total Amount: ₹${newOrder.pricing.total}`);
    console.log(`   Payment Method: ${newOrder.payment.method}`);
    console.log(`   Payment Status: ${newOrder.payment.status}`);
    console.log(`   Paid Amount: ₹${newOrder.payment.paidAmount}`);
    console.log(`   Due Amount: ₹${newOrder.payment.dueAmount}`);
    console.log('');

    // Check dealer balance after order
    const updatedDealer = await Dealer.findById(newDealer._id);
    console.log('=== DEALER BALANCE AFTER ORDER ===');
    console.log(`   Previous Balance: ₹${newDealer.financialInfo.currentBalance}`);
    console.log(`   Current Balance: ₹${updatedDealer.financialInfo.currentBalance}`);
    console.log(`   Credit Used: ₹${Math.abs(newDealer.financialInfo.currentBalance - updatedDealer.financialInfo.currentBalance)}`);
    
    if (newOrder.payment.status === 'completed') {
      console.log('   ✅ Payment was automatically processed using dealer credit');
    } else {
      console.log('   ⚠️ Payment is still pending (insufficient credit or other issue)');
    }

    console.log('\n=== SUMMARY ===');
    console.log(`Tenant: ${tenantId}`);
    console.log(`New Dealer: ${newDealer.name} (${newDealer.dealerCode})`);
    console.log(`New Order: ${newOrder.orderNumber}`);
    console.log(`Order Total: ₹${newOrder.pricing.total}`);
    console.log(`Payment Status: ${newOrder.payment.status}`);
    console.log(`Dealer Balance: ₹${Math.abs(updatedDealer.financialInfo.currentBalance)} ${updatedDealer.financialInfo.currentBalance < 0 ? 'CR' : updatedDealer.financialInfo.currentBalance > 0 ? 'DR' : 'BALANCED'}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating dealer and order:', error);
    process.exit(1);
  }
}

createNewDealerAndOrder();