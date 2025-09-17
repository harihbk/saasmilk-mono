const express = require('express');
const mongoose = require('mongoose');
const { body, param, query } = require('express-validator');
const FleetMaintenance = require('../models/FleetMaintenance');
const Fleet = require('../models/Fleet');
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
  uploadMaintenanceReceipts, 
  uploadMaintenancePhotos,
  uploadSingleReceipt,
  handleUploadError,
  processUploadedFiles,
  deleteFile 
} = require('../middleware/upload');

const router = express.Router();

// @desc    Get all fleet maintenance records
// @route   GET /api/fleet-maintenance
// @access  Private
router.get('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validatePagination,
  validateSort([
    'scheduledDate', 'completionDate', 'status', 'priority', 'maintenanceType',
    'totalCost', 'createdAt'
  ]),
  validateSearch(['title', 'description', 'serviceProvider.name']),
  validateDateRange
], async (req, res) => {
  try {
    const { page, limit, skip, sort } = req.query;
    const { status, priority, maintenanceType, vehicle, serviceProvider } = req.query;

    // Build query with tenant isolation
    let query = { ...req.tenantFilter };

    // Add search query if exists
    if (req.searchQuery) {
      query = { ...query, ...req.searchQuery };
    }

    // Add date range filter
    if (req.dateQuery) {
      query.scheduledDate = req.dateQuery;
    }

    // Add filters
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (maintenanceType) query.maintenanceType = maintenanceType;
    if (vehicle) query.vehicle = vehicle;
    if (serviceProvider) {
      query['serviceProvider.name'] = new RegExp(serviceProvider, 'i');
    }

    // Execute query with pagination
    const maintenanceRecords = await FleetMaintenance.find(query)
      .populate('vehicle', 'vehicleNumber make model vehicleType')
      .populate('createdBy', 'name email')
      .populate('completedBy', 'name email')
      .sort(sort || { createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get total count for pagination
    const total = await FleetMaintenance.countDocuments(query);

    // Add virtual fields and transform backend fields to match frontend expectations
    const recordsWithVirtuals = maintenanceRecords.map(record => {
      const recordData = {
        ...record.toJSON(),
        duration: record.duration,
        isOverdue: record.isOverdue,
        totalReceiptAmount: record.totalReceiptAmount
      };

      // Transform nextService to nextServiceDate for frontend compatibility
      if (recordData.nextService?.recommendedDate) {
        recordData.nextServiceDate = recordData.nextService.recommendedDate;
        recordData.nextServiceOdometer = recordData.nextService.recommendedOdometer;
      }

      // Map backend phone field to frontend contact field
      if (recordData.serviceProvider?.phone) {
        recordData.serviceProvider.contact = recordData.serviceProvider.phone;
      }

      return recordData;
    });

    res.json({
      success: true,
      data: {
        maintenanceRecords: recordsWithVirtuals,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get maintenance records error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching maintenance records'
    });
  }
});

// @desc    Get single maintenance record
// @route   GET /api/fleet-maintenance/:id
// @access  Private
router.get('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid maintenance record ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const maintenanceRecord = await FleetMaintenance.findOne({ 
      _id: req.params.id, 
      ...req.tenantFilter 
    })
      .populate('vehicle', 'vehicleNumber make model year vehicleType currentOdometer')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('completedBy', 'name email')
      .populate('receipts.uploadedBy', 'name email');

    if (!maintenanceRecord) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance record not found'
      });
    }

    // Add virtual fields and transform backend fields to match frontend expectations
    const recordData = {
      ...maintenanceRecord.toJSON(),
      duration: maintenanceRecord.duration,
      isOverdue: maintenanceRecord.isOverdue,
      totalReceiptAmount: maintenanceRecord.totalReceiptAmount
    };

    // Transform nextService to nextServiceDate for frontend compatibility
    if (recordData.nextService?.recommendedDate) {
      recordData.nextServiceDate = recordData.nextService.recommendedDate;
      recordData.nextServiceOdometer = recordData.nextService.recommendedOdometer;
    }
    
    // Map backend phone field to frontend contact field
    if (recordData.serviceProvider?.phone) {
      recordData.serviceProvider.contact = recordData.serviceProvider.phone;
    }

    res.json({
      success: true,
      data: { maintenanceRecord: recordData }
    });
  } catch (error) {
    console.error('Get maintenance record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching maintenance record'
    });
  }
});

