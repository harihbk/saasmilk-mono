require('dotenv').config();
const mongoose = require('mongoose');
const Dealer = require('../models/Dealer');
const Route = require('../models/Route');
const Order = require('../models/Order');

async function checkDealerRoutes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
    console.log('✓ Connected to MongoDB');

    // Check all routes
    const routes = await Route.find();
    console.log(`\n📍 Total Routes: ${routes.length}`);
    routes.forEach(route => {
      console.log(`  - ${route.code}: ${route.name} (${route.city}) - Status: ${route.status}`);
    });

    // Check dealers with routes
    const dealersWithRoutes = await Dealer.find({ 
      route: { $exists: true, $ne: null } 
    }).populate('route', 'code name');
    
    console.log(`\n🏪 Dealers with routes assigned: ${dealersWithRoutes.length}`);
    dealersWithRoutes.forEach(dealer => {
      console.log(`  - ${dealer.name}: Route ${dealer.route?.code || 'Unknown'} (${dealer.route?.name})`);
    });

    // Check dealers WITHOUT routes
    const dealersWithoutRoutes = await Dealer.find({ 
      $or: [
        { route: { $exists: false } },
        { route: null }
      ]
    });
    
    console.log(`\n⚠️  Dealers WITHOUT routes: ${dealersWithoutRoutes.length}`);
    dealersWithoutRoutes.forEach(dealer => {
      console.log(`  - ${dealer.name || dealer.businessName}`);
    });

    // Check orders with dealers
    const ordersWithDealers = await Order.find({ 
      dealer: { $exists: true, $ne: null } 
    })
    .populate({
      path: 'dealer',
      select: 'name route',
      populate: {
        path: 'route',
        select: 'code name'
      }
    })
    .limit(5);
    
    console.log(`\n📦 Sample Orders with Dealers and Routes:`);
    ordersWithDealers.forEach(order => {
      console.log(`  Order ${order.orderNumber}:`);
      console.log(`    Dealer: ${order.dealer?.name || 'Unknown'}`);
      console.log(`    Route: ${order.dealer?.route?.code || 'No route'} - ${order.dealer?.route?.name || 'N/A'}`);
      console.log(`    Amount: ₹${order.pricing?.total || 0}`);
    });

    // If no dealers have routes, assign the first route to all dealers
    if (dealersWithRoutes.length === 0 && routes.length > 0) {
      console.log('\n🔧 Assigning route to dealers...');
      const firstRoute = routes[0];
      
      await Dealer.updateMany(
        {},
        { $set: { route: firstRoute._id } }
      );
      
      console.log(`✅ Assigned route ${firstRoute.code} to all dealers`);
      
      // Update route dealer count
      const dealerCount = await Dealer.countDocuments({ route: firstRoute._id });
      await Route.findByIdAndUpdate(firstRoute._id, { dealerCount });
      console.log(`✅ Updated route dealer count to ${dealerCount}`);
    }

    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.disconnect();
  }
}

checkDealerRoutes();