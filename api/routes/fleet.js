const express = require('express');
const mongoose = require('mongoose');
const { body, param, query } = require('express-validator');
const Fleet = require('../models/Fleet');
const FleetMaintenance = require('../models/FleetMaintenance');
const User = require('../models/User');
const Route = require('../models/Route');
const { protect, authorize } = require('../middleware/auth');
const { extractTenant, validateTenantAccess, autoTenantFilter } = require('../middleware/tenant');
const { 
  handleValidationErrors, 
  sanitizeInput, 
  validatePagination, 
  validateSort,
  validateSearch,
  validateDateRange
} = require('../middleware/validation');
const { 
  uploadFleetImages, 
  uploadFleetDocuments, 
  handleUploadError,
  processUploadedFiles,
  deleteFile 
} = require('../middleware/upload');

const router = express.Router();

// @desc    Get all fleet vehicles
// @route   GET /api/fleet
// @access  Private
router.get('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination,
  validateSort([
    'vehicleNumber', 'make', 'model', 'year', 'status', 'condition',
    'currentOdometer', 'lastServiceDate', 'createdAt'
  ]),
  validateSearch(['vehicleNumber', 'make', 'model', 'vehicleType'])
], async (req, res) => {
  try {
    const { page, limit, skip, sort } = req.query;
    const { status, vehicleType, assignedDriver, assignedRoute, condition } = req.query;

    // Build query with tenant isolation
    let query = { ...req.tenantFilter };

    // Add search query if exists
    if (req.searchQuery) {
      query = { ...query, ...req.searchQuery };
    }

    // Add filters
    if (status) query.status = status;
    if (vehicleType) query.vehicleType = vehicleType;
    if (assignedDriver) query.assignedDriver = assignedDriver;
    if (assignedRoute) query.assignedRoute = assignedRoute;
    if (condition) query.condition = condition;

    // Execute query with pagination
    const vehicles = await Fleet.find(query)
      .populate('assignedDriver', 'name email phone')
      .populate('assignedRoute', 'name code')
      .populate('createdBy', 'name email')
      .sort(sort || { createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await Fleet.countDocuments(query);

    // Add virtual fields and transform backend fields to match frontend expectations
    const vehiclesWithVirtuals = vehicles.map(vehicle => {
      const vehicleData = {
        ...vehicle.toJSON(),
        age: vehicle.age,
        daysUntilService: vehicle.daysUntilService,
        expiringDocuments: vehicle.getExpiringDocuments()
      };

      // Transform nextServiceDue to nextServiceDate for frontend compatibility
      if (vehicleData.nextServiceDue?.date) {
        vehicleData.nextServiceDate = vehicleData.nextServiceDue.date;
        vehicleData.nextServiceOdometer = vehicleData.nextServiceDue.odometer;
      }

      return vehicleData;
    });

    res.json({
      success: true,
      data: {
        vehicles: vehiclesWithVirtuals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get fleet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching fleet vehicles'
    });
  }
});

// @desc    Get available drivers for fleet assignment
// @route   GET /api/fleet/available-drivers
// @access  Private
router.get('/available-drivers', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => {
  try {
    // Get all users who can be drivers
    const query = { ...req.tenantFilter };
    
    // Include common roles that can drive vehicles
    // Adding 'viewer' because there might be dedicated driver users with this role
    query.role = { $in: ['admin', 'manager', 'employee', 'viewer', 'company_admin'] };
    
    // If status field exists, only get active users, otherwise get all
    const sampleUser = await User.findOne(req.tenantFilter);
    if (sampleUser && sampleUser.status !== undefined) {
      query.status = 'active';
    }
    
    const availableDrivers = await User.find(query)
      .select('_id name email personalInfo.firstName personalInfo.lastName role')
      .sort({ name: 1 });

    // Format the response for dropdown usage
    const formattedDrivers = availableDrivers.map(user => ({
      value: user._id.toString(),
      label: user.name || `${user.personalInfo?.firstName || ''} ${user.personalInfo?.lastName || ''}`.trim() || user.email,
      email: user.email
    }));

    res.json({
      success: true,
      data: { drivers: formattedDrivers }
    });
  } catch (error) {
    console.error('Get available drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching available drivers'
    });
  }
});

// @desc    Get single fleet vehicle
// @route   GET /api/fleet/:id
// @access  Private
router.get('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid vehicle ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const vehicle = await Fleet.findOne({ _id: req.params.id, ...req.tenantFilter })
      .populate('assignedDriver', 'name email phone role')
      .populate('assignedRoute', 'name code city area')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Get maintenance history
    const maintenanceHistory = await FleetMaintenance.find({ 
      vehicle: vehicle._id, 
      ...req.tenantFilter 
    })
      .populate('createdBy', 'name')
      .populate('serviceProvider.name')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get upcoming maintenance
    const upcomingMaintenance = await FleetMaintenance.find({
      vehicle: vehicle._id,
      ...req.tenantFilter,
      status: { $in: ['scheduled', 'in_progress'] }
    })
      .populate('createdBy', 'name')
      .sort({ scheduledDate: 1 });

    // Add virtual fields and transform backend fields to match frontend expectations
    const vehicleData = {
      ...vehicle.toJSON(),
      age: vehicle.age,
      daysUntilService: vehicle.daysUntilService,
      expiringDocuments: vehicle.getExpiringDocuments(),
      totalCostOfOwnership: vehicle.calculateTotalCost()
    };

    // Transform nextServiceDue to nextServiceDate for frontend compatibility
    if (vehicleData.nextServiceDue?.date) {
      vehicleData.nextServiceDate = vehicleData.nextServiceDue.date;
      vehicleData.nextServiceOdometer = vehicleData.nextServiceDue.odometer;
    }

    res.json({
      success: true,
      data: { 
        vehicle: vehicleData,
        maintenanceHistory,
        upcomingMaintenance
      }
    });
  } catch (error) {
    console.error('Get vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching vehicle'
    });
  }
});

