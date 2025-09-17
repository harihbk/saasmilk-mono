const { validationResult } = require('express-validator');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  
  next();
};

// Sanitize input data
const sanitizeInput = (req, res, next) => {
  // Remove any fields that start with $ or contain . to prevent NoSQL injection
  const sanitizeObject = (obj) => {
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        if (key.startsWith('$') || key.includes('.')) {
          delete obj[key];
        } else if (typeof obj[key] === 'object') {
          sanitizeObject(obj[key]);
        }
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};

// Validate pagination parameters
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const maxLimit = 100;

  // Ensure positive values
  req.query.page = Math.max(1, page);
  req.query.limit = Math.min(Math.max(1, limit), maxLimit);
  req.query.skip = (req.query.page - 1) * req.query.limit;

  next();
};

// Validate sort parameters
const validateSort = (allowedFields = []) => {
  return (req, res, next) => {
    if (req.query.sort) {
      const sortFields = req.query.sort.split(',');
      const validSortFields = [];

      sortFields.forEach(field => {
        const trimmedField = field.trim();
        const isDescending = trimmedField.startsWith('-');
        const fieldName = isDescending ? trimmedField.substring(1) : trimmedField;

        if (allowedFields.length === 0 || allowedFields.includes(fieldName)) {
          validSortFields.push(trimmedField);
        }
      });

      req.query.sort = validSortFields.join(',') || '-createdAt';
    } else {
      req.query.sort = '-createdAt';
    }

    next();
  };
};

// Validate search parameters
const validateSearch = (searchableFields = []) => {
  return (req, res, next) => {
    if (req.query.search && searchableFields.length > 0) {
      // Escape special regex characters
      const searchTerm = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      req.searchQuery = {
        $or: searchableFields.map(field => ({
          [field]: { $regex: searchTerm, $options: 'i' }
        }))
      };
    }

    next();
  };
};

// Validate date range parameters
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (startDate || endDate) {
    const dateQuery = {};

    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start date format'
        });
      }
      dateQuery.$gte = start;
    }

    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid end date format'
        });
      }
      // Set to end of day
      end.setHours(23, 59, 59, 999);
      dateQuery.$lte = end;
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be after end date'
      });
    }

    req.dateQuery = dateQuery;
  }

  next();
};

// Validate file upload
const validateFileUpload = (options = {}) => {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif'],
    maxSize = 5 * 1024 * 1024, // 5MB
    required = false
  } = options;

  return (req, res, next) => {
    if (!req.file && required) {
      return res.status(400).json({
        success: false,
        message: 'File is required'
      });
    }

    if (req.file) {
      // Check file type
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
        });
      }

      // Check file size
      if (req.file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
        });
      }
    }

    next();
  };
};

// Rate limiting validation
const validateRateLimit = (req, res, next) => {
  // This would typically work with express-rate-limit
  // Additional custom rate limiting logic can be added here
  next();
};

module.exports = {
  handleValidationErrors,
  sanitizeInput,
  validatePagination,
  validateSort,
  validateSearch,
  validateDateRange,
  validateFileUpload,
  validateRateLimit
};
