const { Order, Product, Customer } = require('../models/Schemas');

// @desc    Create a manual appointment
// @route   POST /api/vendor/appointments
// @access  Private (Vendor)
const createAppointment = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { memberName, memberId, productId, appointmentDate, appointmentTimeSlot, finalAmount, status } = req.body;

    if (!memberName || !productId || !appointmentDate || !appointmentTimeSlot) {
      return res.status(400).json({ success: false, message: 'Patient name, doctor, date, and time slot are required' });
    }

    // Get doctor details
    const product = await Product.findById(productId);
    if (!product || product.vendorId !== vendorId) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Check for double booking
    const activeAppointment = await Order.findOne({
      vendorId,
      type: 'Appointment',
      $or: [
        { 'items.productId': productId },
        { doctorName: product.name }
      ],
      appointmentDate,
      appointmentTimeSlot,
      status: { $ne: 'Cancelled' }
    });

    if (activeAppointment) {
      return res.status(400).json({
        success: false,
        message: `Dr. ${product.name} is already booked for ${appointmentTimeSlot} on ${appointmentDate}.`
      });
    }

    const price = finalAmount !== undefined ? Number(finalAmount) : product.price;
    const patientId = memberId || `WALKIN-${Math.floor(1000 + Math.random() * 9000)}`;

    const orderData = {
      vendorId,
      memberId: patientId,
      memberName,
      type: 'Appointment',
      items: [{
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 1
      }],
      totalAmount: product.price,
      discountApplied: product.price > price ? product.price - price : 0,
      finalAmount: price,
      status: status || 'Accepted',
      appointmentDate,
      appointmentTimeSlot,
      doctorName: product.name
    };

    const appointment = await Order.create(orderData);

    // Update customer record or create one
    let customer = await Customer.findOne({ vendorId, name: memberName });
    if (customer) {
      customer.ordersCount += 1;
      customer.totalSpent += price;
      await customer.save();
    } else {
      await Customer.create({
        vendorId,
        name: memberName,
        email: memberId && memberId.includes('@') ? memberId : '',
        phone: '',
        ordersCount: 1,
        totalSpent: price
      });
    }

    res.status(201).json({
      success: true,
      message: 'Appointment scheduled successfully!',
      data: appointment
    });
  } catch (error) {
    console.error('Create Appointment Error:', error);
    res.status(500).json({ success: false, message: 'Server error creating appointment' });
  }
};

// @desc    Create a manual stay booking
// @route   POST /api/vendor/bookings
// @access  Private (Vendor)
const createBooking = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { memberName, memberId, productId, appointmentDate, appointmentTimeSlot, roomNumber, finalAmount, status } = req.body;

    if (!memberName || !productId || !appointmentDate) {
      return res.status(400).json({ success: false, message: 'Guest name, room, and check-in date are required' });
    }

    // Get room details
    const product = await Product.findById(productId);
    if (!product || product.vendorId !== vendorId) {
      return res.status(404).json({ success: false, message: 'Room type not found' });
    }

    const price = finalAmount !== undefined && finalAmount !== '' ? Number(finalAmount) : product.price;
    const guestId = memberId || `WALKIN-${Math.floor(1000 + Math.random() * 9000)}`;

    const orderData = {
      vendorId,
      memberId: guestId,
      memberName,
      type: 'Booking',
      items: [{
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: 1
      }],
      totalAmount: product.price,
      discountApplied: product.price > price ? product.price - price : 0,
      finalAmount: price,
      status: status || 'Accepted',
      appointmentDate,
      appointmentTimeSlot: appointmentTimeSlot || '1', // nights
      roomNumber: roomNumber || ''
    };

    const booking = await Order.create(orderData);

    // Update customer record or create one
    let customer = await Customer.findOne({ vendorId, name: memberName });
    if (customer) {
      customer.ordersCount += 1;
      customer.totalSpent += price;
      await customer.save();
    } else {
      await Customer.create({
        vendorId,
        name: memberName,
        email: memberId && memberId.includes('@') ? memberId : '',
        phone: '',
        ordersCount: 1,
        totalSpent: price
      });
    }

    res.status(201).json({
      success: true,
      message: 'Booking added successfully!',
      data: booking
    });
  } catch (error) {
    console.error('Create Booking Error:', error);
    res.status(500).json({ success: false, message: 'Server error creating booking' });
  }
};

// @desc    Create a manual storefront order
// @route   POST /api/vendor/orders
// @access  Private (Vendor)
const createManualOrder = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { memberName, memberId, productId, finalAmount, quantity, status } = req.body;

    if (!memberName || !productId) {
      return res.status(400).json({ success: false, message: 'Customer name and product are required' });
    }

    const product = await Product.findById(productId);
    if (!product || product.vendorId !== vendorId) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const qty = quantity ? Number(quantity) : 1;
    const price = finalAmount !== undefined && finalAmount !== '' ? Number(finalAmount) : (product.price * qty);
    const custId = memberId || `WALKIN-${Math.floor(1000 + Math.random() * 9000)}`;

    const orderData = {
      vendorId,
      memberId: custId,
      memberName,
      type: 'Order',
      items: [{
        productId: product._id,
        name: product.name,
        price: product.price,
        quantity: qty
      }],
      totalAmount: product.price * qty,
      discountApplied: (product.price * qty) > price ? (product.price * qty) - price : 0,
      finalAmount: price,
      status: status || 'Pending'
    };

    const order = await Order.create(orderData);

    // Reduce product stock count
    if (typeof product.stock === 'number' && product.stock > 0) {
      product.stock = Math.max(0, product.stock - qty);
      if (product.stock === 0) {
        product.status = 'Out of Stock';
      }
      await product.save();
    }

    let customer = await Customer.findOne({ vendorId, name: memberName });
    if (customer) {
      customer.ordersCount += 1;
      customer.totalSpent += price;
      await customer.save();
    } else {
      await Customer.create({
        vendorId,
        name: memberName,
        email: memberId && memberId.includes('@') ? memberId : '',
        phone: '',
        ordersCount: 1,
        totalSpent: price
      });
    }

    res.status(201).json({
      success: true,
      message: 'Order added successfully!',
      data: order
    });
  } catch (error) {
    console.error('Create Manual Order Error:', error);
    res.status(500).json({ success: false, message: 'Server error creating manual order' });
  }
};

module.exports = {
  createAppointment,
  createBooking,
  createManualOrder
};

