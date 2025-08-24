// Netlify Function: Create Mollie Payment
// Deze functie handelt het aanmaken van Mollie betalingen af

exports.handler = async (event, context) => {
    // Alleen POST requests toestaan
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Parse de request body
        const { giftId, amount } = JSON.parse(event.body);
        
        // Validatie
        if (!giftId || !amount || amount <= 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ 
                    error: 'giftId en amount zijn verplicht en amount moet groter zijn dan 0' 
                })
            };
        }

        // Haal gift data op (in een echte app zou dit uit een database komen)
        const gifts = JSON.parse(process.env.GIFT_DATA);
        const gift = gifts.find(g => g.id === giftId);
        
        if (!gift) {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Cadeau niet gevonden' })
            };
        }

        // Check of er nog ruimte is voor bijdragen
        const remaining = gift.price - gift.currentAmount;
        if (remaining <= 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Dit cadeau is al volledig gefinancierd' })
            };
        }

        // Beperk amount tot het resterende bedrag
        const finalAmount = Math.min(amount, remaining);

        // Maak Mollie betaling aan
        const mollieResponse = await fetch('https://api.mollie.com/v2/payments', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.MOLLIE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: {
                    currency: 'EUR',
                    value: finalAmount.toFixed(2)
                },
                description: `Bijdrage voor ${gift.title}`,
                redirectUrl: `${process.env.SITE_URL}?success=true&gift=${giftId}&amount=${finalAmount}`,
                webhookUrl: `${process.env.SITE_URL}/.netlify/functions/payment-webhook`,
                metadata: {
                    giftId: giftId,
                    giftTitle: gift.title,
                    originalAmount: amount.toString()
                }
            })
        });

        if (!mollieResponse.ok) {
            const errorData = await mollieResponse.text();
            console.error('Mollie API Error:', errorData);
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    error: 'Fout bij het aanmaken van de betaling',
                    details: errorData
                })
            };
        }

        const payment = await mollieResponse.json();

        // Stuur de checkout URL terug naar de frontend
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', // Voor CORS
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            body: JSON.stringify({
                paymentId: payment.id,
                checkoutUrl: payment._links.checkout.href,
                amount: finalAmount,
                gift: {
                    id: gift.id,
                    title: gift.title
                }
            })
        };

    } catch (error) {
        console.error('Create Payment Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Interne server fout',
                message: error.message 
            })
        };
    }
};