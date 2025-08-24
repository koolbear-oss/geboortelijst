// Netlify Function: Payment Webhook
// Deze functie ontvangt updates van Mollie over betaalstatussen

exports.handler = async (event, context) => {
    // Alleen POST requests van Mollie toestaan
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method not allowed'
        };
    }

    try {
        // Parse de webhook data van Mollie
        const webhookData = JSON.parse(event.body);
        const paymentId = webhookData.id;

        console.log('Webhook ontvangen voor payment:', paymentId);

        // Haal de betaalstatus op bij Mollie (webhook bevat alleen het ID)
        const mollieResponse = await fetch(`https://api.mollie.com/v2/payments/${paymentId}`, {
            headers: {
                'Authorization': `Bearer ${process.env.MOLLIE_API_KEY}`,
            }
        });

        if (!mollieResponse.ok) {
            console.error('Fout bij ophalen payment van Mollie:', mollieResponse.status);
            return {
                statusCode: 500,
                body: 'Fout bij ophalen payment details'
            };
        }

        const payment = await mollieResponse.json();
        console.log('Payment status:', payment.status);
        console.log('Payment metadata:', payment.metadata);

        // Verwerk alleen succesvolle betalingen
        if (payment.status === 'paid') {
            const giftId = payment.metadata.giftId;
            const amount = parseFloat(payment.amount.value);
            
            console.log(`✅ Betaling succesvol: €${amount} voor gift ${giftId}`);
            
            // TODO: Hier zou je normaal de database updaten
            // Voor nu loggen we alleen - in volgende stap maken we een simpele data store
            
            // In een echte applicatie zou je hier:
            // 1. De gift data in je database updaten
            // 2. Een email versturen naar de administrators
            // 3. Mogelijk een dankmail naar de donateur
            
            console.log('📧 TODO: Update gift data in database');
            console.log('📧 TODO: Verstuur notificatie email');
            
        } else if (payment.status === 'failed' || payment.status === 'canceled') {
            console.log(`❌ Betaling mislukt/geannuleerd: ${payment.status}`);
        } else {
            console.log(`⏳ Betaling status: ${payment.status}`);
        }

        // Altijd een 200 status teruggeven aan Mollie (anders proberen ze opnieuw)
        return {
            statusCode: 200,
            body: 'OK'
        };

    } catch (error) {
        console.error('Webhook processing error:', error);
        
        // Ook bij errors een 200 teruggeven om eindloze retries te voorkomen
        // Mollie probeert anders steeds opnieuw
        return {
            statusCode: 200,
            body: 'Error processed'
        };
    }
};