// @desc    Create new fleet vehicle
// @route   POST /api/fleet
// @access  Private
router.post('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  uploadFleetDocuments,
  handleUploadError,
  sanitizeInput,
  body('vehicleNumber')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Vehicle number is required'),
  body('vehicleType')
    .isIn(['truck', 'van', 'pickup', 'bike', 'auto', 'tempo', 'container'])
    .withMessage('Invalid vehicle type'),
  body('make')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Vehicle make is required and must be less than 50 characters'),
  body('model')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Vehicle model is required and must be less than 50 characters'),
  body('year')
    .isInt({ min: 1990, max: new Date().getFullYear() + 1 })
    .withMessage('Invalid manufacturing year'),
  body('registrationDate')
    .optional()
    .isISO8601()
    .withMessage('Valid registration date is required'),
  body('fuelType')
    .optional()
    .isIn(['petrol', 'diesel', 'cng', 'electric', 'hybrid'])
    .withMessage('Invalid fuel type'),
  body('assignedDriver')
    .optional()
    .custom((value) => {
      if (value && value !== '' && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid driver ID');
      }
      return true;
    }),
  body('assignedRoute')
    .optional()
    .custom((value) => {
      if (value && value !== '' && !mongoose.Types.ObjectId.isValid(value)) {
        throw new Error('Invalid route ID');
      }
      return true;
    }),
  handleValidationErrors
], async (req, res) => {
  try {
    // Check if vehicle number already exists
    const existingVehicle = await Fleet.findOne({ 
      vehicleNumber: req.body.vehicleNumber.toUpperCase(),
      ...req.tenantFilter 
    });
    
    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle number already exists'
      });
    }

    // Process uploaded documents
    const uploadedFiles = processUploadedFiles(req, req.files);
    const documents = {};
    
    uploadedFiles.forEach(file => {
      if (file.fieldName) {
        documents[file.fieldName] = {
          documentUrl: file.fileUrl,
          uploadedAt: file.uploadedAt
        };
      }
    });

    // Create vehicle data
    const vehicleData = {
      ...req.body,
      ...req.tenantFilter,
      createdBy: req.user.id,
      vehicleNumber: req.body.vehicleNumber.toUpperCase()
    };

    // Clean up optional ObjectId fields - remove invalid values
    if (vehicleData.assignedDriver === '' || vehicleData.assignedDriver === 'test') {
      delete vehicleData.assignedDriver;
    }
    if (vehicleData.assignedRoute === '' || vehicleData.assignedRoute === 'test') {
      delete vehicleData.assignedRoute;
    }

    // Transform frontend field names to match backend model
    if (vehicleData.nextServiceDate) {
      vehicleData.nextServiceDue = {
        date: vehicleData.nextServiceDate,
        odometer: vehicleData.nextServiceOdometer || null
      };
      delete vehicleData.nextServiceDate;
      delete vehicleData.nextServiceOdometer;
    }

    // Add document URLs to appropriate fields
    if (documents.registrationCertificate) {
      vehicleData.registrationCertificate = {
        ...vehicleData.registrationCertificate,
        ...documents.registrationCertificate
      };
    }
    if (documents.insuranceDocument) {
      vehicleData.insurance = {
        ...vehicleData.insurance,
        ...documents.insuranceDocument
      };
    }
    if (documents.pollutionCertificate) {
      vehicleData.pollution = {
        ...vehicleData.pollution,
        ...documents.pollutionCertificate
      };
    }
    if (documents.fitnessCertificate) {
      vehicleData.fitness = {
        ...vehicleData.fitness,
        ...documents.fitnessCertificate
      };
    }
    if (documents.permitDocument) {
      vehicleData.permit = {
        ...vehicleData.permit,
        ...documents.permitDocument
      };
    }
    if (documents.purchaseInvoice) {
      vehicleData.purchaseDetails = {
        ...vehicleData.purchaseDetails,
        ...documents.purchaseInvoice
      };
    }
    if (documents.leaseContract) {
      vehicleData.leaseDetails = {
        ...vehicleData.leaseDetails,
        ...documents.leaseContract
      };
    }

    const vehicle = await Fleet.create(vehicleData);

    // Populate the created vehicle
    await vehicle.populate('assignedDriver', 'name email');
    await vehicle.populate('assignedRoute', 'name code');
    await vehicle.populate('createdBy', 'name email');

    // Transform backend fields to match frontend expectations
    const responseData = vehicle.toObject();
    if (responseData.nextServiceDue?.date) {
      responseData.nextServiceDate = responseData.nextServiceDue.date;
      responseData.nextServiceOdometer = responseData.nextServiceDue.odometer;
    }

    res.status(201).json({
      success: true,
      message: 'Vehicle added to fleet successfully',
      data: { vehicle: responseData }
    });
  } catch (error) {
    console.error('Create vehicle error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle number already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while creating vehicle'
    });
  }
});

