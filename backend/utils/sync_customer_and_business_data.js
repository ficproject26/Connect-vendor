const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb+srv://Connect-app:Connect123@cluster0.fzj1k5l.mongodb.net/?appName=Cluster0';

async function run() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  console.log('=== 1. Ensuring Canonical Customer Profiles ===');
  // 1. Swetha (Canonical FIC-CUST-774974 as specified in prompt)
  const existingSwetha = await db.collection('customers').findOne({
    $or: [
      { customerId: 'FIC-CUST-774974' },
      { name: /^swetha/i }
    ]
  });

  if (!existingSwetha) {
    console.log('Creating canonical customer profile for Swetha...');
    await db.collection('customers').insertOne({
      id: 'cust_swetha_774974',
      registrationId: 'FIC-CUST-774974',
      customerId: 'FIC-CUST-774974',
      name: 'SWETHA J',
      email: 'swetha@gmail.com',
      phone: '9876543212',
      role: 'customer',
      status: 'Active',
      isActive: true,
      address: '4 corner, Krishnagiri, Krishnagiri, Tamil Nadu - 641666',
      city: 'Krishnagiri',
      pincode: '641666',
      createdAt: new Date()
    });
  } else {
    console.log('Updating canonical customer profile for Swetha...');
    await db.collection('customers').updateOne(
      { _id: existingSwetha._id },
      {
        $set: {
          customerId: 'FIC-CUST-774974',
          registrationId: 'FIC-CUST-774974',
          name: 'SWETHA J'
        }
      }
    );
  }

  // 2. Sri Bhavani M (Canonical FIC-CUST-214155)
  const existingSri = await db.collection('customers').findOne({
    $or: [
      { customerId: 'FIC-CUST-214155' },
      { name: /^sri bhavani/i }
    ]
  });

  if (!existingSri) {
    console.log('Creating canonical customer profile for Sri Bhavani M...');
    await db.collection('customers').insertOne({
      id: 'cust_sri_214155',
      registrationId: 'FIC-CUST-214155',
      customerId: 'FIC-CUST-214155',
      name: 'Sri Bhavani M',
      email: 'sri@gmail.com',
      phone: '9600688494',
      role: 'customer',
      status: 'Active',
      isActive: true,
      address: '2nd street, gandhipuram, coimbatore, Tamil Nadu - 624007',
      city: 'Coimbatore',
      pincode: '624007',
      createdAt: new Date()
    });
  }

  console.log('=== 2. Syncing Orders to Canonical Customer IDs in Database ===');
  const allCustomers = await db.collection('customers').find({}).toArray();
  const orders = await db.collection('orders').find({}).toArray();

  let updatedOrdersCount = 0;
  for (const order of orders) {
    const oName = (order.memberName || order.customer_name || order.candidateName || '').trim();
    const oNameClean = oName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const oPhone = (order.customer_phone || order.phone || order.candidatePhone || '').toString().replace(/[^0-9]/g, '');
    const oEmail = (order.candidateEmail || order.customer_email || '').trim().toLowerCase();

    let canonicalId = null;

    if (oNameClean === 'swetha' || oNameClean === 'swethaj') {
      canonicalId = 'FIC-CUST-774974';
    } else if (oNameClean === 'sri' || oNameClean === 'sribhavanim') {
      canonicalId = 'FIC-CUST-214155';
    } else if (oNameClean === 'connectmember') {
      canonicalId = 'FIC-CUST-462259';
    } else {
      const match = allCustomers.find(c => {
        const cPhone = (c.phone || '').toString().replace(/[^0-9]/g, '');
        const cEmail = (c.email || '').trim().toLowerCase();
        const cNameClean = (c.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        if (oPhone && cPhone && (oPhone.endsWith(cPhone) || cPhone.endsWith(oPhone))) return true;
        if (oEmail && cEmail && oEmail === cEmail && oEmail.includes('@')) return true;
        if (oNameClean && cNameClean && oNameClean === cNameClean && oNameClean !== 'customer') return true;
        return false;
      });

      if (match) {
        canonicalId = match.customerId || match.registrationId;
      }
    }

    if (canonicalId && (order.customerId !== canonicalId || order.customerDisplayId !== canonicalId)) {
      await db.collection('orders').updateOne(
        { _id: order._id },
        {
          $set: {
            customerId: canonicalId,
            customerDisplayId: canonicalId
          }
        }
      );
      updatedOrdersCount++;
    }
  }
  console.log(`Updated ${updatedOrdersCount} orders with canonical Customer ID in MongoDB.`);

  console.log('=== 3. Cleaning Default Dummy City/State on Vendors in Database ===');
  // Update vendor SRI (Dharmapuri, Tamil Nadu)
  const sriVendor = await db.collection('users').findOne({
    $or: [
      { _id: '6a8e8efd5668db4807b03795' },
      { email: 'sribha@gmail.com' }
    ]
  });
  if (sriVendor) {
    console.log('Updating vendor SRI city and state to Dharmapuri, Tamil Nadu...');
    await db.collection('users').updateOne(
      { _id: sriVendor._id },
      {
        $set: {
          city: 'Dharmapuri',
          state: 'Tamil Nadu'
        }
      }
    );
  }

  // Clean placeholder 'City' and 'State' on all vendors
  const placeholderVendors = await db.collection('users').find({
    role: 'Vendor',
    $or: [{ city: 'City' }, { state: 'State' }]
  }).toArray();

  for (const v of placeholderVendors) {
    const updateFields = {};
    if (v.city === 'City') {
      if (/dharmapuri/i.test(v.address || '')) updateFields.city = 'Dharmapuri';
      else if (/bengaluru|bangalore/i.test(v.address || '')) updateFields.city = 'Bangalore';
      else if (/tirupur/i.test(v.address || '')) updateFields.city = 'Tirupur';
      else if (/salem/i.test(v.address || '')) updateFields.city = 'Salem';
      else updateFields.city = '';
    }
    if (v.state === 'State') {
      if (/tamil nadu|tamilnadu|dharmapuri|tirupur|salem/i.test(v.address || '')) updateFields.state = 'Tamil Nadu';
      else if (/karnataka|bangalore|bengaluru/i.test(v.address || '')) updateFields.state = 'Karnataka';
      else updateFields.state = '';
    }
    if (Object.keys(updateFields).length > 0) {
      console.log(`Cleaning placeholder for vendor ${v.name || v._id}:`, updateFields);
      await db.collection('users').updateOne({ _id: v._id }, { $set: updateFields });
    }
  }

  console.log('Sync complete!');
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('Error running sync script:', err);
  process.exit(1);
});
