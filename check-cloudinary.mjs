import { v2 as cloudinary } from 'cloudinary';
import pkg from 'pg';
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

async function checkImages() {
  try {
    // Get sample products with images from database
    const result = await pool.query(`
      SELECT id, title, image_url
      FROM products
      WHERE image_url IS NOT NULL
      LIMIT 10
    `);

    console.log('=== DATABASE IMAGES ===');
    for (const product of result.rows) {
      console.log(`\nProduct: ${product.title}`);
      console.log(`Image URL: ${product.image_url}`);
    }

    // List resources in Cloudinary
    console.log('\n\n=== CLOUDINARY RESOURCES ===');
    const resources = await cloudinary.api.resources({
      type: 'upload',
      max_results: 20
    });

    console.log(`Total resources in Cloudinary: ${resources.resources.length}`);
    resources.resources.forEach(resource => {
      console.log(`- ${resource.public_id}: ${resource.secure_url}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkImages();
