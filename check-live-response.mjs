#!/usr/bin/env node

console.log('🌐 Testing live website response...\n');

try {
  // Test the actual live website
  const liveUrl = 'https://www.iwanyu.store';
  
  console.log(`Fetching: ${liveUrl}`);
  
  const response = await fetch(liveUrl);
  const html = await response.text();
  
  console.log('Status:', response.status);
  console.log('Content-Type:', response.headers.get('content-type'));
  
  // Check for key indicators in the HTML
  const hasReact = html.includes('react');
  const hasVite = html.includes('vite');
  const hasSupabase = html.includes('supabase') || html.includes('VITE_SUPABASE');
  const hasProducts = html.includes('products') || html.includes('Products');
  
  console.log('\n📊 HTML Analysis:');
  console.log('Contains React references:', hasReact);
  console.log('Contains Vite references:', hasVite);
  console.log('Contains Supabase references:', hasSupabase);
  console.log('Contains product references:', hasProducts);
  
  // Look for script tags
  const scriptMatches = html.match(/<script[^>]*src="[^"]*"[^>]*>/g);
  console.log('\nScript tags found:', scriptMatches?.length || 0);
  
  if (scriptMatches) {
    scriptMatches.slice(0, 3).forEach((script, i) => {
      console.log(`Script ${i + 1}:`, script);
    });
  }
  
  // Check if it's a SPA or server-rendered
  const bodyContent = html.match(/<body[^>]*>(.*?)<\/body>/s)?.[1] || '';
  const hasEmptyRoot = bodyContent.includes('<div id="root"></div>');
  const hasContentInRoot = bodyContent.includes('<div id="root">') && !hasEmptyRoot;
  
  console.log('\n🏗️ App Structure:');
  console.log('Empty root div (SPA):', hasEmptyRoot);
  console.log('Content in root (SSR):', hasContentInRoot);
  
  if (hasEmptyRoot) {
    console.log('✅ This is a client-side React app - JavaScript needs to run to load content');
  }
  
  // Test if the domain is correctly set up
  const finalUrl = response.url;
  console.log('\nFinal URL after redirects:', finalUrl);
  
  if (finalUrl !== liveUrl) {
    console.log('⚠️ URL redirect detected');
  }

  // Try the latest deployment URL directly
  console.log('\n🆕 Testing latest deployment...');
  const latestUrl = 'https://iwanyu-marketplace-aa5p3txng-davy-00s-projects.vercel.app';
  const latestResponse = await fetch(latestUrl);
  console.log('Latest deployment status:', latestResponse.status);
  console.log('Latest deployment final URL:', latestResponse.url);

  console.log('\n💡 TROUBLESHOOTING STEPS:');
  console.log('1. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)');
  console.log('2. Clear browser cache completely');
  console.log('3. Try incognito/private window');
  console.log('4. Check browser console for JavaScript errors');
  console.log('5. Verify network requests are completing successfully');

} catch (error) {
  console.log('❌ Error:', error.message);
}