// netlify/functions/create-payment.js

// Importeer de Mollie client op de correcte manier
const { createMollieClient } = require('@mollie/api-client');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // Check of het een POST-request is
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Parse de data uit de request body
    const { id: giftId, amount, name, email } = JSON.parse(event.body);

    // Valideer de verplichte velden (cadeau-ID en bedrag)
    if (!giftId || !amount) {
        return { statusCode: 400, body: 'Missing required fields (giftId or amount).' };
    }
    
    // Initialiseer Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

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

        // Initialiseer de Mollie client met de correcte aanroep
        const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });
        
        // Creëer de betaling bij Mollie
        const payment = await mollieClient.payments.create({
            amount: { value: parseFloat(amount).toFixed(2), currency: 'EUR' },
            description: `Bijdrage aan: ${giftData.title}`,
            redirectUrl: `${process.env.SITE_URL}?payment=success`,
            webhookUrl: `${process.env.SITE_URL}/.netlify/functions/payment-webhook`,
            metadata: { 
                giftId: giftId, 
                payerName: name || 'Anoniem', // Gebruik 'Anoniem' als er geen naam is
                payerEmail: email || '' // Lege string als er geen e-mail is
            }
        });

        // Stuur de checkout URL terug naar de frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ checkoutUrl: payment.getCheckoutUrl() })
        };
    } catch (err) {
        console.error('Error in create-payment function:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};