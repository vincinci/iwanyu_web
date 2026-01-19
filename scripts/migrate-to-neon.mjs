import fs from 'fs';
import path from 'path';
import pg from 'pg';
import process from 'process';

// Load env
function loadEnv(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        content.split('\n').forEach(line => {
            const parts = line.split('=');
            if (parts.length > 1 && !line.trim().startsWith('#')) {
                const key = parts[0].trim();
                const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
                if (!process.env[key]) process.env[key] = val;
            }
        });
    } catch (e) {}
}
loadEnv(path.resolve(process.cwd(), '.env'));
loadEnv(path.resolve(process.cwd(), '.env.local'));

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL is missing');
    process.exit(1);
}

const pool = new pg.Pool({
    connectionString,
    ssl: true
});

async function runSqlFile(client, filePath) {
    console.log(`Running ${path.basename(filePath)}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    // Basic split by semicolon - not perfect for procedures but good enough for simple schemas
    // Actually, pg driver can define functions with $$ blocks which might contain semicolons. 
    // It's better to just run the whole file if pg supports it, or use a robust splitter.
    // node-postgres can run multiple statements in one query() call usually.
    try {
        await client.query(sql);
        console.log(`✅ ${path.basename(filePath)} applied.`);
    } catch (e) {
        console.error(`❌ Error in ${path.basename(filePath)}:`, e.message);
    }
}

async function main() {
    console.log('Connecting to Neon...');
    const client = await pool.connect();
    try {
        // Need to enable pgcrypto if used (Supabase has it by default)
        await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
        await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

        // Run Neon Compat Layer
        console.log('Running neon-compat.sql...');
        const compatSql = fs.readFileSync(path.join(process.cwd(), 'scripts/neon-compat.sql'), 'utf8');
        await client.query(compatSql);

        const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
        const files = fs.readdirSync(migrationsDir).sort(); // simple string sort for timestamps

        for (const file of files) {
            if (file.endsWith('.sql')) {
                await runSqlFile(client, path.join(migrationsDir, file));
            }
        }
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch(console.error);
