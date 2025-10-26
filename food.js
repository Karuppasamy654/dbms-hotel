const express = require('express');
const { body, validationResult, query } = require('express-validator');
const FoodItem = require('../models/FoodItem');
const Hotel = require('../models/Hotel');
const { protect, authorize, checkHotelAccess, optionalAuth } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { uploadMultiple } = require('../middleware/upload');

const router = express.Router();

// @desc    Get all food items
// @route   GET /api/v1/food
// @access  Public
router.get('/',
  optionalAuth,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    query('hotel').optional().isMongoId().withMessage('Hotel ID must be valid'),
    query('category').optional().isIn(['breakfast', 'lunch', 'dinner', 'beverages', 'desserts', 'snacks']),
    query('subcategory').optional().isIn(['veg', 'non-veg', 'vegan', 'jain', 'continental', 'indian', 'chinese', 'italian', 'mexican']),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
    query('available').optional().isBoolean().withMessage('Available must be boolean'),
    query('popular').optional().isBoolean().withMessage('Popular must be boolean'),
    query('spicy').optional().isBoolean().withMessage('Spicy must be boolean'),
    query('search').optional().trim(),
    query('sort').optional().isIn(['price', '-price', 'name', '-name', 'rating', '-rating', 'createdAt', '-createdAt'])
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
    const offset = (page - 1) * limit;

    // Build where clause
    const whereClause = {};

    // Hotel filter
    if (req.query.hotel) {
      whereClause.hotel_id = req.query.hotel;
    }

    // Category filter
    if (req.query.category) {
      whereClause.category = req.query.category;
    }

    // Type filter
    if (req.query.subcategory) {
      whereClause.type = req.query.subcategory;
    }

    // Price range filter
    if (req.query.minPrice || req.query.maxPrice) {
      whereClause.price = {};
      if (req.query.minPrice) {
        whereClause.price[require('sequelize').Op.gte] = parseFloat(req.query.minPrice);
      }
      if (req.query.maxPrice) {
        whereClause.price[require('sequelize').Op.lte] = parseFloat(req.query.maxPrice);
      }
    }

    // Search filter
    if (req.query.search) {
      whereClause[require('sequelize').Op.or] = [
        { name: { [require('sequelize').Op.iLike]: `%${req.query.search}%` } }
      ];
    }

    // Build order clause
    let order = [['created_at', 'DESC']];
    if (req.query.sort) {
      const sortField = req.query.sort.startsWith('-') ? req.query.sort.slice(1) : req.query.sort;
      const sortOrder = req.query.sort.startsWith('-') ? 'DESC' : 'ASC';
      order = [[sortField, sortOrder]];
    }

    // Execute query
    const { count, rows: foodItems } = await FoodItem.findAndCountAll({
      where: whereClause,
      order: order,
      limit: limit,
      offset: offset,
      include: [{
        model: Hotel,
        as: 'hotel',
        attributes: ['hotel_id', 'name', 'location'],
        required: false
      }]
    });

    res.json({
      success: true,
      count: foodItems.length,
      total: count,
      page,
      pages: Math.ceil(count / limit),
      data: foodItems
    });
  })
);

// @desc    Get single food item
// @route   GET /api/v1/food/:id
// @access  Public
router.get('/:id', asyncHandler(async (req, res) => {
  const foodItem = await FoodItem.findById(req.params.id)
    .populate('hotel', 'name location')
    .populate('createdBy', 'firstName lastName')
    .populate('ratings.user', 'firstName lastName');

  if (!foodItem) {
    return res.status(404).json({
      success: false,
      message: 'Food item not found'
    });
  }

  // Add virtual fields
  const foodItemWithVirtuals = {
    ...foodItem.toObject(),
    primaryImage: foodItem.images.find(img => img.isPrimary)?.url || foodItem.images[0]?.url || null,
    ratingCount: foodItem.ratings.length
  };

  res.json({
    success: true,
    data: foodItemWithVirtuals
  });
}));

