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
    const limit = Math.min(1000, Math.max(1, Number(req.query.limit) || 200));
    const offset = Math.max(0, Number(req.query.offset) || 0);

    try {
        if (type === 'products') {
            let { data, error } = await supabase
                .from('products')
                .select('*')
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error && /column\s+"deleted_at"\s+does\s+not\s+exist/i.test(error.message)) {
                ({ data, error } = await supabase
                    .from('products')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .range(offset, offset + limit - 1));
            }
            
            if (error) throw error;
            return res.status(200).json(data || []);
        }

        if (type === 'vendors') {
            let { data, error } = await supabase
                .from('vendors')
                .select('*')
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error && /column\s+"deleted_at"\s+does\s+not\s+exist/i.test(error.message)) {
                ({ data, error } = await supabase
                    .from('vendors')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .range(offset, offset + limit - 1));
            }
            
            if (error) throw error;
            return res.status(200).json(data || []);
        }

        // Default: Fetch all
        let productsRes = await supabase
            .from('products')
            .select('*')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
        let vendorsRes = await supabase
            .from('vendors')
            .select('*')
            .is('deleted_at', null)
            .order('created_at', { ascending: false })
            .range(0, 499);

        if (productsRes.error && /column\s+"deleted_at"\s+does\s+not\s+exist/i.test(productsRes.error.message)) {
            productsRes = await supabase
                .from('products')
                .select('*')
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
        }

        if (vendorsRes.error && /column\s+"deleted_at"\s+does\s+not\s+exist/i.test(vendorsRes.error.message)) {
            vendorsRes = await supabase
                .from('vendors')
                .select('*')
                .order('created_at', { ascending: false })
                .range(0, 499);
        }

        if (productsRes.error) throw productsRes.error;
        if (vendorsRes.error) throw vendorsRes.error;

        return res.status(200).json({
            products: productsRes.data || [],
            vendors: vendorsRes.data || []
        });

    } catch (error: unknown) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error', details: error instanceof Error ? error.stack : undefined });
    }
}
