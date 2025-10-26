// routes/bookings.js - Booking Management
const express = require('express');
const router = express.Router();
const { Booking, User, Hotel, Room, RoomType } = require('../models');
const auth = require('../middleware/auth');

// Create booking from frontend
router.post('/create', auth, async (req, res) => {
  try {
    const { hotel_id, room_number, check_in_date, check_out_date } = req.body;
    
    // Validate room availability
    const room = await Room.findOne({
      where: { room_number, hotel_id, status: 'Vacant' },
      include: [
        { model: Hotel, as: 'hotel' },
        { model: RoomType, as: 'roomType' }
      ]
    });
    
    if (!room) {
      return res.status(400).json({ message: 'Room not available' });
    }
    
    // Calculate total nights and price
    const checkIn = new Date(check_in_date);
    const checkOut = new Date(check_out_date);
    const totalNights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    const grandTotal = room.hotel.base_price_per_night * room.roomType.price_multiplier * totalNights;
    
    // Create booking
    const booking = await Booking.create({
      user_id: req.user.user_id,
      hotel_id,
      room_number,
      check_in_date,
      check_out_date,
      total_nights: totalNights,
      grand_total: grandTotal
    });
    
    // Update room status to Occupied
    await room.update({ status: 'Occupied' });
    
    res.status(201).json({
      message: 'Booking created successfully',
      booking: {
        booking_id: booking.booking_id,
        hotel_name: room.hotel.name,
        room_number: booking.room_number,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        total_nights: booking.total_nights,
        grand_total: booking.grand_total
      }
    });
    
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user bookings
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      where: { user_id: req.user.user_id },
      include: [
        { model: Hotel, as: 'hotel' },
        { model: Room, as: 'room', include: [{ model: RoomType, as: 'roomType' }] }
      ],
      order: [['booking_date', 'DESC']]
    });
    
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;