// @desc    Create new maintenance record
// @route   POST /api/fleet-maintenance
// @access  Private
router.post('/', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  uploadMaintenancePhotos,
  handleUploadError,
  sanitizeInput,
  body('vehicle')
    .isMongoId()
    .withMessage('Valid vehicle ID is required'),
  body('maintenanceType')
    .isIn([
      'routine_service', 'oil_change', 'tire_change', 'brake_service', 'engine_repair',
      'transmission_repair', 'electrical_repair', 'body_repair', 'painting',
      'ac_service', 'battery_replacement', 'filter_change', 'coolant_service',
      'alignment', 'balancing', 'suspension_repair', 'clutch_repair',
      'fuel_system', 'exhaust_repair', 'inspection', 'emergency_repair', 'other'
    ])
    .withMessage('Invalid maintenance type'),
  body('serviceCategory')
    .isIn(['preventive', 'corrective', 'predictive', 'emergency'])
    .withMessage('Invalid service category'),
  body('title')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Title is required and must be less than 200 characters'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Description is required and must be less than 1000 characters'),
  body('scheduledDate')
    .isISO8601()
    .withMessage('Valid scheduled date is required'),
  body('serviceProvider.name')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Service provider name is required'),
  body('serviceProvider.type')
    .isIn(['authorized_dealer', 'local_garage', 'company_workshop', 'roadside_assistance'])
    .withMessage('Invalid service provider type'),
  body('preServiceCondition.odometer')
    .isFloat({ min: 0 })
    .withMessage('Valid pre-service odometer reading is required'),
  body('totalCost')
    .isFloat({ min: 0 })
    .withMessage('Valid total cost is required'),
  body('paymentDetails.method')
    .isIn(['cash', 'card', 'upi', 'bank_transfer', 'cheque', 'credit'])
    .withMessage('Invalid payment method'),
  handleValidationErrors
], async (req, res) => {
  try {
    // Verify vehicle exists and belongs to tenant
    const vehicle = await Fleet.findOne({ 
      _id: req.body.vehicle, 
      ...req.tenantFilter 
    });
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    // Process uploaded photos
    const uploadedFiles = processUploadedFiles(req, req.files);
    const photos = {
      preServicePhotos: [],
      postServicePhotos: []
    };
    
    uploadedFiles.forEach(file => {
      file.uploadedBy = req.user.id;
      if (file.fieldName === 'preServicePhotos') {
        photos.preServicePhotos.push(file);
      } else if (file.fieldName === 'postServicePhotos') {
        photos.postServicePhotos.push(file);
      }
    });

    // Create maintenance record data
    const maintenanceData = {
      ...req.body,
      ...req.tenantFilter,
      createdBy: req.user.id
    };

    // Map frontend contact field to backend phone field if provided
    if (maintenanceData.serviceProvider?.contact) {
      maintenanceData.serviceProvider.phone = maintenanceData.serviceProvider.contact;
      delete maintenanceData.serviceProvider.contact;
    }

    // Transform frontend field names to match backend model
    if (maintenanceData.nextServiceDate) {
      maintenanceData.nextService = {
        ...maintenanceData.nextService,
        recommendedDate: maintenanceData.nextServiceDate,
        recommendedOdometer: maintenanceData.nextServiceOdometer || null
      };
      delete maintenanceData.nextServiceDate;
      delete maintenanceData.nextServiceOdometer;
    }

    // Add photos to pre-service condition
    if (photos.preServicePhotos.length > 0) {
      maintenanceData.preServiceCondition = {
        ...maintenanceData.preServiceCondition,
        photos: photos.preServicePhotos
      };
    }

    // Add photos to post-service condition if provided
    if (photos.postServicePhotos.length > 0) {
      maintenanceData.postServiceCondition = {
        ...maintenanceData.postServiceCondition,
        photos: photos.postServicePhotos
      };
    }

    const maintenanceRecord = await FleetMaintenance.create(maintenanceData);

    // Populate the created record
    await maintenanceRecord.populate('vehicle', 'vehicleNumber make model');
    await maintenanceRecord.populate('createdBy', 'name email');

    // Transform backend fields to match frontend expectations
    const recordData = maintenanceRecord.toObject();
    if (recordData.nextService?.recommendedDate) {
      recordData.nextServiceDate = recordData.nextService.recommendedDate;
      recordData.nextServiceOdometer = recordData.nextService.recommendedOdometer;
    }
    
    // Map backend phone field to frontend contact field
    if (recordData.serviceProvider?.phone) {
      recordData.serviceProvider.contact = recordData.serviceProvider.phone;
    }

    res.status(201).json({
      success: true,
      message: 'Maintenance record created successfully',
      data: { maintenanceRecord: recordData }
    });
  } catch (error) {
    console.error('Create maintenance record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating maintenance record'
    });
  }
});

