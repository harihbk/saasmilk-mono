const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');
const DealerGroup = require('../models/DealerGroup'); // Import DealerGroup first
const Route = require('../models/Route'); // Import Route for Dealer dependencies
const Dealer = require('../models/Dealer'); // Import Dealer after dependencies
const mongoose = require('mongoose');

class InventoryService {
  /**
   * Get default warehouse ObjectId
   * @param {String} warehouseName - Warehouse name or ObjectId
   * @returns {Promise<ObjectId>} - Warehouse ObjectId
   */
  async getWarehouseId(warehouseName = 'Warehouse A') {
    try {
      // If it's already a valid ObjectId, return it
      if (mongoose.Types.ObjectId.isValid(warehouseName) && warehouseName.length === 24) {
        return warehouseName;
      }
      
      // Try to find warehouse by name or code
      let warehouse = await Warehouse.findOne({
        $or: [
          { name: warehouseName },
          { code: warehouseName },
          { name: { $regex: new RegExp(warehouseName, 'i') } }
        ]
      });
      
      // If not found, try to find default warehouse by priority
      if (!warehouse) {
        // Try WH-001 first (where inventory exists)
        warehouse = await Warehouse.findOne({ code: 'WH-001' });
      }
      
      if (!warehouse) {
        // Then try Main Warehouse
        warehouse = await Warehouse.findOne({ code: 'WH-MAIN' });
      }
      
      // If still not found, get the first active warehouse
      if (!warehouse) {
        warehouse = await Warehouse.findOne({ status: 'active' });
      }
      
      if (!warehouse) {
        throw new Error('No warehouse found. Please create a warehouse first.');
      }
      
      return warehouse._id;
    } catch (error) {
      throw new Error(`Failed to get warehouse: ${error.message}`);
    }
  }

  /**
   * Reserve stock for order items
   * @param {Array} orderItems - Array of order items with product and quantity
   * @param {String} orderId - Order ID for tracking
   * @param {String} warehouse - Warehouse location
   * @param {String} userId - User ID performing the operation
   * @param {String} tenantId - Tenant ID for isolation
   * @returns {Promise<Object>} - Result with success status and details
   */
  async reserveStock(orderItems, orderId, warehouse = 'Warehouse A', userId = null, tenantId = null) {
    const reservations = [];
    
    try {
      // Always resolve warehouse to ObjectId first
      const warehouseId = await this.getWarehouseId(warehouse);
      
      for (const item of orderItems) {
        const { product, quantity } = item;
        
        // Build base query with tenant isolation
        const baseQuery = tenantId ? { tenantId } : {};
        
        // Find inventory for this product in the specified warehouse first
        let inventory = await Inventory.findOne({
          ...baseQuery,
          product: product,
          'location.warehouse': warehouseId
        }).populate('location.warehouse', 'name code');
        
        // If not found in specified warehouse, check all warehouses for this tenant
        if (!inventory) {
          console.log(`Product ${product} not found in warehouse ${warehouseId}, checking all warehouses`);
          inventory = await Inventory.findOne({
            ...baseQuery,
            product: product
          }).populate('location.warehouse', 'name code');
        }
        
        if (!inventory) {
          throw new Error(`No inventory found for product ${product} in any warehouse`);
        }
        
        // Check if enough stock is available
        const availableStock = inventory.stock.available - inventory.stock.reserved;
        if (availableStock < quantity) {
          throw new Error(`Insufficient stock for product ${product}. Available: ${availableStock}, Required: ${quantity}`);
        }
        
        // Reserve the stock
        inventory.stock.reserved += quantity;
        
        // Add movement record
        inventory.movements.push({
          type: 'adjustment',
          quantity: quantity,
          reason: `Stock reserved for order ${orderId}`,
          reference: orderId,
          performedBy: userId || new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Use provided userId or system default
          timestamp: new Date(),
          notes: `Reserved ${quantity} units for order processing`
        });
        
        await inventory.save();
        
        reservations.push({
          productId: product,
          quantity: quantity,
          inventoryId: inventory._id
        });
      }
      
      return {
        success: true,
        message: 'Stock reserved successfully',
        reservations
      };
    } catch (error) {
      // Manual rollback: release any reservations that were made
      console.error('Stock reservation failed, attempting rollback:', error.message);
      
      for (const reservation of reservations) {
        try {
          await Inventory.findByIdAndUpdate(reservation.inventoryId, {
            $inc: { 'stock.reserved': -reservation.quantity }
          });
        } catch (rollbackError) {
          console.error('Rollback failed for inventory:', reservation.inventoryId, rollbackError.message);
        }
      }
      
      return {
        success: false,
        message: error.message,
        reservations: []
      };
    }
  }
  
