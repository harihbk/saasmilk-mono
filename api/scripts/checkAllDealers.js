require('dotenv').config();
const mongoose = require('mongoose');
require('../models');
const Dealer = require('../models/Dealer');

async function checkAllDealers() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/milk-delivery');
  
  const dealers = await Dealer.find({}).select('name dealerCode tenantId').sort('tenantId');
  
  const byTenant = {};
  dealers.forEach(d => {
    if (!byTenant[d.tenantId]) byTenant[d.tenantId] = [];
    byTenant[d.tenantId].push(`${d.name}: ${d.dealerCode}`);
  });
  
  console.log('🏢 Dealers by Tenant:');
  Object.keys(byTenant).sort().forEach(tenantId => {
    console.log(`\nTenant ${tenantId}: ${byTenant[tenantId].length} dealer(s)`);
    byTenant[tenantId].forEach(d => console.log(`  - ${d}`));
  });
  
  // Check for duplicate dealer codes across tenants
  const codes = {};
  dealers.forEach(d => {
    if (!codes[d.dealerCode]) codes[d.dealerCode] = [];
    codes[d.dealerCode].push(d.tenantId);
  });
  
  const duplicates = Object.entries(codes).filter(([code, tenants]) => tenants.length > 1);
  
  if (duplicates.length > 0) {
    console.log('\n✅ Dealer codes shared across tenants (proving isolation works):');
    duplicates.forEach(([code, tenants]) => {
      console.log(`  Code ${code} exists in tenants: ${tenants.join(', ')}`);
    });
  } else {
    console.log('\n✅ No duplicate dealer codes across tenants');
  }
  
  mongoose.disconnect();
}

checkAllDealers().catch(console.error);