#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

// Use production environment variables (from .env.production.local)
const supabaseUrl = 'https://iakxtffxaevszuouapih.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlha3h0ZmZ4YWV2c3p1b3VhcGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTgxNTIsImV4cCI6MjA4MzE5NDE1Mn0.phPO0WG3tW4n6aC23hiHR0Gi4tGQau1wuu84Vtrvh54';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Testing production database connection...\n');

try {
  // Test vendors query exactly as used in marketplace.tsx
  console.log('1. Testing vendors query (production schema)...');
  const { data: vendorRows, error: vendorsErr } = await supabase
    .from("vendors")
    .select("id, name, location, verified, owner_user_id, status")
    .order("created_at", { ascending: false });

  if (vendorsErr) {
    console.log('❌ Vendors error:', vendorsErr.message);
    console.log('Full error:', vendorsErr);
  } else {
    console.log(`✅ Vendors loaded: ${vendorRows?.length || 0}`);
    if (vendorRows && vendorRows.length > 0) {
      console.log('Sample vendor schema:', Object.keys(vendorRows[0]));
      console.log('Sample vendor data:', vendorRows[0]);
    }
  }

  // Test products query
  console.log('\n2. Testing products query...');
  const { data: productRows, error: productsErr } = await supabase
    .from("products")
    .select(
      "id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage"
    )
    .order("created_at", { ascending: false });

  if (productsErr) {
    console.log('❌ Products error:', productsErr.message);
    console.log('Full error:', productsErr);
  } else {
    console.log(`✅ Products loaded: ${productRows?.length || 0}`);
    if (productRows && productRows.length > 0) {
      console.log('Sample product:', {
        title: productRows[0].title,
        category: productRows[0].category,
        price: productRows[0].price_rwf
      });
    }
  }

  // Test the exact same logic as in Index.tsx
  console.log('\n3. Testing category grouping logic...');
  const CATEGORIES = [
    { id: "electronics", name: "Electronics" },
    { id: "fashion", name: "Fashion" },
    { id: "home", name: "Home" },
    { id: "jewelry", name: "Jewelry" },
    { id: "laptops", name: "Laptops" },
    { id: "shoes", name: "Shoes" },
    { id: "sports", name: "Sports" },
    { id: "other", name: "Other" }
  ];

  function normalizeCategoryName(raw) {
    return raw; // Simple version
  }

  if (productRows && !productsErr) {
    const productsByCategory = CATEGORIES.map(category => {
      const categoryProducts = productRows.filter(product => {
        const normalizedProductCategory = normalizeCategoryName(product.category);
        return normalizedProductCategory === category.name;
      });
      return {
        ...category,
        products: categoryProducts,
        count: categoryProducts.length
      };
    }).filter(cat => cat.count > 0);

    console.log('Categories that would render:');
    productsByCategory.forEach(cat => {
      console.log(`  ${cat.name}: ${cat.count} products`);
    });

    const emptyCategories = CATEGORIES.map(category => {
      const categoryProducts = productRows.filter(product => {
        const normalizedProductCategory = normalizeCategoryName(product.category);
        return normalizedProductCategory === category.name;
      });
      return {
        ...category,
        count: categoryProducts.length
      };
    }).filter(cat => cat.count === 0);

    console.log('\nEmpty categories (should not render):');
    emptyCategories.forEach(cat => {
      console.log(`  ${cat.name}: ${cat.count} products`);
    });
  }

  // Summary
  console.log('\n📊 PRODUCTION DIAGNOSIS:');
  console.log('=======================');
  if (vendorsErr) {
    console.log('❌ Vendors failing - schema issue');
  } else {
    console.log('✅ Vendors working');
  }
  
  if (productsErr) {
    console.log('❌ Products failing');
  } else {
    console.log('✅ Products working');
  }

  if (vendorsErr || productsErr) {
    console.log('\n🚨 PRODUCTION ISSUE DETECTED');
    console.log('The same database queries that work locally are failing in production');
  } else {
    console.log('\n🎯 DATABASE WORKING');
    console.log('The issue might be in the React app or environment variables');
  }

} catch (error) {
  console.log('\n❌ Exception:', error.message);
}