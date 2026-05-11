#!/usr/bin/env node

const PAWAPAY_API_TOKEN = process.env.PAWAPAY_API_TOKEN || '';
const PAWAPAY_ENDPOINT = 'https://api.pawapay.io';

async function testPawaPayPayout() {
  const phone = '+250794306915';
  const amount = 500;
  const payoutId = `payout-test-${Date.now()}`;
  
  console.log('🔐 PawaPay Token:', PAWAPAY_API_TOKEN ? `${PAWAPAY_API_TOKEN.substring(0, 20)}...` : 'NOT SET');
  console.log('🌐 Endpoint:', PAWAPAY_ENDPOINT);
  
  if (!PAWAPAY_API_TOKEN) {
    console.error('\n❌ PAWAPAY_API_TOKEN not set in environment');
    console.log('\nSet it with: export PAWAPAY_API_TOKEN="your-token-here"');
    return;
  }
  
  const normalizedPhone = phone.replace(/\D/g, '');
  
  const payload = {
    payoutId,
    amount: String(amount),
    currency: 'RWF',
    correspondent: 'MTN_RWANDA',
    recipient: {
      type: 'MSISDN',
      address: {
        value: normalizedPhone,
      },
    },
    customerTimestamp: new Date().toISOString(),
    statementDescription: 'Iwanyu seller payout',
  };
  
  console.log('\n📤 Sending payout request...');
  console.log('Payload:', JSON.stringify(payload, null, 2));
  
  try {
    const response = await fetch(`${PAWAPAY_ENDPOINT}/v1/payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PAWAPAY_API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });
    
    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }
    
    console.log('\n📊 Response Status:', response.status);
    console.log('📊 Response Headers:', JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2));
    console.log('📊 Response Body:', JSON.stringify(responseData, null, 2));
    
    if (response.ok) {
      console.log('\n✅ Payout request accepted by PawaPay!');
      console.log('Payout ID:', payoutId);
      console.log('Status:', responseData.status);
      
      // Check status after a few seconds
      console.log('\n⏳ Waiting 5 seconds to check status...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const statusResponse = await fetch(`${PAWAPAY_ENDPOINT}/v1/payouts/${payoutId}`, {
        headers: {
          'Authorization': `Bearer ${PAWAPAY_API_TOKEN}`,
        },
      });
      
      const statusData = await statusResponse.json();
      console.log('\n📊 Payout Status:', JSON.stringify(statusData, null, 2));
    } else {
      console.error('\n❌ Payout request failed!');
      console.error('Status:', response.status);
      console.error('Error:', responseData.error || responseData.message || responseText);
      
      if (response.status === 401) {
        console.error('\n🔑 Authentication failed. Check your PawaPay API token.');
      } else if (response.status === 403) {
        console.error('\n🚫 Forbidden. Your account may not be activated or verified.');
      }
    }
  } catch (error) {
    console.error('\n❌ Request error:', error.message);
  }
}

testPawaPayPayout().catch(console.error);
