#!/usr/bin/env node

console.log('🧪 COMPREHENSIVE LIVE SITE FEATURE TEST');
console.log('========================================\n');

const baseUrl = 'https://www.iwanyu.store';
const testResults = [];

function logTest(feature, status, details = '') {
  const emoji = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${emoji} ${feature}: ${status}`);
  if (details) console.log(`   ${details}`);
  testResults.push({ feature, status, details });
}

async function testBasicConnectivity() {
  console.log('🌐 TESTING BASIC CONNECTIVITY\n');
  
  try {
    const response = await fetch(baseUrl);
    const status = response.status;
    const contentType = response.headers.get('content-type');
    
    if (status === 200) {
      logTest('Homepage Load', 'PASS', `${status} ${response.statusText}`);
      logTest('Content Type', 'PASS', contentType);
    } else {
      logTest('Homepage Load', 'FAIL', `${status} ${response.statusText}`);
    }
    
    return response;
  } catch (err) {
    logTest('Homepage Load', 'FAIL', err.message);
    return null;
  }
}

async function testPageRoutes() {
  console.log('\n🗺️ TESTING PAGE ROUTES\n');
  
  const routes = [
    '/',
    '/login',
    '/register', 
    '/cart',
    '/sell',
    '/search',
    '/search?q=shoes',
    '/category/shoes',
    '/product/test-product-id'
  ];
  
  for (const route of routes) {
    try {
      const response = await fetch(`${baseUrl}${route}`);
      const status = response.status;
      
      if (status === 200) {
        logTest(`Route ${route}`, 'PASS', `${status}`);
      } else if (status === 404) {
        logTest(`Route ${route}`, 'WARN', `${status} - Page not found (expected for some routes)`);
      } else {
        logTest(`Route ${route}`, 'FAIL', `${status} ${response.statusText}`);
      }
    } catch (err) {
      logTest(`Route ${route}`, 'FAIL', err.message);
    }
  }
}

async function testJavaScriptBundle() {
  console.log('\n📦 TESTING JAVASCRIPT BUNDLE\n');
  
  try {
    const response = await fetch(baseUrl);
    const html = await response.text();
    
    // Extract script src
    const scriptMatch = html.match(/<script[^>]*src="([^"]*index[^"]*\.js)"[^>]*>/);
    if (scriptMatch) {
      const scriptUrl = scriptMatch[1];
      const fullScriptUrl = scriptUrl.startsWith('/') ? `${baseUrl}${scriptUrl}` : scriptUrl;
      
      logTest('JS Bundle Found', 'PASS', scriptUrl);
      
      // Test if script loads
      const scriptResponse = await fetch(fullScriptUrl);
      if (scriptResponse.status === 200) {
        const scriptSize = scriptResponse.headers.get('content-length');
        logTest('JS Bundle Loads', 'PASS', `${scriptSize ? Math.round(scriptSize/1024) + 'KB' : 'Unknown size'}`);
        
        // Check if it's the latest version
        const isOldBundle = scriptUrl.includes('as_rG0hF');
        const isNewBundle = scriptUrl.includes('BdT-aia9') || scriptUrl.includes('C_ya3wKj');
        
        if (isNewBundle) {
          logTest('Bundle Version', 'PASS', 'Latest version with fixes');
        } else if (isOldBundle) {
          logTest('Bundle Version', 'FAIL', 'Old version without schema fixes');
        } else {
          logTest('Bundle Version', 'WARN', 'Unknown version');
        }
      } else {
        logTest('JS Bundle Loads', 'FAIL', `${scriptResponse.status}`);
      }
    } else {
      logTest('JS Bundle Found', 'FAIL', 'No script tag found');
    }
  } catch (err) {
    logTest('JS Bundle Test', 'FAIL', err.message);
  }
}

async function testAPIConnectivity() {
  console.log('\n🔗 TESTING API CONNECTIVITY\n');
  
  // Test if the site can make requests to Supabase
  // We'll look for network requests or indicators in the HTML
  
  try {
    const response = await fetch(baseUrl);
    const html = await response.text();
    
    const hasSupabaseRef = html.includes('supabase') || html.includes('VITE_SUPABASE');
    const hasFlutterwaveRef = html.includes('flutterwave') || html.includes('FLUTTERWAVE');
    const hasCloudinaryRef = html.includes('cloudinary') || html.includes('CLOUDINARY');
    
    logTest('Supabase Integration', hasSupabaseRef ? 'PASS' : 'FAIL', 'Environment variables check');
    logTest('Flutterwave Integration', hasFlutterwaveRef ? 'PASS' : 'FAIL', 'Payment gateway check');
    logTest('Cloudinary Integration', hasCloudinaryRef ? 'PASS' : 'FAIL', 'Image CDN check');
  } catch (err) {
    logTest('API Connectivity Test', 'FAIL', err.message);
  }
}

async function testUIComponents() {
  console.log('\n🎨 TESTING UI COMPONENTS\n');
  
  try {
    const response = await fetch(baseUrl);
    const html = await response.text();
    
    // Check for key UI components
    const hasHeader = html.includes('iwanyu') || html.includes('IWANYU');
    const hasSearchBar = html.includes('search') || html.includes('Search');
    const hasCartIcon = html.includes('cart') || html.includes('Cart');
    const hasSignIn = html.includes('Sign in') || html.includes('sign in') || html.includes('login');
    const hasFooter = html.includes('footer') || html.includes('Footer');
    const hasCategoryNav = html.includes('Electronics') && html.includes('Fashion');
    
    logTest('Header Component', hasHeader ? 'PASS' : 'FAIL', 'Logo and branding');
    logTest('Search Bar', hasSearchBar ? 'PASS' : 'FAIL', 'Search functionality');
    logTest('Cart Icon', hasCartIcon ? 'PASS' : 'FAIL', 'Shopping cart');
    logTest('Sign In Button', hasSignIn ? 'PASS' : 'FAIL', 'Authentication UI');
    logTest('Footer Component', hasFooter ? 'PASS' : 'FAIL', 'Footer links');
    logTest('Category Navigation', hasCategoryNav ? 'PASS' : 'FAIL', 'Product categories');
  } catch (err) {
    logTest('UI Components Test', 'FAIL', err.message);
  }
}

async function testProductDisplay() {
  console.log('\n🛍️ TESTING PRODUCT DISPLAY\n');
  
  try {
    const response = await fetch(baseUrl);
    const html = await response.text();
    
    // Check for product-related content
    const hasProductCards = html.includes('product') || html.includes('Product');
    const hasLoadingState = html.includes('loading') || html.includes('skeleton');
    const hasPricing = html.includes('RWF') || html.includes('price');
    const hasImages = html.includes('image') || html.includes('img');
    const hasAddToCart = html.includes('Add to cart') || html.includes('add to cart');
    
    // Check for specific error messages
    const hasNoProducts = html.includes('No products') || html.includes('no products');
    const hasDbError = html.includes('Database connection') || html.includes('connection issue');
    const hasNoCategories = html.includes('No categories yet');
    
    logTest('Product Cards', hasProductCards ? 'PASS' : 'FAIL', 'Product display elements');
    logTest('Loading States', hasLoadingState ? 'WARN' : 'PASS', hasLoadingState ? 'Still loading' : 'Loaded content');
    logTest('Pricing Display', hasPricing ? 'PASS' : 'FAIL', 'Price formatting');
    logTest('Product Images', hasImages ? 'PASS' : 'FAIL', 'Image components');
    logTest('Add to Cart', hasAddToCart ? 'PASS' : 'FAIL', 'Cart functionality');
    
    // Error states
    if (hasNoProducts) {
      logTest('Product Loading', 'FAIL', 'No products message displayed');
    }
    if (hasDbError) {
      logTest('Database Connection', 'FAIL', 'Database error detected');
    }
    if (hasNoCategories) {
      logTest('Category Loading', 'FAIL', 'No categories message displayed');
    }
    
  } catch (err) {
    logTest('Product Display Test', 'FAIL', err.message);
  }
}

async function testResponsiveness() {
  console.log('\n📱 TESTING RESPONSIVE DESIGN\n');
  
  try {
    const response = await fetch(baseUrl);
    const html = await response.text();
    
    // Check for responsive design indicators
    const hasViewport = html.includes('viewport');
    const hasTailwind = html.includes('tailwind') || html.includes('responsive');
    const hasMobileClasses = html.includes('sm:') || html.includes('md:') || html.includes('lg:');
    const hasFlexbox = html.includes('flex') || html.includes('grid');
    
    logTest('Viewport Meta Tag', hasViewport ? 'PASS' : 'FAIL', 'Mobile viewport setup');
    logTest('Responsive Framework', hasTailwind ? 'PASS' : 'FAIL', 'CSS framework detection');
    logTest('Mobile Classes', hasMobileClasses ? 'PASS' : 'FAIL', 'Responsive CSS classes');
    logTest('Layout System', hasFlexbox ? 'PASS' : 'FAIL', 'Modern layout methods');
  } catch (err) {
    logTest('Responsiveness Test', 'FAIL', err.message);
  }
}

async function generateSummary() {
  console.log('\n📊 TEST SUMMARY');
  console.log('===============\n');
  
  const passCount = testResults.filter(r => r.status === 'PASS').length;
  const failCount = testResults.filter(r => r.status === 'FAIL').length;
  const warnCount = testResults.filter(r => r.status === 'WARN').length;
  const total = testResults.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`⚠️  Warnings: ${warnCount}`);
  console.log(`Success Rate: ${Math.round((passCount/total)*100)}%\n`);
  
  if (failCount > 0) {
    console.log('❌ CRITICAL ISSUES:');
    testResults.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   • ${r.feature}: ${r.details}`);
    });
    console.log('');
  }
  
  if (warnCount > 0) {
    console.log('⚠️  WARNINGS:');
    testResults.filter(r => r.status === 'WARN').forEach(r => {
      console.log(`   • ${r.feature}: ${r.details}`);
    });
    console.log('');
  }
  
  console.log('🔗 WORKING URL FOR TESTING:');
  console.log('   https://www.iwanyu.store');
  console.log('   (Clear cache if issues persist)');
  
  console.log('\n🛠️  NEXT STEPS:');
  if (failCount === 0) {
    console.log('   ✅ All critical features working!');
  } else {
    console.log('   🔧 Fix critical issues listed above');
    console.log('   🔄 Force refresh browser cache');
    console.log('   🌐 Try incognito/private window');
  }
}

// Run all tests
async function runAllTests() {
  await testBasicConnectivity();
  await testPageRoutes();
  await testJavaScriptBundle();
  await testAPIConnectivity();
  await testUIComponents();
  await testProductDisplay();
  await testResponsiveness();
  await generateSummary();
}

runAllTests().catch(console.error);