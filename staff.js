const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Staff = require('../models/Staff');
const User = require('../models/User');
const Hotel = require('../models/Hotel');
const { protect, authorize, checkHotelAccess } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { uploadMultiple } = require('../middleware/upload');

const router = express.Router();

// @desc    Get all staff
// @route   GET /api/v1/staff
// @access  Private (Manager/Admin)
router.get('/',
  protect,
  authorize('manager', 'admin'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('hotel').optional().isMongoId().withMessage('Hotel ID must be valid'),
    query('department').optional().isIn(['front_desk', 'housekeeping', 'food_service', 'maintenance', 'security', 'management', 'concierge']),
    query('role').optional().isIn(['staff', 'supervisor', 'manager', 'head']),
    query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
    query('sort').optional().isIn(['name', '-name', 'hireDate', '-hireDate', 'performance.rating', '-performance.rating'])
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = {};

    // Hotel filter
    if (req.query.hotel) {
      // Check hotel access for managers
      if (req.user.role === 'manager') {
        const hotel = await Hotel.findById(req.query.hotel);
        if (!hotel || hotel.manager.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You are not authorized to view staff for this hotel.'
          });
        }
      }
      filter.hotel = req.query.hotel;
    } else if (req.user.role === 'manager') {
      // For managers, only show staff from their hotels
      const userHotels = await Hotel.find({ manager: req.user._id }).select('_id');
      filter.hotel = { $in: userHotels.map(h => h._id) };
    }

    // Department filter
    if (req.query.department) {
      filter.department = req.query.department;
    }

    // Role filter
    if (req.query.role) {
      filter.role = req.query.role;
    }

    // Active status filter
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === 'true';
    }

    // Build sort object
    let sort = { createdAt: -1 };
    if (req.query.sort) {
      const sortField = req.query.sort.startsWith('-') ? req.query.sort.slice(1) : req.query.sort;
      const sortOrder = req.query.sort.startsWith('-') ? -1 : 1;
      sort = { [sortField]: sortOrder };
    }

    // Execute query
    const staff = await Staff.find(filter)
      .populate('user', 'firstName lastName email phone avatar')
      .populate('hotel', 'name location')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const total = await Staff.countDocuments(filter);

    res.json({
      success: true,
      count: staff.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: staff
    });
  })
);

// @desc    Get single staff member
// @route   GET /api/v1/staff/:id
// @access  Private (Manager/Admin)
router.get('/:id', asyncHandler(async (req, res) => {
  const staff = await Staff.findById(req.params.id)
    .populate('user', 'firstName lastName email phone avatar')
    .populate('hotel', 'name location')
    .populate('tasks.assignedBy', 'firstName lastName')
    .populate('tasks.assignedTo', 'firstName lastName');

  if (!staff) {
    return res.status(404).json({
      success: false,
      message: 'Staff member not found'
    });
  }

  // Check access permissions
  if (req.user.role === 'manager') {
    const hotel = await Hotel.findById(staff.hotel);
    if (!hotel || hotel.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized to view this staff member.'
      });
    }
  }

  res.json({
    success: true,
    data: staff
  });
}));

// @desc    Create staff member
// @route   POST /api/v1/staff
// @access  Private (Manager/Admin)
router.post('/',
  protect,
  authorize('manager', 'admin'),
  uploadMultiple('documents', 10),
  [
    body('user').isMongoId().withMessage('Valid user ID is required'),
    body('hotel').isMongoId().withMessage('Valid hotel ID is required'),
    body('department').isIn(['front_desk', 'housekeeping', 'food_service', 'maintenance', 'security', 'management', 'concierge']).withMessage('Invalid department'),
    body('position').trim().notEmpty().withMessage('Position is required'),
    body('role').isIn(['staff', 'supervisor', 'manager', 'head']).withMessage('Invalid role'),
    body('shift').optional().isIn(['morning', 'afternoon', 'evening', 'night', 'flexible']),
    body('salary.amount').isFloat({ min: 0 }).withMessage('Salary amount must be positive'),
    body('salary.currency').optional().isIn(['INR', 'USD', 'EUR']),
    body('salary.paymentFrequency').optional().isIn(['weekly', 'monthly', 'quarterly']),
    body('hireDate').isISO8601().withMessage('Hire date must be valid'),
    body('permissions').optional().isArray().withMessage('Permissions must be an array')
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

    const { user, hotel, department, position, role, shift, salary, hireDate, permissions } = req.body;

    // Check if user exists
    const userExists = await User.findById(user);
    if (!userExists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check hotel access for managers
    if (req.user.role === 'manager') {
      const hotelData = await Hotel.findById(hotel);
      if (!hotelData || hotelData.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to add staff to this hotel.'
        });
      }
    }

    // Check if user is already staff
    const existingStaff = await Staff.findOne({ user });
    if (existingStaff) {
      return res.status(400).json({
        success: false,
        message: 'User is already a staff member'
      });
    }

    // Handle document uploads
    const documents = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        documents.push({
          type: 'other',
          name: file.originalname,
          url: file.url,
          uploadedAt: new Date()
        });
      });
    }

    const staffData = {
      user,
      hotel,
      department,
      position,
      role,
      shift: shift || 'flexible',
      salary: {
        amount: salary.amount,
        currency: salary.currency || 'INR',
        paymentFrequency: salary.paymentFrequency || 'monthly'
      },
      hireDate: new Date(hireDate),
      permissions: permissions || [],
      documents
    };

    const staff = await Staff.create(staffData);

    // Update user role
    await User.findByIdAndUpdate(user, { role: 'staff' });

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      data: staff
    });
  })
);