// @desc    Update fleet vehicle
// @route   PUT /api/fleet/:id
// @access  Private
router.put('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid vehicle ID'),
  uploadFleetDocuments,
  handleUploadError,
  sanitizeInput,
  body('vehicleNumber')
    .optional()
    .trim(),
  body('vehicleType')
    .optional()
    .isIn(['truck', 'van', 'pickup', 'bike', 'auto', 'tempo', 'container'])
    .withMessage('Invalid vehicle type'),
  body('year')
    .optional()
    .isInt({ min: 1990, max: new Date().getFullYear() + 1 })
    .withMessage('Invalid manufacturing year'),
  body('fuelType')
    .optional()
    .isIn(['petrol', 'diesel', 'cng', 'electric', 'hybrid'])
    .withMessage('Invalid fuel type'),
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'maintenance', 'breakdown', 'sold', 'accident'])
    .withMessage('Invalid status'),
  body('condition')
    .optional()
    .isIn(['excellent', 'good', 'fair', 'poor'])
    .withMessage('Invalid condition'),
  handleValidationErrors
], async (req, res) => {
  try {
    const vehicle = await Fleet.findOne({ _id: req.params.id, ...req.tenantFilter });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check if vehicle number is being changed and if it conflicts
    if (req.body.vehicleNumber && req.body.vehicleNumber !== vehicle.vehicleNumber) {
      const existingVehicle = await Fleet.findOne({ 
        vehicleNumber: req.body.vehicleNumber.toUpperCase(),
        _id: { $ne: req.params.id },
        ...req.tenantFilter 
      });
      
      if (existingVehicle) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle number already exists'
        });
      }
    }

    // Process uploaded documents
    const uploadedFiles = processUploadedFiles(req, req.files);
    const documents = {};
    
    uploadedFiles.forEach(file => {
      if (file.fieldName) {
        documents[file.fieldName] = {
          documentUrl: file.fileUrl,
          uploadedAt: file.uploadedAt
        };
      }
    });

    // Update vehicle data
    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };

    if (req.body.vehicleNumber) {
      updateData.vehicleNumber = req.body.vehicleNumber.toUpperCase();
    }

    // Transform frontend field names to match backend model
    if (updateData.nextServiceDate) {
      updateData.nextServiceDue = {
        date: updateData.nextServiceDate,
        odometer: updateData.nextServiceOdometer || vehicle.nextServiceDue?.odometer || null
      };
      delete updateData.nextServiceDate;
      delete updateData.nextServiceOdometer;
    }

    // Update document URLs if new documents were uploaded
    if (documents.registrationCertificate) {
      updateData.registrationCertificate = {
        ...vehicle.registrationCertificate,
        ...documents.registrationCertificate
      };
    }
    if (documents.insuranceDocument) {
      updateData.insurance = {
        ...vehicle.insurance,
        ...documents.insuranceDocument
      };
    }
    if (documents.pollutionCertificate) {
      updateData.pollution = {
        ...vehicle.pollution,
        ...documents.pollutionCertificate
      };
    }
    if (documents.fitnessCertificate) {
      updateData.fitness = {
        ...vehicle.fitness,
        ...documents.fitnessCertificate
      };
    }
    if (documents.permitDocument) {
      updateData.permit = {
        ...vehicle.permit,
        ...documents.permitDocument
      };
    }

    const updatedVehicle = await Fleet.findOneAndUpdate(
      { _id: req.params.id, ...req.tenantFilter },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('assignedDriver', 'name email')
      .populate('assignedRoute', 'name code')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    // Transform backend fields to match frontend expectations
    const vehicleData = updatedVehicle.toObject();
    if (vehicleData.nextServiceDue?.date) {
      vehicleData.nextServiceDate = vehicleData.nextServiceDue.date;
      vehicleData.nextServiceOdometer = vehicleData.nextServiceDue.odometer;
    }

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      data: { vehicle: vehicleData }
    });
  } catch (error) {
    console.error('Update vehicle error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle number already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error while updating vehicle'
    });
  }
});

