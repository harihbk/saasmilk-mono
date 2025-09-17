require('dotenv').config();
const mongoose = require('mongoose');
const Route = require('../models/Route');
const Dealer = require('../models/Dealer');

async function checkRoutes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
    console.log('✓ Connected to MongoDB');

    // Check routes
    const routes = await Route.find();
    console.log(`\n📍 Total Routes: ${routes.length}`);
    
    if (routes.length === 0) {
      console.log('\n❌ No routes found in database!');
      console.log('Creating sample routes...');
      
      const sampleRoutes = [
        {
          code: 'RT001',
          name: 'Downtown Route',
          description: 'Central business district delivery route',
          area: 'Downtown',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          status: 'active',
          dealerCount: 0
        },
        {
          code: 'RT002', 
          name: 'Suburban Route',
          description: 'Residential suburban areas',
          area: 'Andheri',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400058',
          status: 'active',
          dealerCount: 0
        },
        {
          code: 'RT003',
          name: 'Industrial Route',
          description: 'Industrial zone deliveries',
          area: 'Powai',
          city: 'Mumbai', 
          state: 'Maharashtra',
          pincode: '400076',
          status: 'active',
          dealerCount: 0
        }
      ];
      
      await Route.insertMany(sampleRoutes);
      console.log('✅ Sample routes created successfully');
    } else {
      console.log('\n📋 Existing Routes:');
      routes.forEach(route => {
        console.log(`  ${route.code}: ${route.name} (${route.city}) - ${route.status}`);
        console.log(`    Dealers: ${route.dealerCount || 0}`);
      });
    }

    // Check dealers with routes
    const dealersWithRoutes = await Dealer.find({ 
      deliveryRoute: { $exists: true, $ne: null } 
    }).populate('deliveryRoute', 'code name');
    
    console.log(`\n🏪 Dealers with routes: ${dealersWithRoutes.length}`);
    dealersWithRoutes.forEach(dealer => {
      console.log(`  ${dealer.name}: Route ${dealer.deliveryRoute?.code || 'Unknown'}`);
    });

    mongoose.disconnect();
    
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.disconnect();
  }
}

checkRoutes();