// @desc    Update staff member
// @route   PUT /api/v1/staff/:id
// @access  Private (Manager/Admin)
router.put('/:id',
  protect,
  authorize('manager', 'admin'),
  uploadMultiple('documents', 10),
  [
    body('department').optional().isIn(['front_desk', 'housekeeping', 'food_service', 'maintenance', 'security', 'management', 'concierge']),
    body('position').optional().trim().notEmpty(),
    body('role').optional().isIn(['staff', 'supervisor', 'manager', 'head']),
    body('shift').optional().isIn(['morning', 'afternoon', 'evening', 'night', 'flexible']),
    body('salary.amount').optional().isFloat({ min: 0 }),
    body('salary.currency').optional().isIn(['INR', 'USD', 'EUR']),
    body('salary.paymentFrequency').optional().isIn(['weekly', 'monthly', 'quarterly']),
    body('isActive').optional().isBoolean(),
    body('performance.rating').optional().isFloat({ min: 1, max: 5 }),
    body('permissions').optional().isArray()
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

    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Check hotel access for managers
    if (req.user.role === 'manager') {
      const hotel = await Hotel.findById(staff.hotel);
      if (!hotel || hotel.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to update this staff member.'
        });
      }
    }

    // Handle new document uploads
    if (req.files && req.files.length > 0) {
      const newDocuments = req.files.map((file, index) => ({
        type: 'other',
        name: file.originalname,
        url: file.url,
        uploadedAt: new Date()
      }));
      staff.documents.push(...newDocuments);
    }

    // Update staff data
    const allowedUpdates = [
      'department', 'position', 'role', 'shift', 'salary',
      'isActive', 'performance', 'permissions', 'workSchedule'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        staff[field] = req.body[field];
      }
    });

    await staff.save();

    res.json({
      success: true,
      message: 'Staff member updated successfully',
      data: staff
    });
  })
);

// @desc    Delete staff member
// @route   DELETE /api/v1/staff/:id
// @access  Private (Admin only)
router.delete('/:id',
  protect,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Update user role back to customer
    await User.findByIdAndUpdate(staff.user, { role: 'customer' });

    await Staff.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Staff member deleted successfully'
    });
  })
);

// @desc    Assign task to staff
// @route   POST /api/v1/staff/:id/tasks
// @access  Private (Manager/Admin)
router.post('/:id/tasks',
  protect,
  authorize('manager', 'admin'),
  [
    body('title').trim().notEmpty().withMessage('Task title is required'),
    body('description').trim().notEmpty().withMessage('Task description is required'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('dueDate').isISO8601().withMessage('Due date must be valid'),
    body('hotel').isMongoId().withMessage('Valid hotel ID is required')
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

    const { title, description, priority, dueDate, hotel } = req.body;

    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Check hotel access for managers
    if (req.user.role === 'manager') {
      const hotelData = await Hotel.findById(hotel);
      if (!hotelData || hotelData.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to assign tasks for this hotel.'
        });
      }
    }

    const taskData = {
      title,
      description,
      priority: priority || 'medium',
      assignedBy: req.user._id,
      assignedTo: staff.user,
      hotel,
      dueDate: new Date(dueDate)
    };

    await staff.addTask(taskData);

    res.status(201).json({
      success: true,
      message: 'Task assigned successfully',
      data: staff.tasks[staff.tasks.length - 1]
    });
  })
);

// @desc    Update task status
// @route   PUT /api/v1/staff/:id/tasks/:taskId
// @access  Private (Manager/Admin)
router.put('/:id/tasks/:taskId',
  protect,
  authorize('manager', 'admin'),
  [
    body('status').isIn(['pending', 'in_progress', 'completed', 'cancelled']).withMessage('Invalid status'),
    body('notes').optional().trim().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters')
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

    const { status, notes } = req.body;

    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Check hotel access for managers
    if (req.user.role === 'manager') {
      const hotel = await Hotel.findById(staff.hotel);
      if (!hotel || hotel.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to manage this staff member.'
        });
      }
    }

    const success = await staff.updateTaskStatus(req.params.taskId, status, notes);

    if (!success) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task status updated successfully',
      data: {
        taskId: req.params.taskId,
        status,
        updatedAt: new Date()
      }
    });
  })
);

