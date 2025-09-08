// .netlify/functions/payment-webhook.js

const { createMollieClient } = require('@mollie/api-client');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // Weiger alle requests behalve POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const body = JSON.parse(event.body);
        const paymentId = body.id;

        if (!paymentId) {
            return { statusCode: 400, body: 'Missing payment ID.' };
        }
        
        // Initialiseer Mollie client
        const mollie = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });
        const molliePayment = await mollie.payments.get(paymentId);
        
        // Initialiseer Supabase client
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        if (molliePayment.status === 'paid') {
            const giftId = molliePayment.metadata.gift_id;
            const paidAmount = parseFloat(molliePayment.amount.value);

            // Haal het huidige bedrag op
            const { data: gift, error: fetchError } = await supabase
                .from('gifts')
                .select('current_amount')
                .eq('id', giftId)
                .single();
            
            if (fetchError || !gift) {
                console.error('Fout bij het ophalen van de cadeau-data:', fetchError || 'Cadeau niet gevonden.');
                return { statusCode: 404, body: 'Cadeau niet gevonden.' };
            }
            
            const newAmount = gift.current_amount + paidAmount;
            
            // Update het bedrag in de database
            const { error: updateError } = await supabase
                .from('gifts')
                .update({ current_amount: newAmount })
                .eq('id', giftId);
            
            if (updateError) {
                console.error('Fout bij het updaten van het bedrag:', updateError.message);
                return { statusCode: 500, body: 'Database update mislukt.' };
            }
            
            // Optioneel: Sla de betaling ook op in een aparte tabel
            const { error: paymentError } = await supabase
                .from('payments')
                .insert([{
                    gift_id: giftId,
                    mollie_payment_id: paymentId,
                    amount: paidAmount,
                    status: 'paid',
                    // Je kan ook de naam en e-mail opslaan uit de metadata
                    payer_name: molliePayment.metadata.contributor_name,
                    payer_email: molliePayment.metadata.contributor_email
                }]);

            if (paymentError) {
                console.error('Fout bij het opslaan van de betaling:', paymentError);
            }
            
            return { statusCode: 200, body: 'OK' };
        }
        
        return { statusCode: 200, body: 'Payment not paid' };

    } catch (err) {
        console.error('Algemene fout in webhook:', err);
        return { statusCode: 500, body: 'Interne serverfout.' };
    }
};