// @desc    Delete fleet vehicle
// @route   DELETE /api/fleet/:id
// @access  Private
router.delete('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid vehicle ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const vehicle = await Fleet.findOne({ _id: req.params.id, ...req.tenantFilter });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Check if vehicle has any maintenance records
    const maintenanceCount = await FleetMaintenance.countDocuments({ 
      vehicle: vehicle._id, 
      ...req.tenantFilter 
    });
    
    if (maintenanceCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete vehicle. ${maintenanceCount} maintenance record(s) are associated with this vehicle.`
      });
    }

    // Delete associated files
    const documentsToDelete = [
      vehicle.registrationCertificate?.documentUrl,
      vehicle.insurance?.documentUrl,
      vehicle.pollution?.documentUrl,
      vehicle.fitness?.documentUrl,
      vehicle.permit?.documentUrl,
      vehicle.purchaseDetails?.documentUrl,
      vehicle.leaseDetails?.contractUrl
    ];

    vehicle.images?.forEach(image => {
      documentsToDelete.push(image.url);
    });

    documentsToDelete.forEach(url => {
      if (url) {
        const filePath = url.replace(`${req.protocol}://${req.get('host')}/`, '');
        deleteFile(filePath);
      }
    });

    await Fleet.findOneAndDelete({ _id: req.params.id, ...req.tenantFilter });

    res.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting vehicle'
    });
  }
});

