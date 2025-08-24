const mollieClient = require('@mollie/api-client');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const mollie = mollieClient({ apiKey: process.env.MOLLIE_API_KEY });
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Supabase client met service role key, zodat we data kunnen updaten
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { id: paymentId } = JSON.parse(event.body);

    try {
        const molliePayment = await mollie.payments.get(paymentId);

        // Controleer of de betaling betaald is
        if (molliePayment.isPaid()) {
            const { giftId, payerEmail } = molliePayment.metadata;
            const paidAmount = parseFloat(molliePayment.amount.value);

            // Haal de huidige gift op om het bedrag te bepalen
            const { data: gift, error: fetchError } = await supabase
                .from('gifts')
                .select('current_amount')
                .eq('id', giftId)
                .single();

            if (fetchError || !gift) {
                console.error('Fout bij het ophalen van de cadeau-data:', fetchError || 'Cadeau niet gevonden.');
                return { statusCode: 404, body: 'Cadeau niet gevonden.' };
            }

            // Bereken het nieuwe totale bedrag
            const newAmount = gift.current_amount + paidAmount;

            // Update de 'current_amount' in de 'gifts' tabel
            const { error: updateError } = await supabase
                .from('gifts')
                .update({ current_amount: newAmount })
                .eq('id', giftId);

            if (updateError) {
                console.error('Fout bij het updaten van het bedrag:', updateError.message);
                return { statusCode: 500, body: 'Database update mislukt.' };
            }

            // Optioneel: voeg de betaling toe aan de 'payments' tabel
            await supabase
                .from('payments')
                .insert([{
                    gift_id: giftId,
                    mollie_payment_id: paymentId,
                    amount: paidAmount,
                    status: 'paid',
                    payer_email: payerEmail
                }]);

            return { statusCode: 200, body: 'OK' };
        }

        return { statusCode: 200, body: 'Betaling nog niet voltooid.' };

    } catch (err) {
        console.error('Algemene fout in webhook:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};