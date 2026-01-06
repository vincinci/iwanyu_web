#!/usr/bin/env node

// Simulate the exact logic from Index.tsx to debug category filtering

const CATEGORIES = [
  { id: "electronics", name: "Electronics" },
  { id: "phones", name: "Phones" },
  { id: "computers", name: "Computers" },
  { id: "laptops", name: "Laptops" },
  { id: "kitchen", name: "Kitchen" },
  { id: "home", name: "Home" },
  { id: "fashion", name: "Fashion" },
  { id: "shoes", name: "Shoes" },
  { id: "bags", name: "Bags" },
  { id: "jewelry", name: "Jewelry" },
  { id: "beauty", name: "Beauty" },
  { id: "health", name: "Health" },
  { id: "sports", name: "Sports" },
  { id: "toys", name: "Toys" },
  { id: "books", name: "Books" },
  { id: "gaming", name: "Gaming" },
  { id: "other", name: "Other" },
];

// Sample products from database
const sampleProducts = [
  { category: "Electronics", title: "Test" },
  { category: "Fashion", title: "Dress 1" },
  { category: "Home", title: "Wallpapers" },
  { category: "Jewelry", title: "Ring 1" },
  { category: "Laptops", title: "Laptop stand" },
  { category: "Other", title: "Random item" },
  { category: "Shoes", title: "Sneakers" },
  { category: "Sports", title: "Ball" },
];

function normalizeCategoryName(raw) {
  return raw; // Simple version for testing
}

console.log('🧪 Simulating Index.tsx category filtering...\n');

// This is the exact logic from Index.tsx
const productsByCategory = CATEGORIES.map(category => {
  const categoryProducts = sampleProducts.filter(product => {
    const normalizedProductCategory = normalizeCategoryName(product.category);
    return normalizedProductCategory === category.name;
  });
  return {
    ...category,
    products: categoryProducts,
    count: categoryProducts.length
  };
}).filter(cat => cat.count > 0);

console.log('📊 Categories that would be rendered:');
productsByCategory.forEach(cat => {
  console.log(`${cat.name}: ${cat.count} products`);
  if (cat.products.length > 0) {
    console.log(`   Products: ${cat.products.map(p => p.title).join(', ')}`);
  }
});

console.log('\n🚨 Empty categories (should be filtered out):');
const emptyCategories = CATEGORIES.map(category => {
  const categoryProducts = sampleProducts.filter(product => {
    const normalizedProductCategory = normalizeCategoryName(product.category);
    return normalizedProductCategory === category.name;
  });
  return {
    ...category,
    products: categoryProducts,
    count: categoryProducts.length
  };
}).filter(cat => cat.count === 0);

emptyCategories.forEach(cat => {
  console.log(`${cat.name}: ${cat.count} products (SHOULD NOT RENDER)`);
});

if (emptyCategories.length === 0) {
  console.log('✅ No empty categories found');
}