require('dotenv').config();
const axios = require('axios');

async function testDealerOrderCreation() {
  try {
    // Login with hari@gmail.com
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:8000/api/auth/login', {
      email: 'hari@gmail.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    console.log('✅ Login successful');
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': user.tenantId
    };
    
    console.log('\n🏪 Testing Dealer Order Creation:');
    
    // Get dealers
    const dealersResponse = await axios.get('http://localhost:8000/api/dealers', { 
      headers,
      params: { limit: 5 }
    });
    
    if (dealersResponse.data.data.dealers.length === 0) {
      console.log('❌ No dealers found. Please create dealers first.');
      return;
    }
    
    const dealer = dealersResponse.data.data.dealers[0];
    console.log(`Found dealer: ${dealer.name} (Balance: ₹${dealer.financialInfo?.currentBalance || 0})`);
    
    // Get products for order
    const productsResponse = await axios.get('http://localhost:8000/api/products', { 
      headers,
      params: { limit: 3 }
    });
    
    if (productsResponse.data.data.products.length === 0) {
      console.log('❌ No products found. Please create products first.');
      return;
    }
    
    const products = productsResponse.data.data.products;
    console.log(`Found ${products.length} products available`);
    
    // Check inventory for products
    console.log('\n📦 Checking inventory availability:');
    const inventoryItems = [];
    
    for (const product of products.slice(0, 2)) {  // Use first 2 products
      try {
        const inventoryResponse = await axios.get('http://localhost:8000/api/inventory', { 
          headers,
          params: { 
            product: product._id,
            limit: 1
          }
        });
        
        if (inventoryResponse.data.data.inventoryItems.length > 0) {
          const inventoryItem = inventoryResponse.data.data.inventoryItems[0];
          const availableStock = inventoryItem.stock?.available || 0;
          console.log(`  ${product.name}: ${availableStock} units available`);
          
          if (availableStock > 0) {
            inventoryItems.push({
              product: product._id,
              quantity: Math.min(2, availableStock),  // Order 2 units or available stock
              name: product.name,
              price: 50  // Sample price
            });
          }
        }
      } catch (error) {
        console.log(`  ${product.name}: No inventory found`);
      }
    }
    
    if (inventoryItems.length === 0) {
      console.log('❌ No inventory available for any products.');
      return;
    }
    
    console.log(`\n📝 Creating order with ${inventoryItems.length} items:`);
    inventoryItems.forEach(item => {
      console.log(`  - ${item.name}: ${item.quantity} units @ ₹${item.price} each`);
    });
    
    // Calculate order total
    const subtotal = inventoryItems.reduce((total, item) => total + (item.quantity * item.price), 0);
    const tax = subtotal * 0.18;  // 18% GST
    const total = subtotal + tax;
    
    console.log(`  Subtotal: ₹${subtotal}`);
    console.log(`  Tax (18%): ₹${tax.toFixed(2)}`);
    console.log(`  Total: ₹${total.toFixed(2)}`);
    
    // Create order data that matches the expected structure
    const orderData = {
      dealer: dealer._id,
      orderType: 'dealer',  // Specify this is a dealer order
      items: inventoryItems.map(item => ({
        product: item.product,
        quantity: item.quantity,
        unitPrice: item.price,
        totalPrice: item.quantity * item.price
      })),
      pricing: {
        subtotal: subtotal,
        tax: tax,
        total: total,
        discountAmount: 0,
        globalDiscount: 0,
        globalDiscountType: 'percentage'
      },
      shipping: {
        method: 'pickup',  // Use pickup to avoid address validation
        address: {
          warehouse: 'Warehouse A',
          street: 'Main Street',
          city: 'Test City',
          state: 'Test State',
          zipCode: '12345',
          country: 'India'
        }
      },
      payment: {
        method: 'credit',
        paidAmount: 0,
        dueAmount: total,
        status: 'pending'
      },
      notes: 'Test order for dealer balance validation fix'
    };
    
    console.log('\n🚀 Creating order...');
    
    try {
      const orderResponse = await axios.post('http://localhost:8000/api/orders', orderData, { headers });
      
      console.log('✅ Order created successfully!');
      console.log(`Order ID: ${orderResponse.data.data.order._id}`);
      console.log(`Order Number: ${orderResponse.data.data.order.orderNumber}`);
      
      // Check dealer balance after order
      console.log('\n💰 Checking dealer balance after order:');
      const updatedDealerResponse = await axios.get(`http://localhost:8000/api/dealers/${dealer._id}`, { headers });
      const updatedDealer = updatedDealerResponse.data.data.dealer;
      
      console.log(`Previous balance: ₹${dealer.financialInfo?.currentBalance || 0}`);
      console.log(`New balance: ₹${updatedDealer.financialInfo?.currentBalance || 0}`);
      console.log(`Change: ₹${(updatedDealer.financialInfo?.currentBalance || 0) - (dealer.financialInfo?.currentBalance || 0)}`);
      
      // Check dealer transactions
      const transactions = updatedDealer.transactions || [];
      const recentTransaction = transactions[transactions.length - 1];
      
      if (recentTransaction) {
        console.log('\n📊 Recent transaction:');
        console.log(`  Type: ${recentTransaction.type}`);
        console.log(`  Amount: ₹${recentTransaction.amount}`);
        console.log(`  Description: ${recentTransaction.description}`);
        console.log(`  Reference Type: ${recentTransaction.reference?.type || 'N/A'}`);
        console.log(`  Reference ID: ${recentTransaction.reference?.id || 'N/A'}`);
        console.log(`  Balance After: ₹${recentTransaction.balanceAfter}`);
      }
      
      // Check inventory reservation
      console.log('\n📦 Checking inventory reservations:');
      for (const item of inventoryItems) {
        try {
          const inventoryResponse = await axios.get('http://localhost:8000/api/inventory', { 
            headers,
            params: { 
              product: item.product,
              limit: 1
            }
          });
          
          if (inventoryResponse.data.data.inventoryItems.length > 0) {
            const inventoryItem = inventoryResponse.data.data.inventoryItems[0];
            console.log(`  ${item.name}:`);
            console.log(`    Available: ${inventoryItem.stock?.available || 0}`);
            console.log(`    Reserved: ${inventoryItem.stock?.reserved || 0}`);
          }
        } catch (error) {
          console.log(`  ${item.name}: Error checking inventory`);
        }
      }
      
    } catch (error) {
      console.log('❌ Order creation failed:');
      console.log('Error message:', error.response?.data?.message || error.message);
      
      if (error.response?.data?.error) {
        console.log('\n🔍 Detailed error:');
        console.log(JSON.stringify(error.response.data.error, null, 2));
      }
      
      if (error.response?.data) {
        console.log('\n📄 Full error response:');
        console.log(JSON.stringify(error.response.data, null, 2));
      }
    }
    
    console.log('\n✅ Dealer order creation test completed!');
    console.log('\n🎯 Validation Changes Made:');
    console.log('   ✅ Expanded reference.type enum to include: System, Manual, Migration, Correction');
    console.log('   ✅ Changed reference.id type to Mixed (allows ObjectId and String)');
    console.log('   ✅ Made reference fields optional');
    console.log('   ✅ Updated dealer updateBalance method to use new structure');
    
    console.log('\n🚀 Order creation should now work without validation errors!');
    
  } catch (error) {
    console.error('❌ Error during dealer order creation test:', error.response?.data || error.message);
  }
}

testDealerOrderCreation();