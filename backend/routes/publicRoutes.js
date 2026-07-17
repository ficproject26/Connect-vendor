const express = require('express');
const { Product, User, Order } = require('../models/Schemas');
const { COMPLETE_CAT_TAXONOMY } = require('../data/completeTaxonomy');

const router = express.Router();

const getItemMainCategory = (itemCategory) => {
  if (!itemCategory) return '';
  
  // 1. Search in specific target categories first to prevent misclassification as generic Services/Products
  const priorityCats = ["Daily Needs", "Food", "Stay", "Travel", "Jobs"];
  for (const mainCat of priorityCats) {
    if (COMPLETE_CAT_TAXONOMY[mainCat]) {
      for (const subCat of Object.keys(COMPLETE_CAT_TAXONOMY[mainCat])) {
        if (COMPLETE_CAT_TAXONOMY[mainCat][subCat].includes(itemCategory)) {
          return mainCat;
        }
      }
    }
  }
  
  // 2. Fallback to generic Services, Products, or others
  const fallbackCats = ["Services", "Products", "Membership"];
  for (const mainCat of fallbackCats) {
    if (COMPLETE_CAT_TAXONOMY[mainCat]) {
      for (const subCat of Object.keys(COMPLETE_CAT_TAXONOMY[mainCat])) {
        if (COMPLETE_CAT_TAXONOMY[mainCat][subCat].includes(itemCategory)) {
          return mainCat;
        }
      }
    }
  }
  
  return '';
};

// Helper to determine customer app tab
const getSubNavbarCategory = (baseVendorType, category) => {
  const mainCat = getItemMainCategory(category);
  if (mainCat) return mainCat;

  const type = (baseVendorType || '').toLowerCase();
  const cat = (category || '').toLowerCase();

  if (type.includes('restaurant') || type.includes('food')) return 'Food';
  if (type.includes('hotel') || type.includes('stay')) return 'Stay';
  if (type.includes('travel')) return 'Travel';
  if (type.includes('job')) return 'Jobs';
  if (type.includes('pharmacy') || type.includes('grocery') || type.includes('daily needs')) return 'Daily Needs';
  if (type.includes('service') || type.includes('hospital') || type.includes('education')) return 'Services';
  if (type.includes('electronics') || type.includes('furniture') || type.includes('store') || type.includes('products')) return 'Products';
  
  if (cat.includes('food') || cat.includes('restaurant')) return 'Food';
  if (cat.includes('stay') || cat.includes('hotel')) return 'Stay';
  if (cat.includes('travel')) return 'Travel';
  if (cat.includes('job') || cat.includes('it jobs')) return 'Jobs';
  if (cat.includes('grocery') || cat.includes('pharmacy') || cat.includes('healthcare') || cat.includes('daily needs')) return 'Daily Needs';
  if (cat.includes('service') || cat.includes('education')) return 'Services';

  return 'Products';
};

