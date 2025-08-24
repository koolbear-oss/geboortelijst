// .netlify/functions/add-gift.js

const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { title, description, price, target_amount, current_amount, image_url } = JSON.parse(event.body);

        // Basisvalidatie
        if (!title || !price || !target_amount) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Ontbrekende verplichte velden.' }) };
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

        const { data, error } = await supabase
            .from('gifts')
            .insert([
                {
                    title,
                    description,
                    price,
                    target_amount,
                    current_amount,
                    image_url
                }
            ]);

        if (error) {
            console.error('Supabase error:', error);
            return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Cadeau succesvol toegevoegd!', data })
        };

    } catch (err) {
        console.error('Algemene fout in add-gift functie:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};