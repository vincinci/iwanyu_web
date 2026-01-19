// api/marketplace.ts
// Serverless function to fetch marketplace data (Products & Vendors) securely from Supabase.

import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { type } = req.query;

    try {
        if (type === 'products') {
            const { data, error } = await supabase
                .from('products')
                .select('id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage')
                .order('created_at', { ascending: false })
                .limit(1000);
            
            if (error) throw error;
            return res.status(200).json(data || []);
        }

        if (type === 'vendors') {
            const { data, error } = await supabase
                .from('vendors')
                .select('id, name, location, verified, owner_user_id, status')
                .order('created_at', { ascending: false })
                .limit(1000);
            
            if (error) throw error;
            return res.status(200).json(data || []);
        }

        // Default: Fetch all
        const [productsRes, vendorsRes] = await Promise.all([
            supabase
                .from('products')
                .select('id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage')
                .order('created_at', { ascending: false })
                .limit(1000),
            supabase
                .from('vendors')
                .select('id, name, location, verified, owner_user_id, status')
                .order('created_at', { ascending: false })
                .limit(1000)
        ]);

        if (productsRes.error) throw productsRes.error;
        if (vendorsRes.error) throw vendorsRes.error;

        return res.status(200).json({
            products: productsRes.data || [],
            vendors: vendorsRes.data || []
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message, details: error.stack });
    }
}
