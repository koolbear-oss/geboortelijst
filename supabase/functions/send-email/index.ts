import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

serve(async (req) => {
    // Stel de CORS-headers in om verzoeken van je website toe te staan.
    const headers = {
        'Access-Control-Allow-Origin': 'https://geboortelijst.netlify.app',
        'Content-Type': 'application/json'
    };

    if (req.method === 'OPTIONS') {
        // Handle CORS preflight requests
        return new Response("ok", { headers });
    }

    if (req.method !== "POST") {
        return new Response("Method not allowed", { status: 405, headers });
    }

    try {
        const { title, amount, email } = await req.json();

        if (!email || !title || !amount) {
            return new Response("Missing required fields", { status: 400, headers });
        }

        const sendgridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SENDGRID_API_KEY}`,
            },
            body: JSON.stringify({
                personalizations: [{ to: [{ email }] }],
                from: { email: "colla.hatt@gmail.com", name: "Birth List Colla-Hatt" },
                subject: "Bedankt voor je bijdrage!",
                content: [
                    {
                        type: "text/html",
                        value: `
                            <h1>Bedankt voor je bijdrage!</h1>
                            <p>Hoi, bedankt voor je bijdrage aan de geboortelijst.</p>
                            <p>Je hebt een bijdrage van €${parseFloat(amount).toFixed(2)} geleverd aan het cadeau <b>${title}</b>.</p>
                            <p>Jouw vrijgevigheid wordt enorm gewaardeerd!</p>
                            <br>
                            <p>Liefs,</p>
                            <p>[Jouw naam of de naam van de ouders]</p>
                        `,
                    },
                ],
            }),
        });

        if (!sendgridResponse.ok) {
            console.error("Failed to send email:", await sendgridResponse.text());
            return new Response("Failed to send email", { status: 500, headers });
        }

        return new Response("Email sent successfully", { status: 200, headers });
    } catch (error) {
        console.error("Error processing request:", error);
        return new Response("There was an error processing the request.", { status: 500, headers });
    }
});