// @desc    Update maintenance record
// @route   PUT /api/fleet-maintenance/:id
// @access  Private
router.put('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid maintenance record ID'),
  uploadMaintenancePhotos,
  handleUploadError,
  sanitizeInput,
  body('status')
    .optional()
    .isIn(['scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'])
    .withMessage('Invalid status'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid priority'),
  body('totalCost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Valid total cost is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const maintenanceRecord = await FleetMaintenance.findOne({ 
      _id: req.params.id, 
      ...req.tenantFilter 
    });

    if (!maintenanceRecord) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance record not found'
      });
    }

    // Process uploaded photos
    const uploadedFiles = processUploadedFiles(req, req.files);
    const photos = {
      preServicePhotos: [],
      postServicePhotos: []
    };
    
    uploadedFiles.forEach(file => {
      file.uploadedBy = req.user.id;
      if (file.fieldName === 'preServicePhotos') {
        photos.preServicePhotos.push(file);
      } else if (file.fieldName === 'postServicePhotos') {
        photos.postServicePhotos.push(file);
      }
    });

    // Update maintenance record data
    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };

    // Map frontend contact field to backend phone field if provided
    if (updateData.serviceProvider?.contact) {
      updateData.serviceProvider.phone = updateData.serviceProvider.contact;
      delete updateData.serviceProvider.contact;
    }

    // Transform frontend field names to match backend model
    if (updateData.nextServiceDate) {
      updateData.nextService = {
        ...maintenanceRecord.nextService,
        ...updateData.nextService,
        recommendedDate: updateData.nextServiceDate,
        recommendedOdometer: updateData.nextServiceOdometer || maintenanceRecord.nextService?.recommendedOdometer || null
      };
      delete updateData.nextServiceDate;
      delete updateData.nextServiceOdometer;
    }

    // Add new photos to existing ones
    if (photos.preServicePhotos.length > 0) {
      updateData['preServiceCondition.photos'] = [
        ...(maintenanceRecord.preServiceCondition?.photos || []),
        ...photos.preServicePhotos
      ];
    }

    if (photos.postServicePhotos.length > 0) {
      updateData['postServiceCondition.photos'] = [
        ...(maintenanceRecord.postServiceCondition?.photos || []),
        ...photos.postServicePhotos
      ];
    }

    // If status is being changed to completed, set completion date
    if (req.body.status === 'completed' && maintenanceRecord.status !== 'completed') {
      updateData.completionDate = new Date();
      updateData.completedBy = req.user.id;
    }

    const updatedRecord = await FleetMaintenance.findOneAndUpdate(
      { _id: req.params.id, ...req.tenantFilter },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('vehicle', 'vehicleNumber make model')
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('completedBy', 'name email');

    // Transform backend fields to match frontend expectations
    const recordData = updatedRecord.toObject();
    if (recordData.nextService?.recommendedDate) {
      recordData.nextServiceDate = recordData.nextService.recommendedDate;
      recordData.nextServiceOdometer = recordData.nextService.recommendedOdometer;
    }
    
    // Map backend phone field to frontend contact field
    if (recordData.serviceProvider?.phone) {
      recordData.serviceProvider.contact = recordData.serviceProvider.phone;
    }

    res.json({
      success: true,
      message: 'Maintenance record updated successfully',
      data: { maintenanceRecord: recordData }
    });
  } catch (error) {
    console.error('Update maintenance record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating maintenance record'
    });
  }
});

