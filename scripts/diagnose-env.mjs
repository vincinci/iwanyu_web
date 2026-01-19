import fs from 'fs';
import path from 'path';

const p = path.resolve(process.cwd(), '.env.local');
console.log('Reading:', p);
try {
    const content = fs.readFileSync(p, 'utf8');
    content.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length > 1) {
            console.log('Found key:', parts[0].trim());
        }
    });
} catch (e) {
    console.error('Error:', e.message);
}
