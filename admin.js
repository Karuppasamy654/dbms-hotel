const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const Hotel = require('../models/Hotel');
const Booking = require('../models/Booking');
const FoodItem = require('../models/FoodItem');
const Staff = require('../models/Staff');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

const router = express.Router();

// @desc    Get dashboard statistics
// @route   GET /api/v1/admin/dashboard
// @access  Private (Admin only)
router.get('/dashboard',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    // Get total counts
    const totalUsers = await User.countDocuments();
    const totalHotels = await Hotel.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const totalFoodItems = await FoodItem.countDocuments();
    const totalStaff = await Staff.countDocuments();

    // Get active counts
    const activeUsers = await User.countDocuments({ isActive: true });
    const activeHotels = await Hotel.countDocuments({ status: 'active' });
    const confirmedBookings = await Booking.countDocuments({ status: 'confirmed' });
    const availableFoodItems = await FoodItem.countDocuments({ isAvailable: true });
    const activeStaff = await Staff.countDocuments({ isActive: true });

    // Get revenue statistics
    const revenueData = await Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'checked_in', 'checked_out'] } } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$pricing.totalAmount' },
          averageBookingValue: { $avg: '$pricing.totalAmount' },
          totalTaxes: { $sum: '$pricing.taxes' }
        }
      }
    ]);

    // Get monthly revenue trends
    const monthlyRevenue = await Booking.aggregate([
      { $match: { status: { $in: ['confirmed', 'checked_in', 'checked_out'] } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$pricing.totalAmount' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    // Get top hotels by bookings
    const topHotels = await Booking.aggregate([
      {
        $group: {
          _id: '$hotel',
          bookingCount: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' }
        }
      },
      { $sort: { bookingCount: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'hotels',
          localField: '_id',
          foreignField: '_id',
          as: 'hotel'
        }
      },
      { $unwind: '$hotel' },
      {
        $project: {
          hotelName: '$hotel.name',
          bookingCount: 1,
          totalRevenue: 1
        }
      }
    ]);

    // Get recent bookings
    const recentBookings = await Booking.find()
      .populate('hotel', 'name location')
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get user registration trends
    const userTrends = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalHotels,
          totalBookings,
          totalFoodItems,
          totalStaff
        },
        active: {
          activeUsers,
          activeHotels,
          confirmedBookings,
          availableFoodItems,
          activeStaff
        },
        revenue: revenueData[0] || { totalRevenue: 0, averageBookingValue: 0, totalTaxes: 0 },
        trends: {
          monthlyRevenue,
          userTrends
        },
        topHotels,
        recentBookings
      }
    });
  })
);

// @desc    Get system analytics
// @route   GET /api/v1/admin/analytics
// @access  Private (Admin only)
router.get('/analytics',
  protect,
  authorize('admin'),
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be valid'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid'),
    query('hotel').optional().isMongoId().withMessage('Hotel ID must be valid')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { startDate, endDate, hotel } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    // Build booking filter
    const bookingFilter = {};
    if (Object.keys(dateFilter).length > 0) {
      bookingFilter.createdAt = dateFilter;
    }
    if (hotel) {
      bookingFilter.hotel = hotel;
    }

    // Get booking analytics
    const bookingAnalytics = await Booking.aggregate([
      { $match: bookingFilter },
      {
        $group: {
          _id: null,
          totalBookings: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          averageBookingValue: { $avg: '$pricing.totalAmount' },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get booking status distribution
    const statusDistribution = await Booking.aggregate([
      { $match: bookingFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get payment method distribution
    const paymentDistribution = await Booking.aggregate([
      { $match: bookingFilter },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$pricing.totalAmount' }
        }
      }
    ]);

    // Get hotel performance
    const hotelPerformance = await Booking.aggregate([
      { $match: bookingFilter },
      {
        $group: {
          _id: '$hotel',
          bookingCount: { $sum: 1 },
          totalRevenue: { $sum: '$pricing.totalAmount' },
          averageRating: { $avg: '$hotel.rating' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'hotels',
          localField: '_id',
          foreignField: '_id',
          as: 'hotel'
        }
      },
      { $unwind: '$hotel' },
      {
        $project: {
          hotelName: '$hotel.name',
          location: '$hotel.location',
          bookingCount: 1,
          totalRevenue: 1,
          averageRating: 1
        }
      }
    ]);

    // Get user analytics
    const userAnalytics = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          }
        }
      }
    ]);

    // Get food item analytics
    const foodAnalytics = await FoodItem.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          availableCount: {
            $sum: { $cond: [{ $eq: ['$isAvailable', true] }, 1, 0] }
          },
          averagePrice: { $avg: '$price' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        bookings: bookingAnalytics[0] || {
          totalBookings: 0,
          totalRevenue: 0,
          averageBookingValue: 0,
          confirmedBookings: 0,
          cancelledBookings: 0
        },
        statusDistribution,
        paymentDistribution,
        hotelPerformance,
        users: userAnalytics,
        food: foodAnalytics
      }
    });
  })
);

