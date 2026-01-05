#!/usr/bin/env node
/**
 * Test production site for products
 */

console.log('🧪 Testing production site: https://www.iwanyu.store\n');

// Simulate browser fetch
const testUrl = 'https://www.iwanyu.store';

console.log('Fetching homepage...');
const response = await fetch(testUrl);
const html = await response.text();

console.log('✅ Site is accessible');
console.log('Status:', response.status);
console.log('Content-Type:', response.headers.get('content-type'));

// Check if it's the built version
if (html.includes('index-') && html.includes('.js')) {
  console.log('✅ Built JS bundle detected');
} else {
  console.log('⚠️  No built bundle found');
}

// Check for Supabase URL in built files
const jsMatch = html.match(/assets\/index-([^"']+)\.js/);
if (jsMatch) {
  const jsFile = jsMatch[0];
  console.log('\n📦 Fetching JS bundle:', jsFile);
  
  const jsUrl = `https://www.iwanyu.store/${jsFile}`;
  const jsResponse = await fetch(jsUrl);
  const jsContent = await jsResponse.text();
  
  // Check for Supabase URL
  if (jsContent.includes('supabase.co')) {
    console.log('✅ Supabase URL found in bundle');
    
    // Extract Supabase project ref
    const supabaseMatch = jsContent.match(/https?:\/\/([a-z0-9]+)\.supabase\.co/);
    if (supabaseMatch) {
      console.log('📍 Supabase project:', supabaseMatch[1]);
    }
  } else {
    console.log('❌ Supabase URL NOT found in bundle');
    console.log('⚠️  Environment variables may not be set in Vercel!');
  }
  
  // Check for products loading code
  if (jsContent.includes('from("products")') || jsContent.includes('.from("products")')) {
    console.log('✅ Product query code found');
  } else {
    console.log('⚠️  Product query code not found');
  }
}

console.log('\n' + '='.repeat(60));
console.log('DIAGNOSIS:');
console.log('='.repeat(60));

console.log('\nIf products are not showing, check:');
console.log('1. Vercel environment variables are set:');
console.log('   - VITE_SUPABASE_URL');
console.log('   - VITE_SUPABASE_ANON_KEY');
console.log('   - VITE_CLOUDINARY_CLOUD_NAME');
console.log('2. Redeploy after setting env vars');
console.log('3. Clear browser cache');
