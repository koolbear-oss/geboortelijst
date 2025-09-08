// ===== SUPABASE API CONFIGURATIE EN VARIABELEN =====
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://wixtfldcnmfmpqvwyotv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpeHRmbGRjbm1mbXBxdnd5b3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNDA2NjQsImV4cCI6MjA3MTYxNjY2NH0.x34CuRhuR5j6-iRNne6LIWegZiCLxJXODm6WhlRplAI';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allGifts = [];
let paymentModal;
let closeBtn;
let paymentForm;

// Functie om de cadeaus op te halen en weer te geven
async function fetchGifts() {
    console.log('Fetching gifts from Supabase...');
    const giftGrid = document.getElementById('giftGrid');
    if (!giftGrid) return;
    giftGrid.innerHTML = '';

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
    giftGrid.innerHTML = '';

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
        window.location.href = data.checkoutUrl;

    } catch (error) {
        console.error('Fout bij het aanmaken van de betaling:', error);
        alert('Er is een fout opgetreden bij het aanmaken van de betaling.');
    }
}

// NIEUWE FUNCTIE: Handelt de initiële pagina-lading af
async function handleInitialLoad() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');

    if (paymentStatus === 'success') {
        showTemporaryMessage('✅ Betaling succesvol, de lijst wordt bijgewerkt...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        await fetchGifts();
        history.replaceState(null, '', window.location.pathname);
        showTemporaryMessage('');
    } else {
        await fetchGifts();
    }
}

// Functie om een toast/tijdelijk bericht te tonen
function showTemporaryMessage(message) {
    let toast = document.getElementById("toast-message");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast-message";
        toast.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #4CAF50;
            color: white;
            padding: 15px;
            border-radius: 5px;
            z-index: 1000;
            transition: opacity 0.5s ease-in-out;
            opacity: 0;
            text-align: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        `;
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    if (message) {
        toast.style.opacity = '1';
    } else {
        toast.style.opacity = '0';
    }
}

// ===== INITIALISATIE =====
document.addEventListener('DOMContentLoaded', () => {
    // Initialiseer de modal en formulier variabelen
    paymentModal = document.getElementById('paymentModal');
    closeBtn = document.querySelector('#paymentModal .close-btn');
    paymentForm = document.getElementById('paymentForm');

    // Roep de logica aan die de pagina op de juiste manier laadt
    handleInitialLoad();
    
    // Voeg event listener toe aan de gift grid om clicks te delegeren
    const giftGrid = document.getElementById('giftGrid');
    if (giftGrid) {
        giftGrid.addEventListener('click', handleContributeClick);
    }
    
    // Voeg event listeners toe aan de modal
    if (closeBtn) closeBtn.addEventListener('click', closePaymentModal);
    if (paymentModal) {
        window.addEventListener('click', (e) => {
            if (e.target === paymentModal) {
                closePaymentModal();
            }
        });
    }

    // Voeg event listener toe aan het formulier
    if (paymentForm) paymentForm.addEventListener('submit', handlePaymentFormSubmit);
    
    // Zoekbalk-functionaliteit
    setupSearch();
});