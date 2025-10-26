const express = require('express');
const { body, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const { protect, authorize } = require('../middleware/auth');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const Razorpay = require('razorpay');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// @desc    Create Razorpay order
// @route   POST /api/v1/payments/razorpay/create-order
// @access  Private
router.post('/razorpay/create-order',
  protect,
  [
    body('bookingId').isMongoId().withMessage('Valid booking ID is required'),
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1')
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

    const { bookingId, amount } = req.body;

    // Get booking details
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns this booking
    if (req.user.role !== 'admin' && booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only pay for your own bookings.'
      });
    }

    // Check if booking is already paid
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already paid'
      });
    }

    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: `booking_${bookingId}`,
      notes: {
        bookingId: bookingId,
        userId: req.user._id.toString(),
        hotelName: booking.hotel.name
      }
    };

    try {
      const order = await razorpay.orders.create(options);

      // Update booking with payment details
      booking.paymentId = order.id;
      booking.paymentMethod = 'razorpay';
      await booking.save();

      res.json({
        success: true,
        message: 'Razorpay order created successfully',
        data: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          key: process.env.RAZORPAY_KEY_ID
        }
      });
    } catch (error) {
      console.error('Razorpay order creation failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create payment order'
      });
    }
  })
);

// @desc    Verify Razorpay payment
// @route   POST /api/v1/payments/razorpay/verify
// @access  Private
router.post('/razorpay/verify',
  protect,
  [
    body('orderId').notEmpty().withMessage('Order ID is required'),
    body('paymentId').notEmpty().withMessage('Payment ID is required'),
    body('signature').notEmpty().withMessage('Signature is required')
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

    const { orderId, paymentId, signature } = req.body;

    // Find booking by order ID
    const booking = await Booking.findOne({ paymentId: orderId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns this booking
    if (req.user.role !== 'admin' && booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Verify payment signature
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (expectedSignature !== signature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Update booking payment status
    booking.paymentStatus = 'paid';
    booking.pricing.paidAmount = booking.pricing.totalAmount;
    booking.status = 'confirmed';
    await booking.save();

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        bookingId: booking._id,
        paymentId,
        amount: booking.pricing.totalAmount,
        status: booking.paymentStatus
      }
    });
  })
);

// @desc    Create Stripe payment intent
// @route   POST /api/v1/payments/stripe/create-intent
// @access  Private
router.post('/stripe/create-intent',
  protect,
  [
    body('bookingId').isMongoId().withMessage('Valid booking ID is required'),
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least 1')
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

    const { bookingId, amount } = req.body;

    // Get booking details
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns this booking
    if (req.user.role !== 'admin' && booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only pay for your own bookings.'
      });
    }

    // Check if booking is already paid
    if (booking.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already paid'
      });
    }

    try {
      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'inr',
        metadata: {
          bookingId: bookingId,
          userId: req.user._id.toString(),
          hotelName: booking.hotel.name
        }
      });

      // Update booking with payment details
      booking.paymentId = paymentIntent.id;
      booking.paymentMethod = 'stripe';
      await booking.save();

      res.json({
        success: true,
        message: 'Stripe payment intent created successfully',
        data: {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount,
          currency: paymentIntent.currency
        }
      });
    } catch (error) {
      console.error('Stripe payment intent creation failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create payment intent'
      });
    }
  })
);

// @desc    Confirm Stripe payment
// @route   POST /api/v1/payments/stripe/confirm
// @access  Private
router.post('/stripe/confirm',
  protect,
  [
    body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required')
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

    const { paymentIntentId } = req.body;

    // Find booking by payment intent ID
    const booking = await Booking.findOne({ paymentId: paymentIntentId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns this booking
    if (req.user.role !== 'admin' && booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    try {
      // Retrieve payment intent from Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        // Update booking payment status
        booking.paymentStatus = 'paid';
        booking.pricing.paidAmount = booking.pricing.totalAmount;
        booking.status = 'confirmed';
        await booking.save();

        res.json({
          success: true,
          message: 'Payment confirmed successfully',
          data: {
            bookingId: booking._id,
            paymentIntentId,
            amount: booking.pricing.totalAmount,
            status: booking.paymentStatus
          }
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Payment not completed',
          data: {
            status: paymentIntent.status
          }
        });
      }
    } catch (error) {
      console.error('Stripe payment confirmation failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to confirm payment'
      });
    }
  })
);