// @desc    Delete maintenance record
// @route   DELETE /api/fleet-maintenance/:id
// @access  Private
router.delete('/:id', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid maintenance record ID'),
  handleValidationErrors
], async (req, res) => {
  try {
    const maintenanceRecord = await FleetMaintenance.findOne({ 
      _id: req.params.id, 
      ...req.tenantFilter 
    });

    if (!maintenanceRecord) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance record not found'
      });
    }

    // Delete associated files
    const filesToDelete = [];
    
    // Add receipt files
    maintenanceRecord.receipts?.forEach(receipt => {
      filesToDelete.push(receipt.fileUrl);
    });

    // Add photo files
    maintenanceRecord.preServiceCondition?.photos?.forEach(photo => {
      filesToDelete.push(photo.url);
    });
    
    maintenanceRecord.postServiceCondition?.photos?.forEach(photo => {
      filesToDelete.push(photo.url);
    });

    // Delete files
    filesToDelete.forEach(url => {
      if (url) {
        const filePath = url.replace(`${req.protocol}://${req.get('host')}/`, '');
        deleteFile(filePath);
      }
    });

    await FleetMaintenance.findOneAndDelete({ _id: req.params.id, ...req.tenantFilter });

    res.json({
      success: true,
      message: 'Maintenance record deleted successfully'
    });
  } catch (error) {
    console.error('Delete maintenance record error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting maintenance record'
    });
  }
});

// @desc    Upload maintenance receipts
// @route   POST /api/fleet-maintenance/:id/receipts
// @access  Private
router.post('/:id/receipts', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid maintenance record ID'),
  uploadMaintenanceReceipts,
  handleUploadError,
  handleValidationErrors
], async (req, res) => {
  try {
    const maintenanceRecord = await FleetMaintenance.findOne({ 
      _id: req.params.id, 
      ...req.tenantFilter 
    });

    if (!maintenanceRecord) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance record not found'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No receipts uploaded'
      });
    }

    // Process uploaded receipts
    const uploadedReceipts = processUploadedFiles(req, req.files);
    
    // Parse additional receipt data from request body
    const receiptData = req.body.receiptData ? JSON.parse(req.body.receiptData) : [];
    
    // Combine file data with additional receipt information
    const receipts = uploadedReceipts.map((file, index) => {
      const data = receiptData[index] || {};
      return {
        type: data.type || 'receipt',
        fileName: file.fileName,
        originalName: file.originalName,
        fileUrl: file.fileUrl,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        uploadedAt: file.uploadedAt,
        uploadedBy: req.user.id,
        amount: data.amount ? parseFloat(data.amount) : undefined,
        receiptNumber: data.receiptNumber,
        receiptDate: data.receiptDate,
        vendor: data.vendor,
        description: data.description,
        tags: data.tags || []
      };
    });

    // Add receipts to maintenance record
    maintenanceRecord.receipts = maintenanceRecord.receipts || [];
    maintenanceRecord.receipts.push(...receipts);
    maintenanceRecord.updatedBy = req.user.id;

    await maintenanceRecord.save();

    res.json({
      success: true,
      message: `${receipts.length} receipt(s) uploaded successfully`,
      data: { 
        receipts,
        totalReceipts: maintenanceRecord.receipts.length,
        totalReceiptAmount: maintenanceRecord.totalReceiptAmount
      }
    });
  } catch (error) {
    console.error('Upload receipts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading receipts'
    });
  }
});

