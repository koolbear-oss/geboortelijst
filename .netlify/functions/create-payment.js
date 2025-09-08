// .netlify/functions/create-payment.js

const { createMollieClient } = require('@mollie/api-client');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // Check of het een POST-request is
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    // Initialiseer Mollie client met de geheime API-sleutel
    const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });
    
    // Initialiseer Supabase client met de service role key
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    try {
        const { giftId, amount, name, email } = JSON.parse(event.body);
        
        // Haal de cadeau-informatie op uit de database
        const { data: giftData, error: giftError } = await supabase
            .from('gifts')
            .select('*')
            .eq('id', giftId)
            .single();

        if (giftError || !giftData) {
            return { statusCode: 404, body: 'Cadeau niet gevonden.' };
        }

        // Creëer de betaling bij Mollie
        const payment = await mollieClient.payments.create({
            amount: { value: parseFloat(amount).toFixed(2), currency: 'EUR' },
            description: `Bijdrage voor: ${giftData.title}`,
            redirectUrl: `${process.env.URL}/index.html?payment=success`, // De URL waar de gebruiker naartoe wordt gestuurd
            webhookUrl: `${process.env.URL}/.netlify/functions/payment-webhook`, // De URL van je webhook functie
            metadata: { 
                gift_id: giftId, 
                contributor_name: name || 'Anoniem',
                contributor_email: email
            }
        });

        // Stuur de checkout URL terug naar de frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ checkoutUrl: payment.getCheckoutUrl() })
        };
        
    } catch (err) {
        console.error('Fout bij het aanmaken van de betaling:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message || 'Interne serverfout.' })
        };
    }
};