// @desc    Mark attendance
// @route   POST /api/v1/staff/:id/attendance
// @access  Private (Manager/Admin)
router.post('/:id/attendance',
  protect,
  authorize('manager', 'admin'),
  [
    body('date').isISO8601().withMessage('Date must be valid'),
    body('checkIn').optional().isISO8601().withMessage('Check-in time must be valid'),
    body('checkOut').optional().isISO8601().withMessage('Check-out time must be valid'),
    body('status').optional().isIn(['present', 'absent', 'late', 'half_day', 'overtime']),
    body('notes').optional().trim().isLength({ max: 200 }).withMessage('Notes cannot exceed 200 characters')
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

    const { date, checkIn, checkOut, status, notes } = req.body;

    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Check hotel access for managers
    if (req.user.role === 'manager') {
      const hotel = await Hotel.findById(staff.hotel);
      if (!hotel || hotel.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to manage this staff member.'
        });
      }
    }

    await staff.markAttendance(new Date(date), checkIn ? new Date(checkIn) : null, checkOut ? new Date(checkOut) : null);

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: {
        date: new Date(date),
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        status: status || 'present'
      }
    });
  })
);

// @desc    Get staff tasks
// @route   GET /api/v1/staff/:id/tasks
// @access  Private (Manager/Admin)
router.get('/:id/tasks',
  protect,
  authorize('manager', 'admin'),
  [
    query('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']),
    query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    query('overdue').optional().isBoolean()
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

    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Check hotel access for managers
    if (req.user.role === 'manager') {
      const hotel = await Hotel.findById(staff.hotel);
      if (!hotel || hotel.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to view this staff member.'
        });
      }
    }

    let tasks = staff.tasks;

    // Apply filters
    if (req.query.status) {
      tasks = tasks.filter(task => task.status === req.query.status);
    }

    if (req.query.priority) {
      tasks = tasks.filter(task => task.priority === req.query.priority);
    }

    if (req.query.overdue === 'true') {
      const now = new Date();
      tasks = tasks.filter(task => 
        task.status !== 'completed' && 
        task.status !== 'cancelled' && 
        task.dueDate < now
      );
    }

    res.json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  })
);

// @desc    Get staff attendance
// @route   GET /api/v1/staff/:id/attendance
// @access  Private (Manager/Admin)
router.get('/:id/attendance',
  protect,
  authorize('manager', 'admin'),
  [
    query('startDate').optional().isISO8601().withMessage('Start date must be valid'),
    query('endDate').optional().isISO8601().withMessage('End date must be valid'),
    query('status').optional().isIn(['present', 'absent', 'late', 'half_day', 'overtime'])
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

    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Check hotel access for managers
    if (req.user.role === 'manager') {
      const hotel = await Hotel.findById(staff.hotel);
      if (!hotel || hotel.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to view this staff member.'
        });
      }
    }

    let attendance = staff.attendance;

    // Apply filters
    if (req.query.startDate) {
      const startDate = new Date(req.query.startDate);
      attendance = attendance.filter(att => att.date >= startDate);
    }

    if (req.query.endDate) {
      const endDate = new Date(req.query.endDate);
      attendance = attendance.filter(att => att.date <= endDate);
    }

    if (req.query.status) {
      attendance = attendance.filter(att => att.status === req.query.status);
    }

    // Sort by date
    attendance.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      count: attendance.length,
      data: attendance
    });
  })
);

// @desc    Get staff statistics
// @route   GET /api/v1/staff/:id/statistics
// @access  Private (Manager/Admin)
router.get('/:id/statistics',
  protect,
  authorize('manager', 'admin'),
  asyncHandler(async (req, res) => {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Check hotel access for managers
    if (req.user.role === 'manager') {
      const hotel = await Hotel.findById(staff.hotel);
      if (!hotel || hotel.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to view this staff member.'
        });
      }
    }

    // Get current tasks
    const currentTasks = staff.getCurrentTasks();
    const overdueTasks = staff.getOverdueTasks();

    // Calculate attendance statistics
    const totalDays = staff.attendance.length;
    const presentDays = staff.attendance.filter(att => att.status === 'present').length;
    const absentDays = staff.attendance.filter(att => att.status === 'absent').length;
    const lateDays = staff.attendance.filter(att => att.status === 'late').length;

    // Calculate total hours worked
    const totalHours = staff.attendance.reduce((total, att) => {
      return total + (att.hoursWorked || 0);
    }, 0);

    // Task completion rate
    const totalTasks = staff.tasks.length;
    const completedTasks = staff.tasks.filter(task => task.status === 'completed').length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    res.json({
      success: true,
      data: {
        tasks: {
          total: totalTasks,
          current: currentTasks.length,
          overdue: overdueTasks.length,
          completed: completedTasks,
          completionRate: Math.round(completionRate * 100) / 100
        },
        attendance: {
          totalDays,
          presentDays,
          absentDays,
          lateDays,
          attendanceRate: totalDays > 0 ? Math.round((presentDays / totalDays) * 10000) / 100 : 0,
          totalHours: Math.round(totalHours * 100) / 100
        },
        performance: {
          rating: staff.performance.rating,
          lastReview: staff.performance.lastReview,
          nextReview: staff.performance.nextReview
        }
      }
    });
  })
);

module.exports = router;