// @desc    Upload vehicle images
// @route   POST /api/fleet/:id/images
// @access  Private
router.post('/:id/images', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid vehicle ID'),
  uploadFleetImages,
  handleUploadError,
  handleValidationErrors
], async (req, res) => {
  try {
    const vehicle = await Fleet.findOne({ _id: req.params.id, ...req.tenantFilter });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images uploaded'
      });
    }

    // Process uploaded images
    const uploadedImages = processUploadedFiles(req, req.files);
    
    // Add captions from request body if provided
    const captions = req.body.captions ? JSON.parse(req.body.captions) : [];
    
    uploadedImages.forEach((image, index) => {
      image.caption = captions[index] || '';
      image.uploadedBy = req.user.id;
    });

    // Add images to vehicle
    vehicle.images = vehicle.images || [];
    vehicle.images.push(...uploadedImages);
    vehicle.updatedBy = req.user.id;

    await vehicle.save();

    res.json({
      success: true,
      message: `${uploadedImages.length} image(s) uploaded successfully`,
      data: { 
        images: uploadedImages,
        totalImages: vehicle.images.length
      }
    });
  } catch (error) {
    console.error('Upload images error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading images'
    });
  }
});

// @desc    Update vehicle odometer
// @route   PUT /api/fleet/:id/odometer
// @access  Private
router.put('/:id/odometer', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid vehicle ID'),
  body('currentOdometer')
    .isFloat({ min: 0 })
    .withMessage('Valid odometer reading is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const vehicle = await Fleet.findOne({ _id: req.params.id, ...req.tenantFilter });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    const newReading = parseFloat(req.body.currentOdometer);
    
    if (newReading < vehicle.currentOdometer) {
      return res.status(400).json({
        success: false,
        message: 'New odometer reading cannot be less than current reading'
      });
    }

    const oldReading = vehicle.currentOdometer;
    await vehicle.updateOdometer(newReading);

    res.json({
      success: true,
      message: 'Odometer updated successfully',
      data: { 
        vehicleId: vehicle._id,
        oldReading,
        newReading,
        daysUntilService: vehicle.daysUntilService
      }
    });
  } catch (error) {
    console.error('Update odometer error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while updating odometer'
    });
  }
});