  /**
   * Commit reserved stock (when order is confirmed/shipped)
   * @param {Array} orderItems - Array of order items
   * @param {String} orderId - Order ID
   * @param {String} warehouse - Warehouse location
   * @param {String} userId - User ID performing the operation
   */
  async commitReservedStock(orderItems, orderId, warehouse = 'Warehouse A', userId = null) {
    try {
      // Always resolve warehouse to ObjectId first
      const warehouseId = await this.getWarehouseId(warehouse);
      
      for (const item of orderItems) {
        const { product, quantity } = item;
        
        const inventory = await Inventory.findOne({
          product: product,
          'location.warehouse': warehouseId
        });
        
        if (!inventory) {
          throw new Error(`No inventory found for product ${product}`);
        }
        
        // Move from reserved to actual consumption
        inventory.stock.reserved -= quantity;
        inventory.stock.available -= quantity;
        
        // Add movement record
        inventory.movements.push({
          type: 'out',
          quantity: quantity,
          reason: `Stock shipped for order ${orderId}`,
          reference: orderId,
          performedBy: userId || new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Use provided userId or system default
          timestamp: new Date(),
          notes: `Shipped ${quantity} units for order fulfillment`
        });
        
        await inventory.save();
        
        // Update stock status based on thresholds
        await this.updateStockStatus(inventory._id);
      }
      
      return { success: true, message: 'Stock committed successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
  
  /**
   * Release reserved stock (when order is cancelled)
   * @param {Array} orderItems - Array of order items
   * @param {String} orderId - Order ID
   * @param {String} warehouse - Warehouse location
   * @param {String} userId - User ID performing the operation
   */
  async releaseReservedStock(orderItems, orderId, warehouse = 'Warehouse A', userId = null) {
    try {
      // Always resolve warehouse to ObjectId first
      const warehouseId = await this.getWarehouseId(warehouse);
      
      for (const item of orderItems) {
        const { product, quantity } = item;
        
        const inventory = await Inventory.findOne({
          product: product,
          'location.warehouse': warehouseId
        });
        
        if (!inventory) {
          continue; // Skip if inventory not found
        }
        
        // Release reserved stock
        inventory.stock.reserved = Math.max(0, inventory.stock.reserved - quantity);
        
        // Add movement record
        inventory.movements.push({
          type: 'adjustment',
          quantity: -quantity, // Negative to indicate release
          reason: `Stock released from cancelled order ${orderId}`,
          reference: orderId,
          performedBy: userId || new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'), // Use provided userId or system default
          timestamp: new Date(),
          notes: `Released ${quantity} units from cancelled order`
        });
        
        await inventory.save();
      }
      
      return { success: true, message: 'Reserved stock released successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
  
  /**
   * Update dealer balance for order
   * @param {String} dealerId - Dealer ID
   * @param {Number} amount - Order total amount
   * @param {String} orderId - Order ID for reference
   * @param {String} type - 'debit' or 'credit'
   */
  async updateDealerBalance(dealerId, amount, orderId, type = 'debit') {
    try {
      const dealer = await Dealer.findById(dealerId);
      if (!dealer) {
        throw new Error('Dealer not found');
      }
      
      // Get order details for better description
      const Order = require('../models/Order');
      const order = await Order.findById(orderId).select('orderNumber items');
      
      let description = `Order ${orderId} - ${type === 'debit' ? 'Purchase' : 'Credit'}`;
      if (order) {
        const itemCount = order.items?.length || 0;
        description = `Invoice #${order.orderNumber} - ${itemCount} item(s)`;
      }
      
      // Update dealer balance 
      // Balance convention: Negative = dealer has credit with us, Positive = dealer owes us money
      // Debit = dealer makes purchase (reduces their credit or increases what they owe)
      // Credit = dealer makes payment (increases their credit or reduces what they owe)
      if (type === 'debit') {
        dealer.financialInfo.currentBalance += amount; // Purchase: reduces credit or increases debt
      } else {
        dealer.financialInfo.currentBalance -= amount; // Payment: increases credit or reduces debt
      }
      
      // Add transaction record
      dealer.transactions.push({
        type: type,
        amount: amount,
        description: description,
        reference: {
          type: 'Order',
          id: orderId
        },
        date: new Date(),
        balanceAfter: dealer.financialInfo.currentBalance
      });
      
      await dealer.save();
      
      return {
        success: true,
        message: 'Dealer balance updated successfully',
        newBalance: dealer.financialInfo.currentBalance
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Process complete order - reserve stock and update dealer balance
   * @param {Object} orderData - Complete order data
   */
  async processOrder(orderData) {
    const { items, dealer, pricing, _id: orderId, shipping, userId } = orderData;
    
    try {
      // Step 1: Get proper warehouse ObjectId
      const warehouseInput = shipping?.address?.warehouse || 'Warehouse A';
      const warehouse = await this.getWarehouseId(warehouseInput);
      
      // Step 2: Reserve stock for all items
      const stockResult = await this.reserveStock(items, orderId, warehouse, userId);
      
      if (!stockResult.success) {
        return {
          success: false,
          message: `Stock reservation failed: ${stockResult.message}`,
          step: 'stock_reservation'
        };
      }
      
      // Step 2: Update dealer balance if it's a dealer order
      if (dealer) {
        const balanceResult = await this.updateDealerBalance(
          dealer, 
          pricing.total, 
          orderId, 
          'debit'
        );
        
        if (!balanceResult.success) {
          // Rollback stock reservation
          await this.releaseReservedStock(items, orderId, warehouse, userId);
          return {
            success: false,
            message: `Dealer balance update failed: ${balanceResult.message}`,
            step: 'dealer_balance'
          };
        }
      }
      
      return {
        success: true,
        message: 'Order processed successfully',
        stockReservations: stockResult.reservations
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        step: 'processing'
      };
    }
  }
  
  /**
   * Cancel order - release stock and credit dealer balance
   * @param {Object} orderData - Order data
   */
  async cancelOrder(orderData) {
    const { items, dealer, pricing, _id: orderId, shipping, userId } = orderData;
    
    try {
      const warehouseInput = shipping?.address?.warehouse || 'Warehouse A';
      const warehouse = await this.getWarehouseId(warehouseInput);
      
      // Release reserved stock
      await this.releaseReservedStock(items, orderId, warehouse, userId);
      
      // Credit back dealer balance if it's a dealer order
      if (dealer) {
        await this.updateDealerBalance(dealer, pricing.total, orderId, 'credit');
      }
      
      return {
        success: true,
        message: 'Order cancelled and inventory/balance restored'
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }
  
  /**
   * Update stock status based on thresholds
   * @param {String} inventoryId - Inventory item ID
   */
  async updateStockStatus(inventoryId) {
    try {
      const inventory = await Inventory.findById(inventoryId);
      if (!inventory) return;
      
      const { available } = inventory.stock;
      const { minimum, reorderPoint } = inventory.thresholds;
      
      // Update alerts based on stock levels
      inventory.alerts = [];
      
      if (available === 0) {
        inventory.alerts.push({
          type: 'out_of_stock',
          message: 'Item is out of stock',
          severity: 'critical',
          createdAt: new Date()
        });
      } else if (available <= minimum) {
        inventory.alerts.push({
          type: 'low_stock',
          message: `Stock is below minimum threshold (${minimum})`,
          severity: 'high',
          createdAt: new Date()
        });
      } else if (available <= reorderPoint) {
        inventory.alerts.push({
          type: 'reorder_point',
          message: `Stock has reached reorder point (${reorderPoint})`,
          severity: 'medium',
          createdAt: new Date()
        });
      }
      
      await inventory.save();
    } catch (error) {
      console.error('Error updating stock status:', error);
    }
  }
  
  /**
   * Get stock availability for products
   * @param {Array} productIds - Array of product IDs
   * @param {String} warehouse - Warehouse location
   * @param {String} tenantId - Tenant ID for isolation
   */
  async getStockAvailability(productIds, warehouse = 'Warehouse A', tenantId = null) {
    try {
      const warehouseId = await this.getWarehouseId(warehouse);
      
      // Build base query with tenant isolation
      const baseQuery = tenantId ? { tenantId } : {};
      
      // First try to find inventory in the specified warehouse
      let inventoryItems = await Inventory.find({
        ...baseQuery,
        product: { $in: productIds },
        'location.warehouse': warehouseId
      }).populate('product', 'name sku').populate('location.warehouse', 'name code');
      
      // If not all products found in the specified warehouse, check all warehouses for this tenant
      const foundProductIds = inventoryItems.map(item => item.product._id.toString());
      const missingProductIds = productIds.filter(id => !foundProductIds.includes(id.toString()));
      
      if (missingProductIds.length > 0) {
        console.log(`Products ${missingProductIds} not found in warehouse ${warehouseId}, checking all warehouses for tenant ${tenantId}`);
        
        // Find missing products in any warehouse for this tenant
        const additionalItems = await Inventory.find({
          ...baseQuery,
          product: { $in: missingProductIds },
          'location.warehouse': { $ne: warehouseId } // Exclude already checked warehouse
        }).populate('product', 'name sku').populate('location.warehouse', 'name code');
        
        // Combine results
        inventoryItems = [...inventoryItems, ...additionalItems];
      }
      
      return inventoryItems.map(item => ({
        productId: item.product._id,
        productName: item.product.name,
        sku: item.product.sku,
        available: item.stock.available - item.stock.reserved,
        reserved: item.stock.reserved,
        total: item.stock.available,
        minimum: item.thresholds.minimum,
        warehouse: {
          id: item.location.warehouse._id,
          name: item.location.warehouse.name,
          code: item.location.warehouse.code
        },
        status: item.stock.available === 0 ? 'out_of_stock' : 
                item.stock.available <= item.thresholds.minimum ? 'low_stock' : 'available'
      }));
    } catch (error) {
      throw new Error(`Failed to get stock availability: ${error.message}`);
    }
  }
}

module.exports = new InventoryService();