// @desc    Create food item
// @route   POST /api/v1/food
// @access  Private (Manager/Admin)
router.post('/',
  protect,
  authorize('manager', 'admin'),
  uploadMultiple('foodImages', 5),
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
    body('description').optional().trim().isLength({ max: 500 }).withMessage('Description cannot exceed 500 characters'),
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
    body('category').isIn(['breakfast', 'lunch', 'dinner', 'beverages', 'desserts', 'snacks']).withMessage('Invalid category'),
    body('subcategory').optional().isIn(['veg', 'non-veg', 'vegan', 'jain', 'continental', 'indian', 'chinese', 'italian', 'mexican']),
    body('hotel').isMongoId().withMessage('Valid hotel ID is required'),
    body('ingredients').optional().isArray().withMessage('Ingredients must be an array'),
    body('allergens').optional().isArray().withMessage('Allergens must be an array'),
    body('tags').optional().isArray().withMessage('Tags must be an array'),
    body('preparationTime').optional().isInt({ min: 1 }).withMessage('Preparation time must be a positive integer'),
    body('spiceLevel').optional().isInt({ min: 0, max: 5 }).withMessage('Spice level must be 0-5')
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

    // Check if hotel exists and user has access
    const hotel = await Hotel.findById(req.body.hotel);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    // Check hotel access for non-admin users
    if (req.user.role !== 'admin' && hotel.manager.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not authorized to add food items to this hotel.'
      });
    }

    // Handle image uploads
    const images = [];
    if (req.files && req.files.length > 0) {
      req.files.forEach((file, index) => {
        images.push({
          url: file.url,
          alt: `${req.body.name} - Image ${index + 1}`,
          isPrimary: index === 0
        });
      });
    }

    const foodItemData = {
      ...req.body,
      createdBy: req.user._id,
      images
    };

    const foodItem = await FoodItem.create(foodItemData);

    res.status(201).json({
      success: true,
      message: 'Food item created successfully',
      data: foodItem
    });
  })
);

// @desc    Update food item
// @route   PUT /api/v1/food/:id
// @access  Private (Manager/Admin)
router.put('/:id',
  protect,
  authorize('manager', 'admin'),
  uploadMultiple('foodImages', 5),
  [
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
    body('price').optional().isFloat({ min: 0 }),
    body('category').optional().isIn(['breakfast', 'lunch', 'dinner', 'beverages', 'desserts', 'snacks']),
    body('subcategory').optional().isIn(['veg', 'non-veg', 'vegan', 'jain', 'continental', 'indian', 'chinese', 'italian', 'mexican']),
    body('ingredients').optional().isArray(),
    body('allergens').optional().isArray(),
    body('tags').optional().isArray(),
    body('preparationTime').optional().isInt({ min: 1 }),
    body('spiceLevel').optional().isInt({ min: 0, max: 5 }),
    body('isAvailable').optional().isBoolean(),
    body('isPopular').optional().isBoolean(),
    body('isSpicy').optional().isBoolean()
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

    const foodItem = await FoodItem.findById(req.params.id);

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    // Check access for non-admin users
    if (req.user.role !== 'admin') {
      const hotel = await Hotel.findById(foodItem.hotel);
      if (hotel.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to update this food item.'
        });
      }
    }

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map((file, index) => ({
        url: file.url,
        alt: `${foodItem.name} - Image ${foodItem.images.length + index + 1}`,
        isPrimary: false
      }));
      foodItem.images.push(...newImages);
    }

    // Update food item data
    const allowedUpdates = [
      'name', 'description', 'price', 'category', 'subcategory',
      'ingredients', 'allergens', 'tags', 'preparationTime',
      'spiceLevel', 'isAvailable', 'isPopular', 'isSpicy'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        foodItem[field] = req.body[field];
      }
    });

    await foodItem.save();

    res.json({
      success: true,
      message: 'Food item updated successfully',
      data: foodItem
    });
  })
);

// @desc    Delete food item
// @route   DELETE /api/v1/food/:id
// @access  Private (Manager/Admin)
router.delete('/:id',
  protect,
  authorize('manager', 'admin'),
  asyncHandler(async (req, res) => {
    const foodItem = await FoodItem.findById(req.params.id);

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    // Check access for non-admin users
    if (req.user.role !== 'admin') {
      const hotel = await Hotel.findById(foodItem.hotel);
      if (hotel.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to delete this food item.'
        });
      }
    }

    await FoodItem.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Food item deleted successfully'
    });
  })
);

