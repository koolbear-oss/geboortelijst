// .netlify/functions/payment-webhook.js

const { createMollieClient } = require('@mollie/api-client');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Mollie stuurt webhook-data in de 'x-www-form-urlencoded' formaat
        const params = new URLSearchParams(event.body);
        const paymentId = params.get('id');

        if (!paymentId) {
            return { statusCode: 400, body: 'Missing payment ID.' };
        }

        // Initialiseer Mollie client om de betaling te verifiëren
        const mollie = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });
        const molliePayment = await mollie.payments.get(paymentId);
        
        // Initialiseer Supabase client met de service role key
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
            auth: { persistSession: false },
        });

        // We verwerken de betaling alleen als de status 'paid' is
        if (molliePayment.status === 'paid') {
            const giftId = molliePayment.metadata.gift_id;
            const paidAmount = parseFloat(molliePayment.amount.value);
            const payerName = molliePayment.metadata.contributor_name;
            const payerEmail = molliePayment.metadata.contributor_email;

            // Transactie: Haal het huidige bedrag op en update het
            const { data: gift, error: fetchError } = await supabase
                .from('gifts')
                .select('current_amount')
                .eq('id', giftId)
                .single();
            
            if (fetchError || !gift) {
                console.error('Fout bij het ophalen van de cadeau-data:', fetchError || 'Cadeau niet gevonden.');
                return { statusCode: 404, body: 'Gift not found.' };
            }
            
            const newAmount = gift.current_amount + paidAmount;
            
            const { error: updateError } = await supabase
                .from('gifts')
                .update({ current_amount: newAmount })
                .eq('id', giftId);
            
            if (updateError) {
                console.error('Fout bij het updaten van het bedrag:', updateError.message);
                return { statusCode: 500, body: 'Database update failed.' };
            }
            
            // Log de betaling in de 'payments' tabel
            const { error: paymentError } = await supabase
                .from('payments')
                .insert([{
                    gift_id: giftId,
                    mollie_payment_id: paymentId,
                    amount: paidAmount,
                    status: 'paid',
                    payer_name: payerName,
                    payer_email: payerEmail
                }]);

            if (paymentError) {
                console.error('Fout bij het opslaan van de betaling:', paymentError);
            }
            
            // Stuur een 200 OK om Mollie te laten weten dat de webhook succesvol was
            return { statusCode: 200, body: 'OK' };
        }
        
        // Als de status niet 'paid' is (bijv. 'open' of 'canceled'), doe dan niets
        return { statusCode: 200, body: 'Payment not paid' };

    } catch (err) {
        console.error('Algemene fout in webhook:', err);
        return { statusCode: 500, body: 'Internal Server Error.' };
    }
};