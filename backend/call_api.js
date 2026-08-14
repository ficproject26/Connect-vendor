const http = require('http');

function post(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const postData = JSON.stringify(data);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname,
      method: 'GET',
      headers: headers
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    console.log('Logging in...');
    const loginRes = await post('http://localhost:8002/api/auth/login', {
      email: 'dhanushiyasri@gmail.com',
      password: 'vendor123'
    });

    if (loginRes.status !== 200) {
      console.error('Login failed:', loginRes.data);
      return;
    }

    const { token, user } = loginRes.data;
    console.log('Login success!');
    console.log('Logged in user ID:', user._id);
    console.log('Logged in user businessName:', user.businessName);
    console.log('Logged in user subcategory:', user.subcategory);
    console.log('Logged in user businesses:', JSON.stringify(user.businesses, null, 2));

    // Try fetching products without active business header
    console.log('\nFetching products (default/primary)...');
    let productsRes = await get('http://localhost:8002/api/vendor/products', {
      'Authorization': `Bearer ${token}`
    });
    console.log(`Success! Found ${productsRes.data.data ? productsRes.data.data.length : 0} products.`);
    if (productsRes.data.data) {
      productsRes.data.data.forEach((p, idx) => {
        console.log(`${idx + 1}. Name: ${p.name} || Category: ${p.category} || VendorId: ${p.vendorId}`);
      });
    }

    // Try fetching products with active business header if any sub-businesses exist
    if (user.businesses && user.businesses.length > 0) {
      for (const biz of user.businesses) {
        console.log(`\nFetching products for business: ${biz.businessName} (ID: ${biz._id}, Subcategory: ${biz.subcategory})...`);
        let bizRes = await get('http://localhost:8002/api/vendor/products', {
          'Authorization': `Bearer ${token}`,
          'x-business-id': biz._id
        });
        console.log(`Success! Found ${bizRes.data.data ? bizRes.data.data.length : 0} products.`);
        if (bizRes.data.data) {
          bizRes.data.data.forEach((p, idx) => {
            console.log(`  ${idx + 1}. Name: ${p.name} || Category: ${p.category} || VendorId: ${p.vendorId}`);
          });
        }
      }
    }

  } catch (err) {
    console.error('API call failed:', err.message);
  }
}

main();