// @desc    Get fleet statistics
// @route   GET /api/fleet/meta/stats
// @access  Private
router.get('/meta/stats', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter
], async (req, res) => {
  try {
    // Basic fleet statistics
    const totalVehicles = await Fleet.countDocuments(req.tenantFilter);
    const activeVehicles = await Fleet.countDocuments({ ...req.tenantFilter, status: 'active' });
    const maintenanceVehicles = await Fleet.countDocuments({ ...req.tenantFilter, status: 'maintenance' });
    const breakdownVehicles = await Fleet.countDocuments({ ...req.tenantFilter, status: 'breakdown' });

    // Vehicle type distribution
    const vehicleTypes = await Fleet.aggregate([
      { $match: req.tenantFilter },
      { $group: { _id: '$vehicleType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Condition distribution
    const conditionStats = await Fleet.aggregate([
      { $match: req.tenantFilter },
      { $group: { _id: '$condition', count: { $sum: 1 } } }
    ]);

    // Age distribution
    const currentYear = new Date().getFullYear();
    const ageStats = await Fleet.aggregate([
      { $match: req.tenantFilter },
      {
        $addFields: {
          age: { $subtract: [currentYear, '$year'] }
        }
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lte: ['$age', 2] }, then: '0-2 years' },
                { case: { $lte: ['$age', 5] }, then: '3-5 years' },
                { case: { $lte: ['$age', 10] }, then: '6-10 years' },
                { case: { $gt: ['$age', 10] }, then: '10+ years' }
              ]
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Fuel type distribution
    const fuelTypeStats = await Fleet.aggregate([
      { $match: req.tenantFilter },
      { $group: { _id: '$fuelType', count: { $sum: 1 } } }
    ]);

    // Maintenance cost summary
    const maintenanceCosts = await Fleet.aggregate([
      { $match: req.tenantFilter },
      {
        $group: {
          _id: null,
          totalMaintenanceCost: { $sum: '$totalMaintenanceCost' },
          totalFuelCost: { $sum: '$totalFuelCost' },
          avgMaintenanceCost: { $avg: '$totalMaintenanceCost' }
        }
      }
    ]);

    // Upcoming expirations (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingExpirations = await Fleet.aggregate([
      { $match: req.tenantFilter },
      {
        $project: {
          vehicleNumber: 1,
          expirations: {
            $filter: {
              input: [
                { type: 'Insurance', date: '$insurance.expiryDate' },
                { type: 'Pollution', date: '$pollution.expiryDate' },
                { type: 'Fitness', date: '$fitness.expiryDate' },
                { type: 'Permit', date: '$permit.expiryDate' }
              ],
              cond: {
                $and: [
                  { $ne: ['$$this.date', null] },
                  { $lte: ['$$this.date', thirtyDaysFromNow] },
                  { $gte: ['$$this.date', new Date()] }
                ]
              }
            }
          }
        }
      },
      { $match: { 'expirations.0': { $exists: true } } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalVehicles,
          activeVehicles,
          maintenanceVehicles,
          breakdownVehicles,
          utilizationRate: totalVehicles > 0 ? (activeVehicles / totalVehicles * 100).toFixed(2) : 0
        },
        distributions: {
          vehicleTypes: vehicleTypes.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          conditions: conditionStats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          ageGroups: ageStats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          fuelTypes: fuelTypeStats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {})
        },
        costs: maintenanceCosts[0] || {
          totalMaintenanceCost: 0,
          totalFuelCost: 0,
          avgMaintenanceCost: 0
        },
        upcomingExpirations
      }
    });
  } catch (error) {
    console.error('Get fleet stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching fleet statistics'
    });
  }
});

