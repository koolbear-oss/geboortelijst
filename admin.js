// admin.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addGiftForm');
    const messageEl = document.getElementById('message');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        messageEl.textContent = 'Cadeau wordt toegevoegd...';
        messageEl.style.color = '#333';

        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const price = parseFloat(document.getElementById('price').value);
        const image_url = document.getElementById('image_url').value;

        try {
            const response = await fetch('/.netlify/functions/add-gift', {
                method: 'POST',
                body: JSON.stringify({
                    title,
                    description,
                    price,
                    target_amount: price, // Begin met target_amount gelijk aan de prijs
                    current_amount: 0.00,
                    image_url
                }),
                headers: { 'Content-Type': 'application/json' }
            });

            const result = await response.json();

            if (response.ok) {
                messageEl.textContent = '✅ Cadeau succesvol toegevoegd!';
                messageEl.style.color = 'green';
                form.reset(); // Maak het formulier leeg na succes
            } else {
                messageEl.textContent = '❌ Fout: ' + (result.error || 'Onbekende fout.');
                messageEl.style.color = 'red';
            }

        } catch (error) {
            console.error('Fetch error:', error);
            messageEl.textContent = '❌ Er is een netwerkfout opgetreden.';
            messageEl.style.color = 'red';
        }
    });
});