// netlify/functions/create-payment.js

const mollieClient = require('@mollie/api-client');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { id: giftId, amount, name, email } = JSON.parse(event.body);

    if (!giftId || !amount || !name || !email) {
        return { statusCode: 400, body: 'Missing required fields.' };
    }

    try {
        // Haal de cadeau-informatie op uit de Supabase database
        const { data: giftData, error: giftError } = await supabase
            .from('gifts')
            .select('*')
            .eq('id', giftId)
            .single();

        if (giftError || !giftData) {
            return { statusCode: 404, body: 'Gift not found.' };
        }

        const mollie = mollieClient({ apiKey: process.env.MOLLIE_API_KEY });
        const payment = await mollie.payments.create({
            amount: { value: amount, currency: 'EUR' },
            description: `Bijdrage aan: ${giftData.title}`,
            redirectUrl: `${process.env.SITE_URL}?payment=success`,
            webhookUrl: `${process.env.SITE_URL}/.netlify/functions/payment-webhook`,
            metadata: { giftId: giftId, payerName: name, payerEmail: email }
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ checkoutUrl: payment.getCheckoutUrl() })
        };
    } catch (err) {
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};