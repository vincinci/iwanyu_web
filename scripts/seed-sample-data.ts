import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedData() {
  console.log('🌱 Starting database seed...\n');

  // 1. Create vendor profile
  console.log('Creating vendor profile...');
  const vendorEmail = 'vendor@iwanyu.store';
  
  // Check if vendor exists
  const { data: existingVendor } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', vendorEmail)
    .single();

  let vendorId: string;

  if (existingVendor) {
    vendorId = existingVendor.id;
    console.log('✓ Vendor profile already exists:', vendorId);
  } else {
    // Create auth user first (if needed)
    const randomId = crypto.randomUUID();
    vendorId = randomId;
    
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: vendorId,
        email: vendorEmail,
        full_name: 'Sample Vendor Store',
        role: 'seller',
        profile_completed: true,
      });

    if (profileError) {
      console.error('Error creating vendor profile:', profileError);
      vendorId = (await supabase.from('profiles').select('id').eq('role', 'seller').limit(1).single()).data?.id;
      if (!vendorId) throw profileError;
    } else {
      console.log('✓ Created vendor profile:', vendorId);
    }
  }

  // 2. Create vendor
  console.log('\nCreating vendor...');
  const { data: existingVendorRecord } = await supabase
    .from('vendors')
    .select('id')
    .eq('user_id', vendorId)
    .single();

  let vendorRecordId: string;

  if (existingVendorRecord) {
    vendorRecordId = existingVendorRecord.id;
    console.log('✓ Vendor record already exists:', vendorRecordId);
  } else {
    const { data: newVendor, error: vendorError } = await supabase
      .from('vendors')
      .insert({
        user_id: vendorId,
        store_name: 'Iwanyu Sample Store',
        store_description: 'Your trusted marketplace for quality products',
        status: 'approved',
      })
      .select()
      .single();

    if (vendorError) {
      console.error('Error creating vendor:', vendorError);
      return;
    }
    vendorRecordId = newVendor.id;
    console.log('✓ Created vendor:', vendorRecordId);
  }

  // 3. Create sample products
  console.log('\nCreating sample products...');
  
  const sampleProducts = [
    {
      vendor_id: vendorRecordId,
      name: 'Premium Wireless Headphones',
      description: 'High-quality wireless headphones with active noise cancellation and 30-hour battery life. Perfect for music lovers and professionals.',
      price: 15900,
      category: 'electronics',
      stock: 45,
      image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
      status: 'active',
    },
    {
      vendor_id: vendorRecordId,
      name: 'Organic Cotton T-Shirt',
      description: 'Comfortable, eco-friendly t-shirt made from 100% organic cotton. Available in multiple colors.',
      price: 2500,
      category: 'fashion',
      stock: 120,
      image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
      status: 'active',
    },
    {
      vendor_id: vendorRecordId,
      name: 'Smart Fitness Watch',
      description: 'Track your fitness goals with this advanced smartwatch. Features heart rate monitoring, GPS, and waterproof design.',
      price: 12900,
      category: 'electronics',
      stock: 30,
      image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800',
      status: 'active',
    },
    {
      vendor_id: vendorRecordId,
      name: 'Leather Messenger Bag',
      description: 'Handcrafted genuine leather messenger bag. Perfect for work or travel with multiple compartments.',
      price: 8900,
      category: 'accessories',
      stock: 25,
      image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
      status: 'active',
    },
    {
      vendor_id: vendorRecordId,
      name: 'Yoga Mat Pro',
      description: 'Non-slip premium yoga mat with extra cushioning. Includes carrying strap.',
      price: 4500,
      category: 'sports',
      stock: 60,
      image_url: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800',
      status: 'active',
    },
    {
      vendor_id: vendorRecordId,
      name: 'Ceramic Coffee Mug Set',
      description: 'Beautiful handcrafted ceramic mugs, set of 4. Microwave and dishwasher safe.',
      price: 3200,
      category: 'home',
      stock: 80,
      image_url: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800',
      status: 'active',
    },
    {
      vendor_id: vendorRecordId,
      name: 'Portable Bluetooth Speaker',
      description: '360° sound portable speaker with 12-hour battery. Waterproof and durable.',
      price: 7900,
      category: 'electronics',
      stock: 50,
      image_url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800',
      status: 'active',
    },
    {
      vendor_id: vendorRecordId,
      name: 'Running Shoes - Pro Series',
      description: 'Professional running shoes with advanced cushioning technology. Lightweight and breathable.',
      price: 11900,
      category: 'sports',
      stock: 40,
      image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
      status: 'active',
    },
    {
      vendor_id: vendorRecordId,
      name: 'Desk Organizer Set',
      description: 'Bamboo desk organizer with multiple compartments. Keep your workspace tidy and stylish.',
      price: 5500,
      category: 'home',
      stock: 35,
      image_url: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800',
      status: 'active',
    },
    {
      vendor_id: vendorRecordId,
      name: 'Stainless Steel Water Bottle',
      description: 'Insulated water bottle keeps drinks cold for 24h or hot for 12h. BPA-free and eco-friendly.',
      price: 3900,
      category: 'sports',
      stock: 100,
      image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800',
      status: 'active',
    },
  ];

  // Check existing products
  const { data: existingProducts } = await supabase
    .from('products')
    .select('id')
    .eq('vendor_id', vendorRecordId);

  if (existingProducts && existingProducts.length > 0) {
    console.log(`✓ Found ${existingProducts.length} existing products, skipping seed`);
  } else {
    const { data: products, error: productsError } = await supabase
      .from('products')
      .insert(sampleProducts)
      .select();

    if (productsError) {
      console.error('Error creating products:', productsError);
      return;
    }

    console.log(`✓ Created ${products?.length || 0} sample products`);
  }

  // 4. Verify data
  console.log('\n📊 Database Summary:');
  const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
  const { count: vendorCount } = await supabase.from('vendors').select('*', { count: 'exact', head: true });
  const { count: profileCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

  console.log(`  Products: ${productCount || 0}`);
  console.log(`  Vendors: ${vendorCount || 0}`);
  console.log(`  Profiles: ${profileCount || 0}`);

  console.log('\n✅ Database seed completed successfully!\n');
}

seedData().catch(console.error);
