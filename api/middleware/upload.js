const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const fleetDir = path.join(uploadsDir, 'fleet');
const receiptsDir = path.join(uploadsDir, 'receipts');
const documentsDir = path.join(uploadsDir, 'documents');
const logosDir = path.join(uploadsDir, 'logos');

// Create directories if they don't exist
[uploadsDir, fleetDir, receiptsDir, documentsDir, logosDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration for fleet images
const fleetStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tenantDir = path.join(fleetDir, req.tenant?.id || 'default');
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
    cb(null, tenantDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const extension = path.extname(file.originalname);
    const filename = `fleet-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// Storage configuration for maintenance receipts
const receiptStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tenantDir = path.join(receiptsDir, req.tenant?.id || 'default');
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
    cb(null, tenantDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const extension = path.extname(file.originalname);
    const filename = `receipt-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// Storage configuration for documents (insurance, permits, etc.)
const documentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tenantDir = path.join(documentsDir, req.tenant?.id || 'default');
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
    cb(null, tenantDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const extension = path.extname(file.originalname);
    const filename = `doc-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// Storage configuration for company logos
const logoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const tenantDir = path.join(logosDir, req.tenant?.id || 'default');
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
    cb(null, tenantDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const extension = path.extname(file.originalname);
    const filename = `logo-${uniqueSuffix}${extension}`;
    cb(null, filename);
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'), false);
  }
};

// File filter for documents (receipts, PDFs, etc.)
const documentFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, PDFs, and office documents are allowed.'), false);
  }
};

// File filter for receipts (more lenient)
const receiptFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and PDFs are allowed for receipts.'), false);
  }
};

// File size limits (in bytes)
const fileSizeLimits = {
  image: 5 * 1024 * 1024,    // 5MB for images
  document: 10 * 1024 * 1024,  // 10MB for documents
  receipt: 5 * 1024 * 1024     // 5MB for receipts
};

// Upload configurations
const uploadFleetImages = multer({
  storage: fleetStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: fileSizeLimits.image,
    files: 10 // Maximum 10 files at once
  }
}).array('images', 10);

const uploadFleetDocuments = multer({
  storage: documentStorage,
  fileFilter: documentFilter,
  limits: {
    fileSize: fileSizeLimits.document,
    files: 5 // Maximum 5 files at once
  }
}).fields([
  { name: 'registrationCertificate', maxCount: 1 },
  { name: 'insuranceDocument', maxCount: 1 },
  { name: 'pollutionCertificate', maxCount: 1 },
  { name: 'fitnessCertificate', maxCount: 1 },
  { name: 'permitDocument', maxCount: 1 },
  { name: 'purchaseInvoice', maxCount: 1 },
  { name: 'leaseContract', maxCount: 1 }
]);

const uploadMaintenanceReceipts = multer({
  storage: receiptStorage,
  fileFilter: receiptFilter,
  limits: {
    fileSize: fileSizeLimits.receipt,
    files: 10 // Maximum 10 receipts at once
  }
}).array('receipts', 10);

const uploadMaintenancePhotos = multer({
  storage: fleetStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: fileSizeLimits.image,
    files: 20 // Maximum 20 photos (before/after)
  }
}).fields([
  { name: 'preServicePhotos', maxCount: 10 },
  { name: 'postServicePhotos', maxCount: 10 }
]);

// Single file upload for individual receipts
const uploadSingleReceipt = multer({
  storage: receiptStorage,
  fileFilter: receiptFilter,
  limits: {
    fileSize: fileSizeLimits.receipt,
    files: 1
  }
}).single('receipt');

// Company logo upload
const uploadLogo = multer({
  storage: logoStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: fileSizeLimits.image,
    files: 1
  }
}).single('logo');

// Middleware to handle upload errors
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum file size exceeded.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Maximum file count exceeded.'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected field name in file upload.'
        });
      default:
        return res.status(400).json({
          success: false,
          message: `Upload error: ${error.message}`
        });
    }
  } else if (error) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  next();
};

// Helper function to generate file URL
const generateFileUrl = (req, filePath) => {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const relativePath = filePath.replace(path.join(__dirname, '../'), '');
  return `${baseUrl}/${relativePath.replace(/\\/g, '/')}`;
};

// Helper function to delete file
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

// Helper function to process uploaded files
const processUploadedFiles = (req, files) => {
  const processedFiles = [];
  
  if (Array.isArray(files)) {
    // Single field multiple files
    files.forEach(file => {
      processedFiles.push({
        fileName: file.filename,
        originalName: file.originalname,
        fileUrl: generateFileUrl(req, file.path),
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date()
      });
    });
  } else if (typeof files === 'object') {
    // Multiple fields
    Object.keys(files).forEach(fieldName => {
      files[fieldName].forEach(file => {
        processedFiles.push({
          fieldName,
          fileName: file.filename,
          originalName: file.originalname,
          fileUrl: generateFileUrl(req, file.path),
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedAt: new Date()
        });
      });
    });
  }
  
  return processedFiles;
};

// Cleanup old files (can be called periodically)
const cleanupOldFiles = (directory, daysOld = 30) => {
  try {
    const files = fs.readdirSync(directory);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    files.forEach(file => {
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffDate) {
        deleteFile(filePath);
      }
    });
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
};

module.exports = {
  uploadFleetImages,
  uploadFleetDocuments,
  uploadMaintenanceReceipts,
  uploadMaintenancePhotos,
  uploadSingleReceipt,
  uploadLogo,
  handleUploadError,
  generateFileUrl,
  deleteFile,
  processUploadedFiles,
  cleanupOldFiles,
  fileSizeLimits
};