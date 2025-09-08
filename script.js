// ===== SUPABASE API CONFIGURATIE =====
// Maak verbinding met Supabase om de cadeau-data op te halen
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://wixtfldcnmfmpqvwyotv.supabase.co'; // Vervang met jouw Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpeHRmbGRjbm1mbXBxdnd5b3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNDA2NjQsImV4cCI6MjA3MTYxNjY2NH0.x34CuRhuR5j6-iRNne6LIWegZiCLxJXODm6WhlRplAI'; // Vervang met jouw anon key

// Initialiseer de Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


// ===== PAGINA INITIALISATIE EN DATA OPHALEN =====
let allGifts = [];

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
    
    // Sla de gifts array globaal op zodat we deze later kunnen benaderen
    allGifts = gifts;
    renderGifts(allGifts);
}

// Functie om de terugkeer van de betaling af te handelen
function handleReturnFromPayment() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('status');

    if (paymentStatus === 'success') {
        console.log('Payment successful. Updating gift list...');
        // Verwijder de URL-parameter
        history.replaceState({}, document.title, window.location.pathname);
        // Roep de functie aan om de cadeaus opnieuw op te halen
        fetchGifts();
    }
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
        giftCard.dataset.id = gift.id; // Voeg de gift ID toe als data-attribuut

        // Bereken het percentage, zorg ervoor dat het niet boven 100% uitkomt
        const percentage = gift.target_amount > 0 ? Math.min((gift.current_amount / gift.target_amount) * 100, 100).toFixed(0) : 0;
        const isFunded = gift.current_amount >= gift.target_amount;

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

// ===== INTERACTIEVE FUNCTIES EN MODALS =====
const paymentModal = document.getElementById('paymentModal');
const closeBtn = paymentModal.querySelector('.close-btn');
const paymentForm = document.getElementById('paymentForm');

// Open de modal en vul deze met de cadeau-details
function openPaymentModal(gift) {
    document.getElementById('modal-image').src = gift.image_url;
    document.getElementById('modal-title').textContent = gift.title;
    document.getElementById('giftIdInput').value = gift.id;

    // Reset het formulier
    paymentForm.reset();
    
    // Toon de modal
    paymentModal.style.display = 'flex';
}

// Sluit de modal
function closePaymentModal() {
    paymentModal.style.display = 'none';
}

// Verwerk de klik op de 'Bijdragen' knop
function handleContributeClick(e) {
    if (e.target.classList.contains('contribute-btn')) {
        const giftCard = e.target.closest('.gift-card');
        const giftId = giftCard.dataset.id;
        
        // Zoek het cadeau in de gifts array (deze is globaal gezet in renderGifts)
        const gift = allGifts.find(g => g.id == giftId);
        if (gift) {
            openPaymentModal(gift);
        }
    }
}

// Functie om de betaling te initiëren via de Netlify Function (Mollie)
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
        // Roep de Mollie-functie aan op je Netlify project
        const response = await fetch('/.netlify/functions/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                giftId: giftId,
                amount: amount,
                name: name,
                email: email
            })
        });

        const data = await response.json();

        if (response.ok) {
            // Doorverwijzen naar de Mollie betaalpagina
            window.location.href = data.checkoutUrl;
        } else {
            // Toon een foutmelding
            alert(`Er is een fout opgetreden: ${data.error}`);
            console.error('API Error:', data.error);
        }

    } catch (error) {
        console.error('Fetch Error:', error);
        alert('Er is een verbindingsfout opgetreden.');
    }
}

// ===== BETAALFUNCTIES =====
async function initiatePayment(giftId, amount, name, email) {
    try {
        const gift = allGifts.find(g => g.id === giftId);
        const giftTitle = gift ? gift.title : 'Onbekend Cadeau';

        const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
            method: 'POST',
            body: JSON.stringify({
                title: giftTitle,
                amount: parseFloat(amount).toFixed(2),
                email: email
            }),
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });

        if (!response.ok) {
            const data = await response.json();
            console.error('API Error:', data);
            alert('Er is een fout opgetreden: ' + (data.error || 'Onbekende fout'));
            return;
        }

        // Als de e-mail succesvol is verzonden, toont de functie een succesvolle betalingspagina.
        // Dit is een placeholder voor de daadwerkelijke betalingsintegratie die je later wilt toevoegen.
        alert('Bedankt! Je e-mail is succesvol verzonden.');
        
        // Optioneel: sluit de modal en ververs de pagina
        closePaymentModal();
        fetchGifts();

    } catch (error) {
        console.error('Fetch Error:', error);
        alert('Er is een verbindingsfout opgetreden.');
    }
}

// ===== INITIALISATIE =====
document.addEventListener('DOMContentLoaded', () => {
    // Check de URL bij het laden van de pagina voor een succesvolle betaling
    handleReturnFromPayment();
    // Laad de cadeaus van Supabase
    fetchGifts();
    
    // Voeg event listener toe aan de gift grid om clicks te delegeren
    const giftGrid = document.getElementById('giftGrid');
    if (giftGrid) {
        giftGrid.addEventListener('click', handleContributeClick);
    }

    // Zoekbalk-functionaliteit voor de publieke pagina
    const searchInput = document.getElementById('searchInput');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const giftCards = document.getElementById('giftGrid').querySelectorAll('.gift-card');
            
            giftCards.forEach(card => {
                const title = card.querySelector('h3').textContent.toLowerCase();
                const description = card.querySelector('p').textContent.toLowerCase();
                
                if (title.includes(query) || description.includes(query)) {
                    card.style.display = 'flex';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
    
    // Voeg event listeners toe aan de modal
    const amountInput = document.getElementById('amountInput');
    closeBtn.addEventListener('click', closePaymentModal);
    window.addEventListener('click', (e) => {
        if (e.target === paymentModal) {
            closePaymentModal();
        }
    });

    // Voeg event listener toe aan het formulier
    paymentForm.addEventListener('submit', handlePaymentFormSubmit);
});