// @desc    Get vehicles requiring service (overdue, urgent, or scheduled)
// @route   GET /api/fleet/meta/service-due  
// @access  Private
router.get('/meta/service-due', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
], async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const vehicles = await Fleet.find({
      ...req.tenantFilter,
      status: 'active',
      $or: [
        // Service due by date
        { 'nextServiceDue.date': { $lte: futureDate } },
        // Service overdue by date
        { 'nextServiceDue.date': { $lt: today } }
      ]
    })
      .populate('assignedDriver', 'name email')
      .select('vehicleNumber make model year currentOdometer nextServiceDue lastServiceDate')
      .lean();

    const serviceDueVehicles = vehicles.map(vehicle => {
      const dueDate = vehicle.nextServiceDue?.date;
      const dueOdometer = vehicle.nextServiceDue?.odometer;
      const currentOdometer = vehicle.currentOdometer || 0;
      
      let status = 'upcoming';
      let priority = 'low';
      let reason = '';
      
      if (dueDate) {
        const daysUntilService = Math.ceil((new Date(dueDate) - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntilService < 0) {
          status = 'overdue';
          priority = 'critical';
          reason = `Service overdue by ${Math.abs(daysUntilService)} days`;
        } else if (daysUntilService <= 7) {
          status = 'urgent';
          priority = 'high';
          reason = `Service due in ${daysUntilService} days`;
        } else {
          reason = `Service due in ${daysUntilService} days`;
        }
      }
      
      if (dueOdometer && currentOdometer >= dueOdometer) {
        status = 'overdue';
        priority = 'critical';
        reason = `Service overdue by ${currentOdometer - dueOdometer} km`;
      } else if (dueOdometer && (dueOdometer - currentOdometer) <= 1000) {
        status = 'urgent';
        priority = 'high';
        reason = `Service due in ${dueOdometer - currentOdometer} km`;
      }
      
      return {
        vehicle: {
          _id: vehicle._id,
          vehicleNumber: vehicle.vehicleNumber,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          currentOdometer: vehicle.currentOdometer,
          assignedDriver: vehicle.assignedDriver
        },
        nextServiceDue: vehicle.nextServiceDue,
        lastServiceDate: vehicle.lastServiceDate,
        status,
        priority,
        reason,
        daysUntilService: dueDate ? Math.ceil((new Date(dueDate) - today) / (1000 * 60 * 60 * 24)) : null,
        kmUntilService: dueOdometer ? Math.max(0, dueOdometer - currentOdometer) : null
      };
    });

    // Sort by priority (critical first, then by days until service)
    serviceDueVehicles.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return (a.daysUntilService || 0) - (b.daysUntilService || 0);
    });

    res.json({
      success: true,
      data: {
        vehicles: serviceDueVehicles,
        summary: {
          total: serviceDueVehicles.length,
          overdue: serviceDueVehicles.filter(v => v.status === 'overdue').length,
          urgent: serviceDueVehicles.filter(v => v.status === 'urgent').length,
          upcoming: serviceDueVehicles.filter(v => v.status === 'upcoming').length,
          daysAhead: days
        }
      }
    });
  } catch (error) {
    console.error('Get service due vehicles error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching service due vehicles'
    });
  }
});

// @desc    Get vehicles with expiring documents
// @route   GET /api/fleet/meta/expiring-documents
// @access  Private
router.get('/meta/expiring-documents', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
], async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const vehicles = await Fleet.find(req.tenantFilter)
      .select('vehicleNumber make model insurance pollution fitness permit')
      .lean();

    const expiringVehicles = [];

    vehicles.forEach(vehicle => {
      const documents = [
        { name: 'Insurance', expiryDate: vehicle.insurance?.expiryDate },
        { name: 'Pollution Certificate', expiryDate: vehicle.pollution?.expiryDate },
        { name: 'Fitness Certificate', expiryDate: vehicle.fitness?.expiryDate },
        { name: 'Permit', expiryDate: vehicle.permit?.expiryDate }
      ];

      const expiring = documents.filter(doc => 
        doc.expiryDate && new Date(doc.expiryDate) <= futureDate
      );

      if (expiring.length > 0) {
        expiringVehicles.push({
          vehicle: {
            _id: vehicle._id,
            vehicleNumber: vehicle.vehicleNumber,
            make: vehicle.make,
            model: vehicle.model
          },
          expiringDocuments: expiring.map(doc => ({
            document: doc.name,
            expiryDate: doc.expiryDate,
            daysRemaining: Math.ceil((new Date(doc.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
          }))
        });
      }
    });

    // Sort by most urgent first
    expiringVehicles.sort((a, b) => {
      const minDaysA = Math.min(...a.expiringDocuments.map(d => d.daysRemaining));
      const minDaysB = Math.min(...b.expiringDocuments.map(d => d.daysRemaining));
      return minDaysA - minDaysB;
    });

    res.json({
      success: true,
      data: {
        vehicles: expiringVehicles,
        total: expiringVehicles.length,
        daysAhead: days
      }
    });
  } catch (error) {
    console.error('Get expiring documents error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching expiring documents'
    });
  }
});

module.exports = router;