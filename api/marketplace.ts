// api/marketplace.ts
// Serverless function to fetch marketplace data (Products & Vendors) securely from Neon.

import { VercelRequest, VercelResponse } from '@vercel/node';
import pg from 'pg';

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 1 // Low connection usage for serverless
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { type } = req.query;

    let client;
    try {
        client = await pool.connect();
        if (type === 'products') {
            const { rows } = await client.query(`
                SELECT 
                    id, vendor_id, title, description, category, price_rwf, 
                    image_url, in_stock, free_shipping, rating, review_count, discount_percentage
                FROM products 
                ORDER BY created_at DESC 
                LIMIT 1000
            `);
            // Format for frontend
            return res.status(200).json(rows);
        }

        if (type === 'vendors') {
            const { rows } = await client.query(`
                SELECT id, name, location, verified, owner_user_id, status
                FROM vendors
                ORDER BY created_at DESC
                LIMIT 1000
            `);
            return res.status(200).json(rows);
        }

        // Default: Fetch all
        const [pRes, vRes] = await Promise.all([
             client.query(`
                SELECT 
                    id, vendor_id, title, description, category, price_rwf, 
                    image_url, in_stock, free_shipping, rating, review_count, discount_percentage
                FROM products 
                ORDER BY created_at DESC 
                LIMIT 1000
            `),
            client.query(`
                SELECT id, name, location, verified, owner_user_id, status
                FROM vendors
                ORDER BY created_at DESC
                LIMIT 1000
            `)
        ]);

        return res.status(200).json({
            products: pRes.rows,
            vendors: vRes.rows
        });

    } catch (error: any) {
        console.error('API Error:', error);
        return res.status(500).json({ error: error.message, details: error.stack });
    } finally {
        if (client) client.release();
    }
}
