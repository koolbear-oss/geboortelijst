import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Haal de API-sleutel op uit de omgeving. Deze is veilig en niet zichtbaar in je code.
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

// De 'serve' functie wacht op HTTP-verzoeken.
serve(async (req) => {
    if (req.method !== "POST") {
        return new Response("Method not allowed", { status: 405 });
    }

    try {
        // Lees de JSON-body van het verzoek.
        const { title, amount, email } = await req.json();

        // Controleer of de benodigde velden aanwezig zijn.
        if (!email || !title || !amount) {
            return new Response("Missing required fields (email, title, amount)", { status: 400 });
        }

        // Verstuur de e-mail met de SendGrid API.
        const sendgridResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SENDGRID_API_KEY}`,
            },
            body: JSON.stringify({
                personalizations: [{ to: [{ email }] }],
                from: { email: "colla.hatt@gmail.com", name: "Birth List Colla-Hatt" }, // Vervang met je geverifieerde adres
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

        // Controleer of de API-oproep succesvol was.
        if (!sendgridResponse.ok) {
            console.error("Failed to send email:", await sendgridResponse.text());
            return new Response("Failed to send email", { status: 500 });
        }

        return new Response("Email sent successfully", { status: 200 });
    } catch (error) {
        console.error("Error processing request:", error);
        return new Response("There was an error processing the request.", { status: 500 });
    }
});