// @desc    Get system health
// @route   GET /api/v1/admin/health
// @access  Private (Admin only)
router.get('/health',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || '1.0.0'
    };

    // Check database connections
    try {
      const mongoose = require('mongoose');
      const dbState = mongoose.connection.readyState;
      health.database = {
        status: dbState === 1 ? 'connected' : 'disconnected',
        state: dbState
      };
    } catch (error) {
      health.database = {
        status: 'error',
        error: error.message
      };
    }

    // Check external services
    health.services = {
      email: !!process.env.EMAIL_HOST,
      payment: {
        razorpay: !!process.env.RAZORPAY_KEY_ID,
        stripe: !!process.env.STRIPE_SECRET_KEY
      },
      storage: {
        cloudinary: !!process.env.CLOUDINARY_CLOUD_NAME
      }
    };

    res.json({
      success: true,
      data: health
    });
  })
);

// @desc    Get system logs
// @route   GET /api/v1/admin/logs
// @access  Private (Admin only)
router.get('/logs',
  protect,
  authorize('admin'),
  [
    query('level').optional().isIn(['error', 'warn', 'info', 'debug']),
    query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limit must be between 1 and 1000')
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // This is a placeholder for log retrieval
    // In a real application, you would integrate with a logging service
    const logs = [
      {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'System started successfully',
        service: 'api'
      },
      {
        timestamp: new Date(Date.now() - 60000).toISOString(),
        level: 'info',
        message: 'Database connection established',
        service: 'database'
      }
    ];

    res.json({
      success: true,
      data: logs
    });
  })
);

// @desc    Update system settings
// @route   PUT /api/v1/admin/settings
// @access  Private (Admin only)
router.put('/settings',
  protect,
  authorize('admin'),
  [
    body('maintenanceMode').optional().isBoolean(),
    body('registrationEnabled').optional().isBoolean(),
    body('emailNotifications').optional().isBoolean(),
    body('maxFileSize').optional().isInt({ min: 1024, max: 10485760 }),
    body('sessionTimeout').optional().isInt({ min: 300, max: 86400 })
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // This is a placeholder for settings update
    // In a real application, you would store settings in a database
    const settings = {
      maintenanceMode: req.body.maintenanceMode || false,
      registrationEnabled: req.body.registrationEnabled !== false,
      emailNotifications: req.body.emailNotifications !== false,
      maxFileSize: req.body.maxFileSize || 5242880,
      sessionTimeout: req.body.sessionTimeout || 3600,
      updatedAt: new Date(),
      updatedBy: req.user._id
    };

    res.json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  })
);

// @desc    Get system settings
// @route   GET /api/v1/admin/settings
// @access  Private (Admin only)
router.get('/settings',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    // This is a placeholder for settings retrieval
    // In a real application, you would retrieve settings from a database
    const settings = {
      maintenanceMode: false,
      registrationEnabled: true,
      emailNotifications: true,
      maxFileSize: 5242880,
      sessionTimeout: 3600,
      version: '1.0.0',
      lastUpdated: new Date()
    };

    res.json({
      success: true,
      data: settings
    });
  })
);

module.exports = router;
