require('dotenv').config();
const axios = require('axios');

async function testInventoryPricePopulation() {
  try {
    console.log('🧪 Testing Inventory Price and GST Auto-Population\n');
    
    // Login
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:8000/api/auth/login', {
      email: 'hari@gmail.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.data.token;
    const user = loginResponse.data.data.user;
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': user.tenantId
    };
    
    console.log(`✅ Logged in - Tenant ID: ${user.tenantId}`);
    
    // Create a product with price and GST
    console.log('\n📝 Creating a test product with price and GST...');
    
    // First get categories
    const categoriesResponse = await axios.get('http://localhost:8000/api/categories', { headers });
    const categories = categoriesResponse.data.data.categories;
    let categoryId;
    
    if (categories.length > 0) {
      categoryId = categories[0]._id;
    } else {
      // Create a category
      const categoryResponse = await axios.post('http://localhost:8000/api/categories', {
        name: 'test-dairy',
        displayName: 'Test Dairy Products',
        description: 'Test category for dairy products'
      }, { headers });
      categoryId = categoryResponse.data.data.category._id;
    }
    
    // Get suppliers
    const suppliersResponse = await axios.get('http://localhost:8000/api/suppliers', { headers });
    const suppliers = suppliersResponse.data.data.suppliers;
    
    if (suppliers.length === 0) {
      console.log('❌ No suppliers found. Please create a supplier first.');
      return;
    }
    
    const supplierId = suppliers[0]._id;
    console.log(`✅ Using supplier: ${suppliers[0].companyInfo.name}`);
    
    const productData = {
      name: 'Test Milk with Price',
      description: 'Test milk product with price and GST for inventory testing',
      category: categoryId,
      supplier: supplierId,
      brand: 'Test Brand',
      sku: 'TEST-MILK-001',
      price: {
        cost: 25.50,      // Cost price
        selling: 45.00,   // Selling price
        wholesale: 40.00
      },
      tax: {
        igst: 0,
        cgst: 9,
        sgst: 9
      },
      packaging: {
        type: 'bottle',
        size: {
          value: 1,
          unit: 'l'
        }
      },
      storage: {
        temperature: {
          min: 2,
          max: 8,
          unit: 'celsius'
        },
        shelfLife: {
          value: 5,
          unit: 'days'
        }
      }
    };
    
    let productId;
    try {
      const productResponse = await axios.post('http://localhost:8000/api/products', productData, { headers });
      productId = productResponse.data.data.product._id;
      console.log(`✅ Created test product: ${productResponse.data.data.product.name}`);
      console.log(`   Cost Price: ₹${productData.price.cost}`);
      console.log(`   Selling Price: ₹${productData.price.selling}`);
      console.log(`   CGST: ${productData.tax.cgst}%, SGST: ${productData.tax.sgst}%`);
    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        // Product exists, get it
        const productsResponse = await axios.get('http://localhost:8000/api/products?search=TEST-MILK-001', { headers });
        productId = productsResponse.data.data.products[0]._id;
        console.log('✅ Using existing test product');
      } else {
        throw error;
      }
    }
    
    // Get warehouses
    console.log('\n📦 Getting warehouses...');
    const warehousesResponse = await axios.get('http://localhost:8000/api/warehouses', { headers });
    const warehouses = warehousesResponse.data.data.warehouses;
    
    if (warehouses.length === 0) {
      console.log('❌ No warehouses found. Please create a warehouse first.');
      return;
    }
    
    const warehouseId = warehouses[0]._id;
    console.log(`✅ Using warehouse: ${warehouses[0].name} (${warehouses[0].code})`);
    
    // Create inventory item for this product
    console.log('\n📦 Creating inventory item...');
    const inventoryData = {
      product: productId,
      stock: {
        available: 100,
        reserved: 0
      },
      thresholds: {
        minimum: 10,
        maximum: 500,
        reorderPoint: 25
      },
      location: {
        warehouse: warehouseId,
        zone: 'Test Zone',
        aisle: 'A1',
        shelf: '1',
        bin: '001'
      },
      pricing: {
        averageCost: 25.50,    // Should be auto-populated from product
        lastPurchasePrice: 45.00,  // Should be auto-populated from product
        totalValue: 100 * 25.50
      },
      tax: {
        igst: 0,
        cgst: 9,
        sgst: 9
      },
      batches: [{
        batchNumber: 'TEST-BATCH-001',
        quantity: 100,
        manufactureDate: new Date(),
        expiryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
        receivedDate: new Date()
      }]
    };
    
    try {
      const inventoryResponse = await axios.post('http://localhost:8000/api/inventory', inventoryData, { headers });
      console.log('✅ Created inventory item successfully');
      
      const inventory = inventoryResponse.data.data.inventoryItem;
      console.log('\n📊 Inventory item details:');
      console.log(`   Product: ${inventory.product?.name || 'Product name not populated'}`);
      console.log(`   Available Stock: ${inventory.stock.available}`);
      console.log(`   Average Cost: ₹${inventory.pricing.averageCost}`);
      console.log(`   Last Purchase Price: ₹${inventory.pricing.lastPurchasePrice}`);
      console.log(`   IGST: ${inventory.tax?.igst || 0}%`);
      console.log(`   CGST: ${inventory.tax?.cgst || 0}%`);
      console.log(`   SGST: ${inventory.tax?.sgst || 0}%`);
      
    } catch (error) {
      if (error.response?.data?.message?.includes('already exists')) {
        console.log('⚠️  Inventory item already exists for this product');
        
        // Get existing inventory
        const inventoryResponse = await axios.get(`http://localhost:8000/api/inventory?product=${productId}`, { headers });
        const inventoryItems = inventoryResponse.data.data.inventoryItems;
        
        if (inventoryItems.length > 0) {
          const inventory = inventoryItems[0];
          console.log('\n📊 Existing inventory item details:');
          console.log(`   Product: ${inventory.product?.name || 'Product name not populated'}`);
          console.log(`   Available Stock: ${inventory.stock.available}`);
          console.log(`   Average Cost: ₹${inventory.pricing?.averageCost || 0}`);
          console.log(`   Last Purchase Price: ₹${inventory.pricing?.lastPurchasePrice || 0}`);
          console.log(`   IGST: ${inventory.tax?.igst || 0}%`);
          console.log(`   CGST: ${inventory.tax?.cgst || 0}%`);
          console.log(`   SGST: ${inventory.tax?.sgst || 0}%`);
        }
      } else {
        throw error;
      }
    }
    
    console.log('\n✅ Inventory Price and GST Auto-Population Test Completed!');
    console.log('\n📝 Next Steps:');
    console.log('1. Open the frontend inventory page');
    console.log('2. Click "Add Inventory Item"');
    console.log('3. Select the test product "Test Milk with Price"');
    console.log('4. Verify that Cost Price (₹25.50) and Selling Price (₹45.00) are auto-populated');
    console.log('5. Verify that CGST (9%) and SGST (9%) are auto-populated');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testInventoryPricePopulation();