// @desc    Add rating to food item
// @route   POST /api/v1/food/:id/rating
// @access  Private
router.post('/:id/rating',
  protect,
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review').optional().trim().isLength({ max: 500 }).withMessage('Review cannot exceed 500 characters')
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

    const { rating, review } = req.body;

    const foodItem = await FoodItem.findById(req.params.id);

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    await foodItem.addRating(req.user._id, rating, review);

    res.json({
      success: true,
      message: 'Rating added successfully',
      data: {
        averageRating: foodItem.averageRating,
        ratingCount: foodItem.ratings.length
      }
    });
  })
);

// @desc    Get popular food items
// @route   GET /api/v1/food/popular
// @access  Public
router.get('/popular',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
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

    const limit = parseInt(req.query.limit) || 10;
    const filter = { isPopular: true, isAvailable: true };

    if (req.query.hotel) {
      filter.hotel = req.query.hotel;
    }

    const popularItems = await FoodItem.find(filter)
      .populate('hotel', 'name location')
      .sort({ totalOrders: -1, averageRating: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      count: popularItems.length,
      data: popularItems
    });
  })
);

// @desc    Search food items
// @route   GET /api/v1/food/search
// @access  Public
router.get('/search',
  [
    query('q').trim().notEmpty().withMessage('Search query is required'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
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

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const searchQuery = req.query.q;
    const filter = {
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { ingredients: { $in: [new RegExp(searchQuery, 'i')] } },
        { tags: { $in: [new RegExp(searchQuery, 'i')] } }
      ],
      isAvailable: true
    };

    if (req.query.hotel) {
      filter.hotel = req.query.hotel;
    }

    const foodItems = await FoodItem.find(filter)
      .populate('hotel', 'name location')
      .sort({ averageRating: -1, totalOrders: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await FoodItem.countDocuments(filter);

    res.json({
      success: true,
      count: foodItems.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: foodItems
    });
  })
);

// @desc    Get food categories
// @route   GET /api/v1/food/categories
// @access  Public
router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await FoodItem.distinct('category', { isAvailable: true });
  
  const categoryData = await Promise.all(
    categories.map(async (category) => {
      const count = await FoodItem.countDocuments({ category, isAvailable: true });
      return { category, count };
    })
  );

  res.json({
    success: true,
    data: categoryData
  });
}));

// @desc    Update food item availability
// @route   PUT /api/v1/food/:id/availability
// @access  Private (Manager/Admin)
router.put('/:id/availability',
  protect,
  authorize('manager', 'admin'),
  [
    body('isAvailable').isBoolean().withMessage('Availability must be boolean')
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

    const { isAvailable } = req.body;

    const foodItem = await FoodItem.findById(req.params.id);

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    // Check access for non-admin users
    if (req.user.role !== 'admin') {
      const hotel = await Hotel.findById(foodItem.hotel);
      if (hotel.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to update this food item.'
        });
      }
    }

    await foodItem.updateAvailability(isAvailable);

    res.json({
      success: true,
      message: `Food item ${isAvailable ? 'made available' : 'made unavailable'} successfully`,
      data: {
        isAvailable: foodItem.isAvailable
      }
    });
  })
);

// @desc    Update food item price
// @route   PUT /api/v1/food/:id/price
// @access  Private (Manager/Admin)
router.put('/:id/price',
  protect,
  authorize('manager', 'admin'),
  [
    body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number')
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

    const { price } = req.body;

    const foodItem = await FoodItem.findById(req.params.id);

    if (!foodItem) {
      return res.status(404).json({
        success: false,
        message: 'Food item not found'
      });
    }

    // Check access for non-admin users
    if (req.user.role !== 'admin') {
      const hotel = await Hotel.findById(foodItem.hotel);
      if (hotel.manager.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized to update this food item.'
        });
      }
    }

    await foodItem.updatePrice(price);

    res.json({
      success: true,
      message: 'Food item price updated successfully',
      data: {
        price: foodItem.price
      }
    });
  })
);

module.exports = router;
