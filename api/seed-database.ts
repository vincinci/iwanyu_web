// api/seed-database.ts
// Admin endpoint to seed database with sample data
// ⚠️ This should be removed or secured before production

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
        return res.status(500).json({ error: 'Missing Supabase credentials' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    try {
        console.log('🌱 Starting database seed...');

        // 1. Create vendor profile
        const vendorEmail = 'vendor@iwanyu.store';
        const vendorId = crypto.randomUUID();

        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: vendorId,
                email: vendorEmail,
                full_name: 'Iwanyu Sample Store',
                role: 'seller',
                profile_completed: true,
            }, { onConflict: 'email' });

        if (profileError && profileError.code !== '23505') {
            console.error('Profile error:', profileError);
            return res.status(500).json({ error: 'Failed to create vendor profile', details: profileError });
        }

        // Get the vendor ID (either newly created or existing)
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', vendorEmail)
            .single();

        const actualVendorId = profile?.id || vendorId;

        // 2. Create vendor
        const { data: vendor, error: vendorError } = await supabase
            .from('vendors')
            .upsert({
                user_id: actualVendorId,
                store_name: 'Iwanyu Sample Store',
                store_description: 'Your trusted marketplace for quality products',
                status: 'approved',
            }, { onConflict: 'user_id' })
            .select()
            .single();

        if (vendorError && vendorError.code !== '23505') {
            console.error('Vendor error:', vendorError);
            return res.status(500).json({ error: 'Failed to create vendor', details: vendorError });
        }

        // Get vendor record
        const { data: vendorRecord } = await supabase
            .from('vendors')
            .select('id')
            .eq('user_id', actualVendorId)
            .single();

        const vendorRecordId = vendorRecord?.id || vendor?.id;

        if (!vendorRecordId) {
            return res.status(500).json({ error: 'Could not get vendor ID' });
        }

        // 3. Check if products already exist
        const { data: existingProducts } = await supabase
            .from('products')
            .select('id')
            .eq('vendor_id', vendorRecordId)
            .limit(1);

        if (existingProducts && existingProducts.length > 0) {
            return res.status(200).json({ 
                message: 'Database already seeded',
                vendorId: vendorRecordId,
                productsExist: true
            });
        }

        // 4. Create sample products
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
            {
                vendor_id: vendorRecordId,
                name: 'Wireless Keyboard & Mouse Combo',
                description: 'Ergonomic wireless keyboard and mouse set. Long battery life and responsive keys.',
                price: 6900,
                category: 'electronics',
                stock: 55,
                image_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800',
                status: 'active',
            },
            {
                vendor_id: vendorRecordId,
                name: 'Cotton Bedsheet Set - Queen Size',
                description: 'Luxurious 300 thread count cotton bedsheet set. Includes fitted sheet, flat sheet, and pillowcases.',
                price: 8500,
                category: 'home',
                stock: 30,
                image_url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800',
                status: 'active',
            },
            {
                vendor_id: vendorRecordId,
                name: 'Denim Jeans - Classic Fit',
                description: 'Premium denim jeans with classic fit. Durable and comfortable for everyday wear.',
                price: 7500,
                category: 'fashion',
                stock: 70,
                image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800',
                status: 'active',
            },
            {
                vendor_id: vendorRecordId,
                name: 'LED Desk Lamp',
                description: 'Adjustable LED desk lamp with touch controls. Energy-efficient with multiple brightness levels.',
                price: 4900,
                category: 'home',
                stock: 45,
                image_url: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800',
                status: 'active',
            },
            {
                vendor_id: vendorRecordId,
                name: 'Travel Backpack 30L',
                description: 'Durable travel backpack with laptop compartment, USB charging port, and water-resistant fabric.',
                price: 9900,
                category: 'accessories',
                stock: 40,
                image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800',
                status: 'active',
            },
        ];

        const { data: products, error: productsError } = await supabase
            .from('products')
            .insert(sampleProducts)
            .select();

        if (productsError) {
            console.error('Products error:', productsError);
            return res.status(500).json({ error: 'Failed to create products', details: productsError });
        }

        // 5. Get final counts
        const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });
        const { count: vendorCount } = await supabase.from('vendors').select('*', { count: 'exact', head: true });

        return res.status(200).json({
            success: true,
            message: 'Database seeded successfully',
            data: {
                vendorId: vendorRecordId,
                productsCreated: products?.length || 0,
                totalProducts: productCount || 0,
                totalVendors: vendorCount || 0,
            }
        });

    } catch (error) {
        console.error('Seed error:', error);
        return res.status(500).json({ 
            error: 'Seed failed', 
            details: error instanceof Error ? error.message : String(error)
        });
    }
}
