// ===== SUPABASE API CONFIGURATIE =====
// Maak verbinding met Supabase om de cadeau-data op te halen
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://wixtfldcnmfmpqvwyotv.supabase.co'; // Vervang met jouw Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpeHRmbGRjbm1mbXBxdnd5b3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNDA2NjQsImV4cCI6MjA3MTYxNjY2NH0.x34CuRhuR5j6-iRNne6LIWegZiCLxJXODm6WhlRplAI'; // Vervang met jouw anon key

// Initialiseer de Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ===== PAGINA INITIALISATIE EN DATA OPHALEN =====
let allGifts = [];
let paymentModal;
let closeBtn;
let paymentForm;

// Functie om de cadeaus op te halen en weer te geven
async function fetchGifts() {
    console.log('Fetching gifts from Supabase...');
    const giftGrid = document.getElementById('giftGrid');
    if (!giftGrid) return;
    giftGrid.innerHTML = ''; // Maak de grid eerst leeg

    const { data: gifts, error } = await supabase
        .from('gifts')
        .select('*');

    if (error) {
        console.error('Error fetching gifts:', error);
        giftGrid.innerHTML = '<p class="error-message">Helaas, de cadeaus konden niet geladen worden. Probeer het later opnieuw.</p>';
        return;
    }
    
    if (gifts && gifts.length > 0) {
        allGifts = gifts;
        renderGifts(gifts);
    } else {
        giftGrid.innerHTML = '<p class="no-gifts-message">Er zijn nog geen cadeaus toegevoegd. Binnenkort vind je hier een prachtige selectie!</p>';
    }
}

// Functie om de cadeaus weer te geven in de UI
function renderGifts(gifts) {
    const giftGrid = document.getElementById('giftGrid');
    if (!giftGrid) return;
    giftGrid.innerHTML = ''; // Leeg de grid voordat we nieuwe items toevoegen

    gifts.forEach(gift => {
        const percentage = gift.target_amount > 0 ? Math.min((gift.current_amount / gift.target_amount) * 100, 100).toFixed(0) : 0;
        const isFunded = gift.current_amount >= gift.target_amount;
        const giftCard = document.createElement('div');
        giftCard.className = 'gift-card';
        giftCard.dataset.id = gift.id;

        giftCard.innerHTML = `
            <img src="${gift.image_url}" alt="${gift.title}" onerror="this.src='https://via.placeholder.com/250'">
            <div class="gift-card-content">
                <h3>${gift.title}</h3>
                <p>${gift.description}</p>
                <div class="progress-container">
                    <div class="progress-fill" style="width: ${percentage}%;"></div>
                    <span class="progress-percentage">${percentage}%</span>
                </div>
                <p class="amount-text">${(gift.current_amount).toFixed(2)}€ / ${gift.target_amount.toFixed(2)}€</p>
                <button class="contribute-btn ${isFunded ? 'disabled' : ''}" ${isFunded ? 'disabled' : ''}>${isFunded ? 'Thanks!' : 'Contribute'}</button>
            </div>
        `;
        giftGrid.appendChild(giftCard);
    });
}

// Functie voor de zoekbalk
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filteredGifts = allGifts.filter(gift => 
            gift.title.toLowerCase().includes(query) ||
            gift.description.toLowerCase().includes(query)
        );
        renderGifts(filteredGifts);
    });
}

// Functie om de betaalmodal te openen
function openPaymentModal(gift) {
    if (!paymentModal) return;
    document.getElementById('modal-image').src = gift.image_url;
    document.getElementById('modal-title').textContent = gift.title;
    document.getElementById('giftIdInput').value = gift.id;
    paymentForm.reset();
    paymentModal.style.display = 'flex';
}

// Sluit de modal
function closePaymentModal() {
    if (!paymentModal) return;
    paymentModal.style.display = 'none';
}

// Verwerk de klik op de 'Bijdragen' knop
function handleContributeClick(e) {
    if (e.target.classList.contains('contribute-btn')) {
        const giftCard = e.target.closest('.gift-card');
        const giftId = giftCard.dataset.id;
        const gift = allGifts.find(g => g.id == giftId);
        if (gift) {
            openPaymentModal(gift);
        }
    }
}

// Functie om het betaalformulier te verwerken
async function handlePaymentFormSubmit(event) {
    event.preventDefault();
    const giftId = document.getElementById('giftIdInput').value;
    const amount = parseFloat(document.getElementById('amountInput').value);
    const name = document.getElementById('nameInput').value || 'Anoniem';
    const email = document.getElementById('emailInput').value;

    if (isNaN(amount) || amount <= 0) {
        alert('Voer een geldig bedrag in.');
        return;
    }

    try {
        const response = await fetch('/.netlify/functions/create-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ giftId, amount, name, email }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Netwerkrespons was niet ok: ${errorData.error}`);
        }

        const data = await response.json();
        // Stuur de gebruiker door naar de Mollie checkout pagina
        window.location.href = data.checkoutUrl;

    } catch (error) {
        console.error('Fout bij het aanmaken van de betaling:', error);
        alert('Er is een fout opgetreden bij het aanmaken van de betaling.');
    }
}

async function handleReturnFromPayment() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const giftId = urlParams.get('giftId'); // Extra metadata toevoegen aan de redirect URL is handig

    if (paymentStatus === 'success') {
        // Toon een tijdelijk succesbericht
        showTemporaryMessage('✅ Betaling succesvol, de lijst wordt bijgewerkt...');

        // Wacht een moment om de webhook de tijd te geven
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Haal de cadeaus opnieuw op om de UI bij te werken
        await fetchGifts();

        // Verwijder de URL-parameter om te voorkomen dat de melding opnieuw verschijnt bij een refresh
        const newUrl = window.location.protocol + '//' + window.location.host + window.location.pathname;
        window.history.replaceState({ path: newUrl }, '', newUrl);

        // Verwijder het tijdelijke bericht
        showTemporaryMessage('');
    }
}

// ===== INITIALISATIE =====
document.addEventListener('DOMContentLoaded', () => {
    // Referenties naar HTML-elementen na DOM-laden
    paymentModal = document.getElementById('paymentModal');
    closeBtn = document.querySelector('#paymentModal .close-btn');
    paymentForm = document.getElementById('paymentForm');

    // Laad de cadeaus van Supabase
    fetchGifts();
    
    // Controleer of de gebruiker terugkomt van een succesvolle betaling
    handleReturnFromPayment();

    // Voeg event listeners toe aan de gift grid om clicks te delegeren
    const giftGrid = document.getElementById('giftGrid');
    if (giftGrid) {
        giftGrid.addEventListener('click', handleContributeClick);
    }
    
    // Voeg event listeners toe aan de modal
    if (closeBtn) closeBtn.addEventListener('click', closePaymentModal);
    window.addEventListener('click', (e) => {
        if (e.target === paymentModal) {
            closePaymentModal();
        }
    });

    // Voeg event listener toe aan het formulier
    if (paymentForm) paymentForm.addEventListener('submit', handlePaymentFormSubmit);

    // Zoekbalk-functionaliteit inschakelen
    setupSearch();
});