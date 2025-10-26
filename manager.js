// routes/manager.js - Manager Food Management
const express = require('express');
const router = express.Router();
const { FoodItem, Hotel, Room, RoomType } = require('../models');
const { protect, authorize } = require('../middleware/auth');

// Middleware to check if user is manager
const requireManager = (req, res, next) => {
  if (req.user.role !== 'Manager') {
    return res.status(403).json({ message: 'Access denied. Manager role required.' });
  }
  next();
};

// Update food item price
router.put('/food/:food_item_id/price', protect, authorize('Manager'), async (req, res) => {
  try {
    const { food_item_id } = req.params;
    const { price } = req.body;
    
    if (price <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0' });
    }
    
    const foodItem = await FoodItem.findByPk(food_item_id);
    if (!foodItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    
    const oldPrice = foodItem.price;
    await foodItem.update({ price });
    
    // Update all existing order details with new price
    const orderDetails = await OrderDetail.findAll({
      where: { food_item_id }
    });
    
    for (const orderDetail of orderDetails) {
      const newSubtotal = price * orderDetail.quantity;
      await orderDetail.update({ subtotal: newSubtotal });
    }
    
    res.json({
      message: 'Food item price updated successfully',
      food_item: {
        food_item_id: foodItem.food_item_id,
        name: foodItem.name,
        old_price: oldPrice,
        new_price: price,
        updated_orders: orderDetails.length
      }
    });
    
  } catch (error) {
    console.error('Error updating food price:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update food item details
router.put('/food/:food_item_id', protect, authorize('Manager'), async (req, res) => {
  try {
    const { food_item_id } = req.params;
    const { name, price, category, type } = req.body;
    
    const foodItem = await FoodItem.findByPk(food_item_id);
    if (!foodItem) {
      return res.status(404).json({ message: 'Food item not found' });
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (price) updateData.price = price;
    if (category) updateData.category = category;
    if (type) updateData.type = type;
    
    await foodItem.update(updateData);
    
    // If price changed, update existing order details
    if (price && price !== foodItem.price) {
      const orderDetails = await OrderDetail.findAll({
        where: { food_item_id }
      });
      
      for (const orderDetail of orderDetails) {
        const newSubtotal = price * orderDetail.quantity;
        await orderDetail.update({ subtotal: newSubtotal });
      }
    }
    
    res.json({
      message: 'Food item updated successfully',
      food_item: foodItem
    });
    
  } catch (error) {
    console.error('Error updating food item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add new food item
router.post('/food', protect, authorize('Manager'), async (req, res) => {
  try {
    const { name, price, category, type } = req.body;
    
    const foodItem = await FoodItem.create({
      name,
      price,
      category,
      type
    });
    
    res.status(201).json({
      message: 'Food item created successfully',
      food_item: foodItem
    });
    
  } catch (error) {
    console.error('Error creating food item:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update hotel room prices
router.put('/hotel/:hotel_id/room-price', protect, authorize('Manager'), async (req, res) => {
  try {
    const { hotel_id } = req.params;
    const { base_price_per_night } = req.body;
    
    const hotel = await Hotel.findByPk(hotel_id);
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found' });
    }
    
    const oldPrice = hotel.base_price_per_night;
    await hotel.update({ base_price_per_night });
    
    // Update all existing bookings with new price
    const bookings = await Booking.findAll({
      where: { hotel_id },
      include: [{ model: Room, as: 'room', include: [{ model: RoomType, as: 'roomType' }] }]
    });
    
    for (const booking of bookings) {
      const newGrandTotal = base_price_per_night * booking.room.roomType.price_multiplier * booking.total_nights;
      await booking.update({ grand_total: newGrandTotal });
    }
    
    res.json({
      message: 'Hotel room price updated successfully',
      hotel: {
        hotel_id: hotel.hotel_id,
        name: hotel.name,
        old_price: oldPrice,
        new_price: base_price_per_night,
        updated_bookings: bookings.length
      }
    });
    
  } catch (error) {
    console.error('Error updating hotel price:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;