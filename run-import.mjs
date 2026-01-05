import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;

// Parse .env.local
const envContent = fs.readFileSync('/Users/davy/iwanyu-marketplace/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL;
const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
if (!match) {
  console.error('Invalid Supabase URL format');
  process.exit(1);
}

const projectRef = match[1];

// Connection string format for Supabase
const connectionString = `postgresql://postgres.${projectRef}:${env.SUPABASE_SERVICE_ROLE_KEY}@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;

console.log('Connecting to Supabase Postgres...');

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function importProducts() {
  try {
    await client.connect();
    console.log('✓ Connected to database\n');
    
    const sqlContent = fs.readFileSync('/Users/davy/iwanyu-marketplace/import-products.sql', 'utf8');
    
    // Split by INSERT statements
    const statements = sqlContent.split(/(?=INSERT INTO products)/);
    
    let imported = 0;
    let skipped = 0;
    
    for (const statement of statements) {
      if (!statement.trim()) continue;
      
      try {
        const result = await client.query(statement);
        if (result.rowCount > 0) {
          imported++;
          // Extract title from statement for logging
          const titleMatch = statement.match(/VALUES \('[^']+', '([^']+)'/);
          if (titleMatch) {
            console.log(`✓ Imported: ${titleMatch[1]}`);
          }
        } else {
          skipped++;
        }
      } catch (err) {
        // ON CONFLICT DO NOTHING means this is expected for duplicates
        if (err.message.includes('unique constraint')) {
          skipped++;
        } else {
          console.error(`Error: ${err.message}`);
        }
      }
    }
    
    console.log(`\n=== Import Complete ===`);
    console.log(`✓ Successfully imported: ${imported} products`);
    console.log(`⊘ Skipped (duplicates): ${skipped} products`);
    
  } catch (error) {
    console.error('Connection error:', error.message);
    console.error('\nPlease check your SUPABASE_SERVICE_ROLE_KEY in .env.local');
  } finally {
    await client.end();
  }
}

importProducts();
