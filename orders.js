// routes/orders.js - Order Management
const express = require('express');
const router = express.Router();
const { FoodOrder, OrderDetail, FoodItem, Booking, User, Hotel } = require('../models');
const auth = require('../middleware/auth');

// Create food order from frontend
router.post('/create', auth, async (req, res) => {
  try {
    const { booking_id, food_items } = req.body;
    
    // Validate booking belongs to user
    const booking = await Booking.findOne({
      where: { booking_id, user_id: req.user.user_id },
      include: [{ model: Hotel, as: 'hotel' }]
    });
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    // Check if order already exists
    const existingOrder = await FoodOrder.findOne({
      where: { booking_id }
    });
    
    if (existingOrder) {
      return res.status(400).json({ message: 'Order already exists for this booking' });
    }
    
    // Create food order
    const foodOrder = await FoodOrder.create({
      booking_id,
      status: 'Pending'
    });
    
    // Process food items and calculate totals
    let totalAmount = 0;
    const orderDetails = [];
    
    for (const item of food_items) {
      const foodItem = await FoodItem.findByPk(item.food_item_id);
      if (!foodItem) {
        return res.status(400).json({ message: `Food item ${item.food_item_id} not found` });
      }
      
      const subtotal = foodItem.price * item.quantity;
      totalAmount += subtotal;
      
      orderDetails.push({
        order_id: foodOrder.order_id,
        food_item_id: item.food_item_id,
        quantity: item.quantity,
        subtotal: subtotal
      });
    }
    
    // Insert order details
    await OrderDetail.bulkCreate(orderDetails);
    
    res.status(201).json({
      message: 'Order created successfully',
      order: {
        order_id: foodOrder.order_id,
        booking_id: foodOrder.booking_id,
        status: foodOrder.status,
        total_amount: totalAmount,
        items: orderDetails
      }
    });
    
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get order details
router.get('/:order_id', auth, async (req, res) => {
  try {
    const { order_id } = req.params;
    
    const order = await FoodOrder.findOne({
      where: { order_id },
      include: [
        {
          model: OrderDetail,
          as: 'orderDetails',
          include: [{ model: FoodItem, as: 'foodItem' }]
        },
        {
          model: Booking,
          as: 'booking',
          include: [
            { model: User, as: 'user' },
            { model: Hotel, as: 'hotel' }
          ]
        }
      ]
    });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;