// @desc    Process refund
// @route   POST /api/v1/payments/refund
// @access  Private (Manager/Admin)
router.post('/refund',
  protect,
  authorize('manager', 'admin'),
  [
    body('bookingId').isMongoId().withMessage('Valid booking ID is required'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('reason').optional().trim().isLength({ max: 200 }).withMessage('Reason cannot exceed 200 characters')
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

    const { bookingId, amount, reason } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking is paid
    if (booking.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Booking is not paid'
      });
    }

    const refundAmount = amount || booking.pricing.paidAmount;

    try {
      let refund;

      if (booking.paymentMethod === 'razorpay') {
        // Process Razorpay refund
        refund = await razorpay.payments.refund(booking.paymentId, {
          amount: Math.round(refundAmount * 100), // Convert to paise
          notes: {
            reason: reason || 'Booking cancellation',
            bookingId: bookingId
          }
        });
      } else if (booking.paymentMethod === 'stripe') {
        // Process Stripe refund
        const paymentIntent = await stripe.paymentIntents.retrieve(booking.paymentId);
        const charge = paymentIntent.charges.data[0];
        
        refund = await stripe.refunds.create({
          charge: charge.id,
          amount: Math.round(refundAmount * 100), // Convert to cents
          reason: 'requested_by_customer',
          metadata: {
            bookingId: bookingId,
            reason: reason || 'Booking cancellation'
          }
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Unsupported payment method'
        });
      }

      // Update booking refund status
      booking.cancellation.refundStatus = 'processed';
      booking.cancellation.refundAmount = refundAmount;
      booking.paymentStatus = 'refunded';
      await booking.save();

      res.json({
        success: true,
        message: 'Refund processed successfully',
        data: {
          refundId: refund.id,
          amount: refundAmount,
          status: 'processed'
        }
      });
    } catch (error) {
      console.error('Refund processing failed:', error);
      
      // Update booking refund status as failed
      booking.cancellation.refundStatus = 'failed';
      await booking.save();

      return res.status(500).json({
        success: false,
        message: 'Failed to process refund'
      });
    }
  })
);

// @desc    Get payment methods
// @route   GET /api/v1/payments/methods
// @access  Public
router.get('/methods', asyncHandler(async (req, res) => {
  const paymentMethods = [
    {
      id: 'razorpay',
      name: 'Razorpay',
      description: 'Pay with UPI, Cards, Net Banking',
      icon: 'credit-card',
      enabled: !!process.env.RAZORPAY_KEY_ID
    },
    {
      id: 'stripe',
      name: 'Stripe',
      description: 'Pay with Cards, Apple Pay, Google Pay',
      icon: 'credit-card',
      enabled: !!process.env.STRIPE_SECRET_KEY
    },
    {
      id: 'cash',
      name: 'Cash',
      description: 'Pay at hotel reception',
      icon: 'money-bill',
      enabled: true
    }
  ];

  res.json({
    success: true,
    data: paymentMethods.filter(method => method.enabled)
  });
}));

// @desc    Get payment status
// @route   GET /api/v1/payments/status/:bookingId
// @access  Private
router.get('/status/:bookingId',
  protect,
  asyncHandler(async (req, res) => {
    const booking = await Booking.findById(req.params.bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if user owns this booking
    if (req.user.role !== 'admin' && booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: {
        bookingId: booking._id,
        paymentStatus: booking.paymentStatus,
        paymentMethod: booking.paymentMethod,
        totalAmount: booking.pricing.totalAmount,
        paidAmount: booking.pricing.paidAmount,
        refundAmount: booking.cancellation.refundAmount,
        refundStatus: booking.cancellation.refundStatus
      }
    });
  })
);

// @desc    Webhook for Razorpay
// @route   POST /api/v1/payments/razorpay/webhook
// @access  Public
router.post('/razorpay/webhook',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const crypto = require('crypto');
    const signature = req.headers['x-razorpay-signature'];

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const event = JSON.parse(req.body);

    switch (event.event) {
      case 'payment.captured':
        // Handle successful payment
        const payment = event.payload.payment.entity;
        const booking = await Booking.findOne({ paymentId: payment.order_id });
        
        if (booking) {
          booking.paymentStatus = 'paid';
          booking.pricing.paidAmount = booking.pricing.totalAmount;
          booking.status = 'confirmed';
          await booking.save();
        }
        break;

      case 'payment.failed':
        // Handle failed payment
        const failedPayment = event.payload.payment.entity;
        const failedBooking = await Booking.findOne({ paymentId: failedPayment.order_id });
        
        if (failedBooking) {
          booking.paymentStatus = 'failed';
          await booking.save();
        }
        break;

      default:
        console.log('Unhandled Razorpay event:', event.event);
    }

    res.json({ success: true });
  })
);

// @desc    Webhook for Stripe
// @route   POST /api/v1/payments/stripe/webhook
// @access  Public
router.post('/stripe/webhook',
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        // Handle successful payment
        const paymentIntent = event.data.object;
        const booking = await Booking.findOne({ paymentId: paymentIntent.id });
        
        if (booking) {
          booking.paymentStatus = 'paid';
          booking.pricing.paidAmount = booking.pricing.totalAmount;
          booking.status = 'confirmed';
          await booking.save();
        }
        break;

      case 'payment_intent.payment_failed':
        // Handle failed payment
        const failedPaymentIntent = event.data.object;
        const failedBooking = await Booking.findOne({ paymentId: failedPaymentIntent.id });
        
        if (failedBooking) {
          booking.paymentStatus = 'failed';
          await booking.save();
        }
        break;

      default:
        console.log('Unhandled Stripe event:', event.type);
    }

    res.json({ success: true });
  })
);

module.exports = router;
