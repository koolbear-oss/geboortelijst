// ===== SUPABASE API CONFIGURATIE =====
// Maak verbinding met Supabase om de cadeau-data op te halen
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://wixtfldcnmfmpqvwyotv.supabase.co'; // Vervang met jouw Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpeHRmbGRjbm1mbXBxdnd5b3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNDA2NjQsImV4cCI6MjA3MTYxNjY2NH0.x34CuRhuR5j6-iRNne6LIWegZiCLxJXODm6WhlRplAI'; // Vervang met jouw anon key

// Initialiseer de Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ===== PAGINA-INITIALISATIE EN DATA OPHALEN =====
async function fetchGifts() {
    console.log('Fetching gifts from Supabase...');
    // Haal alle data op uit de 'gifts' tabel
    const { data: gifts, error } = await supabase
        .from('gifts')
        .select('*');

    if (error) {
        console.error('Error fetching gifts:', error);
        return;
    }

    console.log('Gifts fetched:', gifts);
    renderGifts(gifts);
}


// ===== PAGINA RENDERING =====
function renderGifts(gifts) {
    const giftGrid = document.getElementById('giftGrid');
    giftGrid.innerHTML = ''; // Maak het rooster leeg voor we de kaarten renderen

    if (!gifts || gifts.length === 0) {
        giftGrid.innerHTML = '<p>Er zijn op dit moment geen cadeaus beschikbaar.</p>';
        return;
    }

    gifts.forEach(gift => {
        const giftCard = document.createElement('div');
        giftCard.className = 'gift-card';
        giftCard.innerHTML = `
            <img src="${gift.image_url}" alt="${gift.title}" onerror="this.src='/images/placeholder.jpg'">
            <h3>${gift.title}</h3>
            <p>${gift.description}</p>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${((gift.current_amount / gift.target_amount) * 100).toFixed(0)}%;"></div>
            </div>
            <p class="amount-text">${(gift.current_amount).toFixed(2)}€ / ${gift.target_amount.toFixed(2)}€</p>
            <button class="contribute-btn" onclick="openPaymentModal('${gift.id}', '${gift.title}', ${gift.target_amount - gift.current_amount})">Bijdragen</button>
        `;
        giftGrid.appendChild(giftCard);
    });
}


// ===== MODAL LOGICA =====
function showModal() {
    document.getElementById('loadingModal').style.display = 'flex';
}

function hideModal() {
    document.getElementById('loadingModal').style.display = 'none';
}

function openPaymentModal(giftId, giftTitle, remainingAmount) {
    const amount = prompt(`Hoeveel wil je bijdragen aan de "${giftTitle}"?\nResterend bedrag: ${remainingAmount.toFixed(2)}€`);
    if (amount) {
        // Vraag om naam en email voor de Mollie-metadata
        const name = prompt("Wat is je naam? (optioneel)");
        const email = prompt("Wat is je e-mailadres? (optioneel)");

        // Voorkom 'null' bij annuleren
        const finalName = name === null ? "" : name;
        const finalEmail = email === null ? "" : email;

        initiatePayment(giftId, amount, finalName, finalEmail);
    }
}


// ===== BETAALFUNCTIES =====
async function initiatePayment(giftId, amount, name, email) {
    showModal();
    try {
        const response = await fetch(`${window.location.origin}/.netlify/functions/create-payment`, {
            method: 'POST',
            body: JSON.stringify({ id: giftId, amount: parseFloat(amount).toFixed(2), name: name, email: email }),
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('API Error:', data);
            alert('Er is een fout opgetreden: ' + (data.error || 'Onbekende fout'));
            hideModal();
            return;
        }

        window.location.href = data.checkoutUrl;
    } catch (error) {
        console.error('Fetch Error:', error);
        alert('Er is een verbindingsfout opgetreden.');
        hideModal();
    }
}


// ===== INITIALISATIE =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('🍼 Geboortelijst applicatie gestart');
    fetchGifts();
});

// Exporteer functies naar de globale scope voor onclick events
window.openPaymentModal = openPaymentModal;