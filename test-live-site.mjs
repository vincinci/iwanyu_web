#!/usr/bin/env node
/**
 * Live Site Functionality Test
 * Tests actual production deployment
 */

console.log('🧪 TESTING LIVE SITE FUNCTIONALITY\n');
console.log('Testing URL: https://www.iwanyu.store\n');

const tests = [
  {
    name: 'Homepage loads',
    url: 'https://www.iwanyu.store',
    expected: 'Should return 200 OK'
  },
  {
    name: 'Login page loads',
    url: 'https://www.iwanyu.store/login',
    expected: 'Should return 200 OK'
  },
  {
    name: 'Cart page loads',
    url: 'https://www.iwanyu.store/cart',
    expected: 'Should return 200 OK'
  },
  {
    name: 'Sell page loads',
    url: 'https://www.iwanyu.store/sell',
    expected: 'Should return 200 OK'
  },
  {
    name: 'Search page loads',
    url: 'https://www.iwanyu.store/search',
    expected: 'Should return 200 OK'
  }
];

async function testUrl(test) {
  try {
    const response = await fetch(test.url);
    const status = response.status;
    const ok = response.ok;
    
    if (ok) {
      console.log(`✅ ${test.name}`);
      console.log(`   URL: ${test.url}`);
      console.log(`   Status: ${status}\n`);
      return true;
    } else {
      console.log(`❌ ${test.name}`);
      console.log(`   URL: ${test.url}`);
      console.log(`   Status: ${status}`);
      console.log(`   Expected: ${test.expected}\n`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${test.name}`);
    console.log(`   URL: ${test.url}`);
    console.log(`   Error: ${error.message}\n`);
    return false;
  }
}

async function runTests() {
  const results = [];
  
  for (const test of tests) {
    const result = await testUrl(test);
    results.push(result);
  }
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('═'.repeat(60));
  console.log(`TEST RESULTS: ${passed}/${total} passed`);
  console.log('═'.repeat(60));
  
  if (passed === total) {
    console.log('\n✅ ALL ROUTES ARE ACCESSIBLE!\n');
    console.log('🎯 MANUAL TESTING CHECKLIST:\n');
    console.log('1. Visit https://www.iwanyu.store');
    console.log('2. Check if products load (open console, look for logs)');
    console.log('3. Click on a product card - should navigate to product page');
    console.log('4. Click "Sign in" - should navigate to login page');
    console.log('5. Click cart icon - should navigate to cart page');
    console.log('6. Type search query and click Search - should navigate to search page');
    console.log('7. Hover over product and click "Add to Cart" - should show toast');
    console.log('8. Click "Become a Vendor" - should navigate to sell page\n');
  } else {
    console.log('\n❌ SOME ROUTES FAILED!\n');
    console.log('Check the errors above for details.\n');
  }
}

runTests().catch(console.error);
