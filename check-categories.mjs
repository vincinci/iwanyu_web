#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iakxtffxaevszuouapih.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlha3h0ZmZ4YWV2c3p1b3VhcGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTgxNTIsImV4cCI6MjA4MzE5NDE1Mn0.phPO0WG3tW4n6aC23hiHR0Gi4tGQau1wuu84Vtrvh54';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Analyzing category data...\n');

try {
  const { data: products, error } = await supabase
    .from("products")
    .select("category, title")
    .order("category");

  if (error) {
    console.log('❌ Error:', error.message);
    process.exit(1);
  }

  // Group by category
  const categoryGroups = {};
  products.forEach(product => {
    const category = product.category || 'null';
    if (!categoryGroups[category]) {
      categoryGroups[category] = [];
    }
    categoryGroups[category].push(product.title);
  });

  console.log('📊 Categories found in database:');
  console.log('================================');

  Object.keys(categoryGroups).sort().forEach(category => {
    const count = categoryGroups[category].length;
    console.log(`${category}: ${count} products`);
    if (count <= 3) {
      console.log(`   Examples: ${categoryGroups[category].slice(0, 3).join(', ')}`);
    }
  });

  // Check for weird single-letter categories
  console.log('\n🚨 Checking for problematic categories:');
  const weirdCategories = Object.keys(categoryGroups).filter(cat => 
    cat.length === 1 || 
    cat.toLowerCase().includes('undefined') || 
    cat.toLowerCase().includes('null') ||
    cat.trim() === ''
  );

  if (weirdCategories.length > 0) {
    console.log('Found problematic categories:');
    weirdCategories.forEach(cat => {
      console.log(`- "${cat}": ${categoryGroups[cat].length} products`);
      console.log(`  Examples: ${categoryGroups[cat].slice(0, 2).join(', ')}`);
    });
  } else {
    console.log('✅ No obviously problematic categories found');
  }

} catch (err) {
  console.log('❌ Exception:', err.message);
}