// @desc    Upload single receipt
// @route   POST /api/fleet-maintenance/:id/receipt
// @access  Private
router.post('/:id/receipt', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid maintenance record ID'),
  uploadSingleReceipt,
  handleUploadError,
  body('type')
    .isIn(['invoice', 'receipt', 'estimate', 'warranty_card', 'inspection_report'])
    .withMessage('Invalid receipt type'),
  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  handleValidationErrors
], async (req, res) => {
  try {
    const maintenanceRecord = await FleetMaintenance.findOne({ 
      _id: req.params.id, 
      ...req.tenantFilter 
    });

    if (!maintenanceRecord) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance record not found'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No receipt file uploaded'
      });
    }

    // Create receipt object
    const receipt = {
      type: req.body.type,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileUrl: `${req.protocol}://${req.get('host')}/uploads/receipts/${req.tenant.id}/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedAt: new Date(),
      uploadedBy: req.user.id,
      amount: req.body.amount ? parseFloat(req.body.amount) : undefined,
      receiptNumber: req.body.receiptNumber,
      receiptDate: req.body.receiptDate,
      vendor: req.body.vendor,
      description: req.body.description,
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : []
    };

    // Add receipt using the model method
    await maintenanceRecord.addReceipt(receipt);

    res.json({
      success: true,
      message: 'Receipt uploaded successfully',
      data: { 
        receipt,
        totalReceipts: maintenanceRecord.receipts.length,
        totalReceiptAmount: maintenanceRecord.totalReceiptAmount
      }
    });
  } catch (error) {
    console.error('Upload receipt error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading receipt'
    });
  }
});

// @desc    Complete maintenance
// @route   PUT /api/fleet-maintenance/:id/complete
// @access  Private
router.put('/:id/complete', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  param('id').isMongoId().withMessage('Invalid maintenance record ID'),
  body('postServiceCondition.odometer')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Valid post-service odometer reading is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const maintenanceRecord = await FleetMaintenance.findOne({ 
      _id: req.params.id, 
      ...req.tenantFilter 
    });

    if (!maintenanceRecord) {
      return res.status(404).json({
        success: false,
        message: 'Maintenance record not found'
      });
    }

    if (maintenanceRecord.status === 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Maintenance is already completed'
      });
    }

    // Complete maintenance using the model method
    const completionData = {
      completionDate: new Date(),
      completedBy: req.user.id,
      postServiceCondition: req.body.postServiceCondition
    };

    await maintenanceRecord.completeMaintenance(completionData);

    // Populate the updated record
    await maintenanceRecord.populate('vehicle', 'vehicleNumber make model');
    await maintenanceRecord.populate('completedBy', 'name email');

    // Transform backend fields to match frontend expectations
    const recordData = maintenanceRecord.toObject();
    if (recordData.nextService?.recommendedDate) {
      recordData.nextServiceDate = recordData.nextService.recommendedDate;
      recordData.nextServiceOdometer = recordData.nextService.recommendedOdometer;
    }
    
    // Map backend phone field to frontend contact field
    if (recordData.serviceProvider?.phone) {
      recordData.serviceProvider.contact = recordData.serviceProvider.phone;
    }

    res.json({
      success: true,
      message: 'Maintenance completed successfully',
      data: { maintenanceRecord: recordData }
    });
  } catch (error) {
    console.error('Complete maintenance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while completing maintenance'
    });
  }
});

// @desc    Get maintenance statistics
// @route   GET /api/fleet-maintenance/meta/stats
// @access  Private
router.get('/meta/stats', [
  protect,
  extractTenant,
  validateTenantAccess,
  autoTenantFilter,
  validateDateRange
], async (req, res) => {
  try {
    let matchQuery = { ...req.tenantFilter };
    
    // Add date filter if provided
    if (req.dateQuery) {
      matchQuery.scheduledDate = req.dateQuery;
    }

    // Basic maintenance statistics
    const totalRecords = await FleetMaintenance.countDocuments(matchQuery);
    const completedRecords = await FleetMaintenance.countDocuments({ 
      ...matchQuery, 
      status: 'completed' 
    });
    const pendingRecords = await FleetMaintenance.countDocuments({ 
      ...matchQuery, 
      status: { $in: ['scheduled', 'in_progress'] } 
    });
    const overdueRecords = await FleetMaintenance.countDocuments({
      ...matchQuery,
      status: { $nin: ['completed', 'cancelled'] },
      scheduledDate: { $lt: new Date() }
    });

    // Status distribution
    const statusStats = await FleetMaintenance.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Maintenance type distribution
    const typeStats = await FleetMaintenance.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$maintenanceType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Priority distribution
    const priorityStats = await FleetMaintenance.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    // Cost statistics
    const costStats = await FleetMaintenance.aggregate([
      { $match: { ...matchQuery, status: 'completed' } },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$totalCost' },
          avgCost: { $avg: '$totalCost' },
          minCost: { $min: '$totalCost' },
          maxCost: { $max: '$totalCost' }
        }
      }
    ]);

    // Monthly cost trend (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyCosts = await FleetMaintenance.aggregate([
      {
        $match: {
          ...req.tenantFilter,
          status: 'completed',
          completionDate: { $gte: twelveMonthsAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$completionDate' },
            month: { $month: '$completionDate' }
          },
          totalCost: { $sum: '$totalCost' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Top service providers
    const topProviders = await FleetMaintenance.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$serviceProvider.name',
          count: { $sum: 1 },
          totalCost: { $sum: '$totalCost' },
          avgRating: { $avg: '$serviceProvider.rating' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Vehicle maintenance frequency
    const vehicleStats = await FleetMaintenance.aggregate([
      { $match: matchQuery },
      {
        $lookup: {
          from: 'fleets',
          localField: 'vehicle',
          foreignField: '_id',
          as: 'vehicleInfo'
        }
      },
      { $unwind: '$vehicleInfo' },
      {
        $group: {
          _id: '$vehicle',
          vehicleNumber: { $first: '$vehicleInfo.vehicleNumber' },
          count: { $sum: 1 },
          totalCost: { $sum: '$totalCost' },
          lastMaintenance: { $max: '$completionDate' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalRecords,
          completedRecords,
          pendingRecords,
          overdueRecords,
          completionRate: totalRecords > 0 ? (completedRecords / totalRecords * 100).toFixed(2) : 0
        },
        distributions: {
          status: statusStats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          types: typeStats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {}),
          priorities: priorityStats.reduce((acc, item) => {
            acc[item._id] = item.count;
            return acc;
          }, {})
        },
        costs: costStats[0] || {
          totalCost: 0,
          avgCost: 0,
          minCost: 0,
          maxCost: 0
        },
        trends: {
          monthlyCosts: monthlyCosts.map(item => ({
            month: `${item._id.year}-${String(item._id.month).padStart(2, '0')}`,
            totalCost: item.totalCost,
            count: item.count
          }))
        },
        topProviders,
        vehicleStats
      }
    });
  } catch (error) {
    console.error('Get maintenance stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching maintenance statistics'
    });
  }
});

// @desc    Get upcoming maintenance
// @route   GET /api/fleet-maintenance/meta/upcoming
// @access  Private
router.get('/meta/upcoming', [
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
    const days = parseInt(req.query.days) || 7;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const upcomingMaintenance = await FleetMaintenance.find({
      ...req.tenantFilter,
      status: { $in: ['scheduled', 'in_progress'] },
      scheduledDate: { $lte: futureDate }
    })
      .populate('vehicle', 'vehicleNumber make model vehicleType')
      .populate('createdBy', 'name email')
      .sort({ scheduledDate: 1 });

    // Separate overdue and upcoming
    const now = new Date();
    const overdue = upcomingMaintenance.filter(record => 
      new Date(record.scheduledDate) < now
    );
    const upcoming = upcomingMaintenance.filter(record => 
      new Date(record.scheduledDate) >= now
    );

    res.json({
      success: true,
      data: {
        overdue: overdue.map(record => ({
          ...record.toJSON(),
          daysOverdue: Math.ceil((now - new Date(record.scheduledDate)) / (1000 * 60 * 60 * 24))
        })),
        upcoming: upcoming.map(record => ({
          ...record.toJSON(),
          daysUntil: Math.ceil((new Date(record.scheduledDate) - now) / (1000 * 60 * 60 * 24))
        })),
        summary: {
          overdueCount: overdue.length,
          upcomingCount: upcoming.length,
          daysAhead: days
        }
      }
    });
  } catch (error) {
    console.error('Get upcoming maintenance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching upcoming maintenance'
    });
  }
});

module.exports = router;