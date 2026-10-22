const http = require('http');
const assert = require('assert');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '..', '.env') });

const { app } = require('../server');
const { User, Product } = require('../models/Schemas');

let server;
let baseUrl;

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_9999';

// Helper to make HTTP requests
const request = ({ method, path, headers = {}, body = null }) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers }
    };

    let postData;
    if (body) {
      postData = JSON.stringify(body);
      options.headers['Content-Type'] = 'application/json';
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
};

const runAuditTests = async () => {
  console.log('================================================================');
  console.log('🔒 STARTING COMMON AUTH & STRICT ROLE ISOLATION SECURITY AUDIT');
  console.log('================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  const test = async (name, fn) => {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passedCount++;
    } catch (err) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Error: ${err.message}`);
      failedCount++;
    }
  };

  // Setup ephemeral server on a random port
  await new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`Test server running at ${baseUrl}\n`);
      resolve();
    });
  });

  const testPassword = 'TestPassword@123';
  const hashedPw = await bcrypt.hash(testPassword, 10);

  // Clean up any existing test records
  const testEmails = [
    'audit_pending_vendor@example.com',
    'audit_approved_vendor@example.com',
    'audit_suspended_vendor@example.com',
    'audit_customer@example.com',
    'audit_manager@example.com',
    'audit_admin@example.com',
    'audit_reg_vendor@example.com'
  ];

  await User.deleteMany({ email: { $in: testEmails } });
  await Product.deleteMany({ name: /^Audit Test Product/ });

  // 1. Create test users in DB
  const pendingVendor = await User.create({
    name: 'Pending Vendor Corp',
    email: 'audit_pending_vendor@example.com',
    password: hashedPw,
    role: 'Vendor',
    status: 'Pending',
    isApproved: false,
    businessName: 'Pending Vendor Business'
  });

  const approvedVendor = await User.create({
    name: 'Approved Vendor Ltd',
    email: 'audit_approved_vendor@example.com',
    password: hashedPw,
    role: 'Vendor',
    status: 'Approved',
    isApproved: true,
    businessName: 'Approved Vendor Business',
    businesses: [{
      _id: 'biz_approved_001',
      vendorType: 'Products',
      category: 'Electronics',
      subcategory: 'Mobile Phones',
      businessName: 'Approved Vendor Business',
      status: 'active',
      isActive: true
    }],
    primaryBusinessId: 'biz_approved_001'
  });

  const suspendedVendor = await User.create({
    name: 'Suspended Vendor',
    email: 'audit_suspended_vendor@example.com',
    password: hashedPw,
    role: 'Vendor',
    status: 'Suspended',
    isApproved: false,
    businessName: 'Suspended Vendor Business'
  });

  const customerUser = await User.create({
    name: 'Regular Customer',
    email: 'audit_customer@example.com',
    password: hashedPw,
    role: 'Member',
    status: 'Active',
    isApproved: true
  });

  const managerUser = await User.create({
    name: 'Regional Manager',
    email: 'audit_manager@example.com',
    password: hashedPw,
    role: 'Manager',
    status: 'Active',
    isApproved: true
  });

  const adminUser = await User.create({
    name: 'Security Admin',
    email: 'audit_admin@example.com',
    password: hashedPw,
    role: 'Admin',
    status: 'Active',
    isApproved: true
  });

  // Tokens
  const approvedVendorToken = jwt.sign(
    { id: approvedVendor._id.toString(), email: approvedVendor.email, role: 'Vendor', isApproved: true },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const pendingVendorToken = jwt.sign(
    { id: pendingVendor._id.toString(), email: pendingVendor.email, role: 'Vendor', isApproved: false, tokenType: 'onboarding' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const customerToken = jwt.sign(
    { id: customerUser._id.toString(), email: customerUser.email, role: 'Member' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const adminToken = jwt.sign(
    { id: adminUser._id.toString(), email: adminUser.email, role: 'Admin' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  // =========================================================================
  // SCENARIO 1: Unauthenticated access denied
  // =========================================================================
  await test('Scenario 1: Unauthenticated request cannot access protected vendor dashboard or API', async () => {
    const res = await request({ method: 'GET', path: '/api/vendor/analytics' });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
  });

  // =========================================================================
  // SCENARIO 2: Pending vendor account cannot access protected dashboard data
  // =========================================================================
  await test('Scenario 2: Pending account cannot access protected dashboard data', async () => {
    const res = await request({
      method: 'GET',
      path: '/api/vendor/analytics',
      headers: { Authorization: `Bearer ${pendingVendorToken}` }
    });
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
    assert.strictEqual(res.body.isPendingApproval, true);
  });

  // =========================================================================
  // SCENARIO 3: Unapproved user cannot obtain an authorized dashboard session
  // =========================================================================
  await test('Scenario 3: Unapproved vendor login receives only scoped onboarding session and is barred from dashboard', async () => {
    const res = await request({
      method: 'POST',
      path: '/api/auth/login-vendor',
      body: { email: 'audit_pending_vendor@example.com', password: testPassword }
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.strictEqual(res.body.isPendingApproval, true);
    assert.strictEqual(res.body.user.isApproved, false);

    // Verify the returned token cannot access dashboard
    const dashboardCheck = await request({
      method: 'GET',
      path: '/api/vendor/products',
      headers: { Authorization: `Bearer ${res.body.token}` }
    });
    assert.strictEqual(dashboardCheck.status, 403, `Expected 403, got ${dashboardCheck.status}`);
    assert.strictEqual(dashboardCheck.body.isPendingApproval, true);
  });

  // =========================================================================
  // SCENARIO 4: Approved vendor with correct role can access authorized routes
  // =========================================================================
  await test('Scenario 4: Approved user with correct role can access authorized routes', async () => {
    const res = await request({
      method: 'GET',
      path: '/api/vendor/products',
      headers: { Authorization: `Bearer ${approvedVendorToken}` }
    });
    assert.strictEqual(res.status, 200, `Expected 200, got ${res.status}`);
    assert.strictEqual(res.body.success, true);
  });

  // =========================================================================
  // SCENARIO 5: Customer (Member) cannot access vendor-only or admin resources
  // =========================================================================
  await test('Scenario 5: Customer cannot access vendor-only or administrative resources', async () => {
    const vendorRes = await request({
      method: 'GET',
      path: '/api/vendor/products',
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(vendorRes.status, 403, `Expected 403 on vendor route, got ${vendorRes.status}`);

    const adminRes = await request({
      method: 'GET',
      path: '/api/admin/stats',
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert.strictEqual(adminRes.status, 403, `Expected 403 on admin route, got ${adminRes.status}`);
  });

  // =========================================================================
  // SCENARIO 6: Vendor cannot access customer-only or administrative resources
  // =========================================================================
  await test('Scenario 6: Vendor cannot access customer-only or administrative resources', async () => {
    const memberRes = await request({
      method: 'GET',
      path: '/api/member/discounts',
      headers: { Authorization: `Bearer ${approvedVendorToken}` }
    });
    assert.strictEqual(memberRes.status, 403, `Expected 403 on member-only route, got ${memberRes.status}`);

    const adminRes = await request({
      method: 'GET',
      path: '/api/admin/stats',
      headers: { Authorization: `Bearer ${approvedVendorToken}` }
    });
    assert.strictEqual(adminRes.status, 403, `Expected 403 on admin route, got ${adminRes.status}`);
  });

  // =========================================================================
  // SCENARIO 7: Manager / Agent cannot access vendor portal
  // =========================================================================
  await test('Scenario 7: Manager cannot access vendor portal unless explicitly authorized', async () => {
    const loginRes = await request({
      method: 'POST',
      path: '/api/auth/login-vendor',
      body: { email: 'audit_manager@example.com', password: testPassword }
    });
    assert.strictEqual(loginRes.status, 401, `Expected 401 for manager in vendor portal, got ${loginRes.status}`);
    assert.strictEqual(loginRes.body.success, false);
  });

  // =========================================================================
  // SCENARIO 8: Valid email & password of Member cannot log into vendor portal
  // =========================================================================
  await test('Scenario 8: Valid email and password for Member cannot bypass role restrictions on vendor login', async () => {
    const res = await request({
      method: 'POST',
      path: '/api/auth/login-vendor',
      body: { email: 'audit_customer@example.com', password: testPassword }
    });
    assert.strictEqual(res.status, 401, `Expected 401 role mismatch, got ${res.status}`);
    assert.strictEqual(res.body.success, false);
  });

  // =========================================================================
  // SCENARIO 9: Modifying frontend role values cannot bypass server authorization
  // =========================================================================
  await test('Scenario 9: Modifying local storage / token claims cannot grant unauthorized access (Backend DB authoritative)', async () => {
    // Attacker crafts a token claiming role: 'Vendor' and isApproved: true, but id points to customerUser
    const forgedToken = jwt.sign(
      { id: customerUser._id.toString(), email: customerUser.email, role: 'Vendor', isApproved: true },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request({
      method: 'GET',
      path: '/api/vendor/products',
      headers: { Authorization: `Bearer ${forgedToken}` }
    });
    // protect detects role claim mismatch with database (role: Member) or authorize rejects
    assert.ok(res.status === 401 || res.status === 403, `Expected 401 or 403, got ${res.status}`);
  });

  // =========================================================================
  // SCENARIO 10: Manually navigating directly to protected URL does not bypass authorization
  // =========================================================================
  await test('Scenario 10: Manually navigating to protected URLs does not bypass backend authorization', async () => {
    const unauthRes = await request({ method: 'GET', path: '/api/vendor/orders' });
    assert.strictEqual(unauthRes.status, 401, `Expected 401, got ${unauthRes.status}`);

    const pendingRes = await request({
      method: 'GET',
      path: '/api/vendor/orders',
      headers: { Authorization: `Bearer ${pendingVendorToken}` }
    });
    assert.strictEqual(pendingRes.status, 403, `Expected 403, got ${pendingRes.status}`);
  });

  // =========================================================================
  // SCENARIO 11: Direct backend requests without authorization are denied
  // =========================================================================
  await test('Scenario 11: Sending requests directly to backend endpoints does not bypass authorization', async () => {
    const res = await request({ method: 'GET', path: '/api/vendor/customers' });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });

  // =========================================================================
  // SCENARIO 12: User cannot change role or approval status through API manipulation
  // =========================================================================
  await test('Scenario 12: A user cannot change their role or approval status through a manipulated API request', async () => {
    // Attempt privilege escalation during registration
    const regRes = await request({
      method: 'POST',
      path: '/api/auth/register-vendor',
      body: {
        email: 'audit_reg_vendor@example.com',
        password: 'Password@123',
        role: 'Admin',
        status: 'Approved',
        isApproved: true,
        vendorType: 'Products',
        category: 'Electronics',
        subcategory: 'Phones',
        businessName: 'Injected Vendor',
        contactPerson: 'Hacker',
        address: '123 Test Road',
        mobileNumber: '9876543210',
        gstStatus: 'Non-GST Declared',
        panNo: 'ABCDE1234F',
        msmeStatus: 'Non-MSME',
        accountHolderName: 'Hacker',
        accountNo: '123456789012345678',
        ifscCode: 'HDFC0001234'
      }
    });

    assert.strictEqual(regRes.status, 201, `Expected 201, got ${regRes.status}`);
    const registeredUser = await User.findOne({ email: 'audit_reg_vendor@example.com' });
    assert.strictEqual(registeredUser.role, 'Vendor', 'Role must remain Vendor despite payload injection');
    assert.strictEqual(registeredUser.status, 'Pending', 'Status must remain Pending despite payload injection');
    assert.strictEqual(registeredUser.isApproved, false, 'isApproved must remain false');
  });

  // =========================================================================
  // SCENARIO 13: Suspended account loses protected access immediately
  // =========================================================================
  await test('Scenario 13: A suspended account loses protected access immediately', async () => {
    const suspendedToken = jwt.sign(
      { id: suspendedVendor._id.toString(), email: suspendedVendor.email, role: 'Vendor' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request({
      method: 'GET',
      path: '/api/vendor/products',
      headers: { Authorization: `Bearer ${suspendedToken}` }
    });
    assert.strictEqual(res.status, 403, `Expected 403, got ${res.status}`);
    assert.strictEqual(res.body.isTerminated, true);
  });

  // =========================================================================
  // SCENARIO 14: Revoked or expired session is denied
  // =========================================================================
  await test('Scenario 14: Revoked or expired session is denied', async () => {
    const expiredToken = jwt.sign(
      { id: approvedVendor._id.toString(), email: approvedVendor.email, role: 'Vendor' },
      JWT_SECRET,
      { expiresIn: '-1s' } // Expired 1 second ago
    );

    const res = await request({
      method: 'GET',
      path: '/api/vendor/products',
      headers: { Authorization: `Bearer ${expiredToken}` }
    });
    assert.strictEqual(res.status, 401, `Expected 401, got ${res.status}`);
  });

  // =========================================================================
  // SCENARIO 15: Resource ownership restrictions remain enforced
  // =========================================================================
  await test('Scenario 15: Resource ownership restrictions are strictly enforced', async () => {
    // Create product owned by approved vendor
    const victimProduct = await Product.create({
      name: 'Audit Test Product 1',
      price: 999,
      category: 'Electronics',
      vendorId: approvedVendor._id.toString()
    });

    // Hacker vendor
    const otherVendor = await User.create({
      name: 'Other Vendor',
      email: 'audit_other_vendor@example.com',
      password: hashedPw,
      role: 'Vendor',
      status: 'Approved',
      isApproved: true,
      businessName: 'Other Vendor Business'
    });

    const otherVendorToken = jwt.sign(
      { id: otherVendor._id.toString(), email: otherVendor.email, role: 'Vendor', isApproved: true },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Other vendor attempts to delete victim's product
    const deleteRes = await request({
      method: 'DELETE',
      path: `/api/vendor/products/${victimProduct._id}`,
      headers: { Authorization: `Bearer ${otherVendorToken}` }
    });

    assert.strictEqual(deleteRes.status, 404, `Expected 404 unauthorized access, got ${deleteRes.status}`);

    // Clean up
    await Product.findByIdAndDelete(victimProduct._id);
    await User.findByIdAndDelete(otherVendor._id);
  });

  // =========================================================================
  // SCENARIO 16: Legitimate onboarding status inspection and approved workflows continue working
  // =========================================================================
  await test('Scenario 16: Legitimate onboarding status endpoint is accessible to pending vendors, while admin approval transitions work', async () => {
    // 1. Pending vendor CAN check onboarding status
    const statusRes = await request({
      method: 'GET',
      path: '/api/vendor/onboarding-status',
      headers: { Authorization: `Bearer ${pendingVendorToken}` }
    });
    assert.strictEqual(statusRes.status, 200, `Expected 200 for onboarding status, got ${statusRes.status}`);
    assert.strictEqual(statusRes.body.success, true);
    assert.ok(statusRes.body.onboarding, 'Must contain onboarding details');

    // 2. Admin approves vendor
    const approveRes = await request({
      method: 'PUT',
      path: `/api/admin/vendors/${pendingVendor._id}/approve`,
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(approveRes.status, 200, `Expected 200 for admin approval, got ${approveRes.status}`);

    // Verify vendor in DB is now Approved
    const updatedPendingVendor = await User.findById(pendingVendor._id);
    assert.strictEqual(updatedPendingVendor.status, 'Approved');
    assert.strictEqual(updatedPendingVendor.isApproved, true);
  });

  // Clean up test data
  await User.deleteMany({ email: { $in: [...testEmails, 'audit_other_vendor@example.com'] } });
  await Product.deleteMany({ name: /^Audit Test Product/ });

  // Close server
  await new Promise((resolve) => server.close(resolve));

  console.log('\n================================================================');
  console.log(`AUDIT RESULTS: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
};

runAuditTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
