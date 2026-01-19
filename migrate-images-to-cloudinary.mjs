import { v2 as cloudinary } from 'cloudinary';
import pkg from 'pg';
import https from 'https';
import http from 'http';
const { Pool } = pkg;

// Configure Cloudinary
cloudinary.config({
  cloud_name: 'dtd29j5rx',
  api_key: '566557823619379',
  api_secret: 'z9XeFxxsdN1nUUEIhJKetdykpkA'
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function uploadToCloudinary(imageUrl, productId, productTitle) {
  try {
    // Create a safe public_id from product title
    const publicId = `iwanyu-marketplace/products/${productId}-${productTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50)}`;

    console.log(`Uploading: ${productTitle}...`);
    
    const result = await cloudinary.uploader.upload(imageUrl, {
      public_id: publicId,
      folder: 'iwanyu-marketplace/products',
      resource_type: 'image',
      overwrite: true
    });

    console.log(`✅ Uploaded: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    console.error(`❌ Failed to upload ${productTitle}:`, error.message);
    return null;
  }
}

async function migrateImages() {
  try {
    // Get all products with Shopify image URLs
    const result = await pool.query(`
      SELECT id, title, image_url
      FROM products
      WHERE image_url LIKE '%shopify.com%'
      ORDER BY id
    `);

    console.log(`Found ${result.rows.length} products with Shopify images\n`);

    let successCount = 0;
    let failCount = 0;

    for (const product of result.rows) {
      const cloudinaryUrl = await uploadToCloudinary(
        product.image_url,
        product.id,
        product.title
      );

      if (cloudinaryUrl) {
        // Update database with new Cloudinary URL
        await pool.query(
          'UPDATE products SET image_url = $1 WHERE id = $2',
          [cloudinaryUrl, product.id]
        );
        successCount++;
      } else {
        failCount++;
      }

      // Rate limit: wait 500ms between uploads
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n=== MIGRATION COMPLETE ===`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`Total: ${result.rows.length}`);

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await pool.end();
  }
}

migrateImages();