// GET /api/public/products
router.get('/products', async (req, res) => {
  try {
    // 1. Fetch all approved vendors
    const approvedVendors = await User.find({ role: 'Vendor', status: 'Approved' });
    const vendorMap = {};
    approvedVendors.forEach(vendor => {
      const vendorIdStr = vendor._id.toString();
      vendorMap[vendorIdStr] = {
        name: vendor.businessName || vendor.name,
        baseVendorType: vendor.baseVendorType || vendor.vendorType,
        category: vendor.category,
        city: vendor.bankCity || 'Bangalore'
      };

      if (vendor.businesses && Array.isArray(vendor.businesses)) {
        vendor.businesses.forEach(biz => {
          if (biz._id) {
            vendorMap[biz._id.toString()] = {
              name: biz.businessName || vendor.businessName || vendor.name,
              baseVendorType: biz.baseVendorType || biz.vendorType || vendor.baseVendorType || vendor.vendorType,
              category: biz.category || vendor.category,
              city: vendor.bankCity || 'Bangalore'
            };
          }
        });
      }
    });

    // 2. Fetch all products
    const products = await Product.find({ status: { $ne: 'Unavailable' } });

    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const baseUrl = `${protocol}://${host}`;

    // 3. Filter and map products to customer app format
    const mappedProducts = products
      .filter(p => vendorMap[p.vendorId]) // only include products from approved vendors
      .map(p => {
        const vendor = vendorMap[p.vendorId];
        const subNavbarCategory = getSubNavbarCategory(vendor.baseVendorType, p.category);
        
        return {
          id: p._id,
          vendorId: p.vendorId,
          name: p.name,
          description: p.description || '',
          price: p.price,
          unit: p.unit || 'count',
          originalPrice: p.originalPrice || Math.round(p.price * 1.25),
          category: p.category || vendor.category || 'General',
          subNavbarCategory: subNavbarCategory,
          image: p.imageUrl 
            ? (p.imageUrl.startsWith('/uploads') ? `${baseUrl}${p.imageUrl}` : p.imageUrl)
            : (subNavbarCategory === 'Services' 
                ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=60' 
                : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=60'),
          rating: 4.5,
          reviews: 120,
          vendorName: vendor.name,
          vendorCity: (() => {
            const pin = String(p.pinCode || '').trim();
            if (pin.startsWith('56')) return 'Bangalore';
            if (pin.startsWith('60')) return 'Chennai';
            if (pin.startsWith('50')) return 'Hyderabad';
            if (pin.startsWith('40')) return 'Mumbai';
            if (pin.startsWith('11')) return 'Delhi';
            if (pin.startsWith('64')) return 'Coimbatore';
            return vendor.city || 'Bangalore';
          })(),
          tag: p.status === 'Low Stock' ? 'Low Stock' : 'Verified Partner',
          discount: '20% off',
          delivery: 'Free Delivery'
        };
      });

    res.status(200).json({ success: true, products: mappedProducts });
  } catch (error) {
    console.error('Get Public Products Error:', error);
    res.status(500).json({ success: false, message: 'Server error retrieving products catalog' });
  }
});

// POST /api/public/orders
router.post('/orders', async (req, res) => {
  console.log('[Sync Request Body]:', JSON.stringify(req.body, null, 2));
  const {
    id, // Customer Order ID (e.g. ORD1243)
    vendorId,
    memberId,
    memberName,
    type,
    items,
    totalAmount,
    discountApplied,
    finalAmount,
    candidateEmail,
    candidateResume,
    order_number,
    appointmentDate,
    appointmentTimeSlot,
    doctorName,
    tableNumber,
    roomNumber,
    prescriptionUrl
  } = req.body;

  if (!vendorId || !memberName || finalAmount === undefined || finalAmount === null) {
    return res.status(400).json({ success: false, message: 'Vendor ID, Member name, and Final amount are required' });
  }

  try {
    let orderType = type || 'Order';
    if (!type) {
      const vendor = await User.findOne({
        role: 'Vendor',
        $or: [ { _id: vendorId }, { 'businesses._id': vendorId } ]
      });
      if (vendor) {
        const vType = vendor.baseVendorType || vendor.vendorType;
        const isHospital = vType && (vType === 'Hospital' || vType.startsWith('Hospital Vendor'));
        if (isHospital) orderType = 'Appointment';
        else if (vType && (vType.startsWith('Hotel') || vType.startsWith('Service Provider Vendor'))) orderType = 'Booking';
      }
    }

    const orderData = {
      id: id,
      order_number: order_number,
      vendorId,
      memberId: memberId || 'cust_dhanush',
      memberName,
      type: orderType,
      items: items || [],
      totalAmount: totalAmount ?? finalAmount,
      discountApplied: discountApplied || 0,
      finalAmount: finalAmount,
      status: 'Pending',
      candidateEmail,
      candidateResume,
      appointmentDate,
      appointmentTimeSlot,
      doctorName,
      tableNumber,
      roomNumber,
      prescriptionUrl
    };

    // If order already exists in the shared database (created by customer backend), update and return it
    const existing = await Order.findOne({ id: id });
    if (existing) {
      await Order.updateOne(
        { id: id },
        {
          $set: {
            vendorId: vendorId || existing.vendorId,
            memberId: memberId || existing.memberId,
            memberName: memberName || existing.memberName,
            candidateEmail: candidateEmail || existing.candidateEmail,
            candidateResume: candidateResume || existing.candidateResume,
            items: (items && items.length > 0) ? items : existing.items,
            totalAmount: totalAmount ?? finalAmount,
            finalAmount: finalAmount,
            type: orderType,
            appointmentDate: appointmentDate || existing.appointmentDate,
            appointmentTimeSlot: appointmentTimeSlot || existing.appointmentTimeSlot,
            doctorName: doctorName || existing.doctorName,
            tableNumber: tableNumber || existing.tableNumber,
            roomNumber: roomNumber || existing.roomNumber,
            prescriptionUrl: prescriptionUrl || existing.prescriptionUrl
          }
        }
      );
      return res.status(200).json({ success: true, message: 'Order updated in vendor dashboard successfully', data: existing });
    }

    const order = await Order.create(orderData);
    
    res.status(201).json({ success: true, message: 'Order created in vendor dashboard successfully', data: order });
  } catch (error) {
    console.error('Create Public Order Error:', error);
    res.status(500).json({ success: false, message: 'Server error creating order in vendor dashboard' });
  }
});

module.exports = router;
