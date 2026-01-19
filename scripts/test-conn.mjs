import { createClient } from '@supabase/supabase-js';

const url = 'https://iakxtffxaevszuouapih.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlha3h0ZmZ4YWV2c3p1b3VhcGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTgxNTIsImV4cCI6MjA4MzE5NDE1Mn0.phPO0WG3tW4n6aC23hiHR0Gi4tGQau1wuu84Vtrvh54';

const supabase = createClient(url, key);

async function test() {
    console.log('Testing connection...');
    const { data, error } = await supabase.from('products').select('id').limit(1);
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success! Data:', data);
    }
}

test();
