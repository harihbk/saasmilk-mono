// Import all models to ensure they are registered with Mongoose
// This file ensures that all models are loaded and their relationships work correctly

require('./User');
require('./Product');
require('./Category');
require('./Supplier');
require('./Customer');
require('./Dealer');
require('./DealerGroup');
require('./Order');
require('./Inventory');
require('./Warehouse');
require('./Route');
require('./Role');
require('./Company');
require('./FleetMaintenance');
require('./Procurement');

module.exports = {};