#!/usr/bin/env node

console.log('🔍 Testing multiple deployment URLs to find working version...\n');

const deployments = [
  'https://iwanyu-marketplace-91uvma9m4-davy-00s-projects.vercel.app', // Latest
  'https://iwanyu-marketplace-aa5p3txng-davy-00s-projects.vercel.app',
  'https://iwanyu-marketplace-myd7yvdxn-davy-00s-projects.vercel.app',
  'https://iwanyu-marketplace-215ntxcfk-davy-00s-projects.vercel.app',
  'https://iwanyu-marketplace-nrp5l33a3-davy-00s-projects.vercel.app',
  'https://iwanyu-marketplace-8b6nyxuk9-davy-00s-projects.vercel.app'
];

for (const url of deployments) {
  try {
    console.log(`Testing: ${url}`);
    const response = await fetch(url);
    console.log(`Status: ${response.status}`);
    
    if (response.status === 200) {
      const html = await response.text();
      const hasModernBundle = html.includes('index-BdT-aia9.js') || html.includes('index-C_ya3wKj.js');
      const hasOldBundle = html.includes('index-as_rG0hF.js');
      
      console.log(`  Modern bundle (with fixes): ${hasModernBundle}`);
      console.log(`  Old bundle (broken): ${hasOldBundle}`);
      
      if (hasModernBundle) {
        console.log(`✅ FOUND WORKING VERSION WITH FIXES: ${url}`);
        break;
      } else {
        console.log(`⚠️  Working but old version`);
      }
    } else {
      console.log(`❌ ${response.status} ${response.statusText}`);
    }
    console.log('');
  } catch (err) {
    console.log(`❌ Error: ${err.message}\n`);
  }
}