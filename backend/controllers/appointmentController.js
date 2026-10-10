const { Order, Product, Customer } = require('../models/Schemas');
const { publishRealtimeEvent, EVENT_TYPES, ENTITY_NAMES } = require('../realtime/realtimeManager');

// @desc    Create a manual appointment
// @route   POST /api/vendor/appointments
// @access  Private (Vendor)
const createAppointment = async (req, res) => {
  try {
    const vendorId = req.user._id;
    const { memberName, memberId, productId, appointmentDate, appointmentTimeSlot, finalAmount, status, gender, age } = req.body;

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
      gender: gender || null,
      age: age || null,
      bookingHolder: {
        name: memberName,
        phone: memberId && !memberId.includes('@') ? memberId : '',
        email: memberId && memberId.includes('@') ? memberId : '',
        gender: gender || null,
        age: age || null
      },
      doctorName: product.name
    };

    const appointment = await Order.create(orderData);
    publishRealtimeEvent({
      event: EVENT_TYPES.ORDER_CREATED,
      entity: ENTITY_NAMES.ORDER,
      entityId: appointment._id ? appointment._id.toString() : appointment.id,
      action: 'created',
      target: {
        vendorId: (appointment.vendorId || appointment.vendor_id || '').toString(),
        userId: (appointment.memberId || appointment.userId || '').toString()
      },
      data: appointment
    }).catch(err => console.warn('[Realtime] Appointment create publish warning:', err.message));

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
    const { 
      memberName, 
      memberId, 
      productId, 
      appointmentDate, 
      appointmentTimeSlot, 
      roomNumber, 
      finalAmount, 
      status,
      gender,
      age,
      guestDetails,
      guestList,
      additionalGuests
    } = req.body;

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

    // Build structured guest list associating each guest with their own name, age, and gender
    let formattedGuestList = [];
    if (Array.isArray(guestDetails) && guestDetails.length > 0) {
      formattedGuestList = guestDetails.map((g, idx) => ({
        guestNumber: idx + 1,
        isPrimary: idx === 0,
        name: g.name || g.fullName || (idx === 0 ? memberName : `Guest ${idx + 1}`),
        fullName: g.fullName || g.name || (idx === 0 ? memberName : `Guest ${idx + 1}`),
        gender: g.gender || (idx === 0 ? (gender || null) : null),
        age: g.age || (idx === 0 ? (age || null) : null),
        phone: g.phone || g.phoneNumber || (idx === 0 ? (memberId && !memberId.includes('@') ? memberId : '') : ''),
        role: idx === 0 ? 'Primary / Booking Holder' : 'Additional Guest'
      }));
    } else if (Array.isArray(guestList) && guestList.length > 0) {
      formattedGuestList = guestList.map((g, idx) => ({
        guestNumber: idx + 1,
        isPrimary: idx === 0,
        name: g.name || g.fullName || (idx === 0 ? memberName : `Guest ${idx + 1}`),
        fullName: g.fullName || g.name || (idx === 0 ? memberName : `Guest ${idx + 1}`),
        gender: g.gender || (idx === 0 ? (gender || null) : null),
        age: g.age || (idx === 0 ? (age || null) : null),
        phone: g.phone || g.phoneNumber || (idx === 0 ? (memberId && !memberId.includes('@') ? memberId : '') : ''),
        role: idx === 0 ? 'Primary / Booking Holder' : 'Additional Guest'
      }));
    } else {
      // Primary guest
      formattedGuestList.push({
        guestNumber: 1,
        isPrimary: true,
        name: memberName,
        fullName: memberName,
        gender: gender || null,
        age: age || null,
        phone: memberId && !memberId.includes('@') ? memberId : '',
        role: 'Primary / Booking Holder'
      });
      // Append any additional guests if provided
      if (Array.isArray(additionalGuests) && additionalGuests.length > 0) {
        additionalGuests.forEach((ag, idx) => {
          if (ag && (ag.name || ag.gender || ag.age)) {
            formattedGuestList.push({
              guestNumber: idx + 2,
              isPrimary: false,
              name: ag.name || `Guest ${idx + 2}`,
              fullName: ag.name || `Guest ${idx + 2}`,
              gender: ag.gender || null,
              age: ag.age || null,
              phone: ag.phone || '',
              role: 'Additional Guest'
            });
          }
        });
      }
    }

    const primaryGuest = formattedGuestList[0] || {};

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
      roomNumber: roomNumber || '',
      gender: gender || primaryGuest.gender || null,
      age: age || primaryGuest.age || null,
      guestDetails: formattedGuestList,
      guestList: formattedGuestList,
      resolvedGuestList: formattedGuestList,
      guests: formattedGuestList.length,
      bookingHolder: {
        name: memberName,
        phone: memberId && !memberId.includes('@') ? memberId : '',
        email: memberId && memberId.includes('@') ? memberId : '',
        gender: gender || primaryGuest.gender || null,
        age: age || primaryGuest.age || null
      }
    };

    const booking = await Order.create(orderData);
    publishRealtimeEvent({
      event: EVENT_TYPES.ORDER_CREATED,
      entity: ENTITY_NAMES.ORDER,
      entityId: booking._id ? booking._id.toString() : booking.id,
      action: 'created',
      target: {
        vendorId: (booking.vendorId || booking.vendor_id || '').toString(),
        userId: (booking.memberId || booking.userId || '').toString()
      },
      data: booking
    }).catch(err => console.warn('[Realtime] Booking create publish warning:', err.message));

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
    publishRealtimeEvent({
      event: EVENT_TYPES.ORDER_CREATED,
      entity: ENTITY_NAMES.ORDER,
      entityId: order._id ? order._id.toString() : order.id,
      action: 'created',
      target: {
        vendorId: (order.vendorId || order.vendor_id || '').toString(),
        userId: (order.memberId || order.userId || '').toString()
      },
      data: order
    }).catch(err => console.warn('[Realtime] Manual order create publish warning:', err.message));

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

