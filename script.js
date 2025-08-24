// ===== CADEAU DATA =====
// Hier definiëren we alle cadeaus met hun informatie
const gifts = [
    {
        id: 'kinderwagen',
        title: 'Kinderwagen Premium',
        description: 'Een luxe kinderwagen met alle comfort voor onze kleine. Inclusief regenhoes en verschoontas.',
        price: 450.00,
        image: 'images/kinderwagen.jpg',
        currentAmount: 125.00, // Dit zou later dynamisch worden opgehaald
        targetAmount: 450.00
    },
    {
        id: 'autostoel',
        title: 'Autostoel 0-18 maanden',
        description: 'Veilige autostoel die meegroeit van baby tot peuter. Gecertificeerd volgens laatste veiligheidsnormen.',
        price: 280.00,
        image: 'images/autostoel.jpg',
        currentAmount: 280.00, // Volledig betaald - voor demo
        targetAmount: 280.00
    },
    {
        id: 'ledikant',
        title: 'Baby Ledikant',
        description: 'Stijlvol houten ledikant dat later omgebouwd kan worden tot peuterbed. Inclusief matras.',
        price: 320.00,
        image: 'images/ledikant.jpg',
        currentAmount: 0.00, // Nog niets betaald
        targetAmount: 320.00
    },
    {
        id: 'babyfoon',
        title: 'Video Babyfoon',
        description: 'Moderne babyfoon met video, app-bediening en nachtzicht. Voor extra gemoedsrust.',
        price: 150.00,
        image: 'images/babyfoon.jpg',
        currentAmount: 87.50, // Gedeeltelijk betaald
        targetAmount: 150.00
    }
];

// ===== BACKEND API CONFIGURATIE =====
// Nu gebruiken we onze veilige Netlify functions in plaats van directe Mollie calls
const API_BASE = window.location.origin + '/.netlify/functions';

// ===== DOM MANIPULATIE =====
// Functie om alle cadeaus te renderen op de pagina
function renderGifts() {
    const giftGrid = document.getElementById('giftGrid');
    
    // Maak HTML voor elk cadeau
    giftGrid.innerHTML = gifts.map(gift => {
        const percentage = Math.min((gift.currentAmount / gift.targetAmount) * 100, 100);
        const remaining = Math.max(gift.targetAmount - gift.currentAmount, 0);
        const isCompleted = gift.currentAmount >= gift.targetAmount;
        
        return `
            <div class="gift-card" data-gift-id="${gift.id}">
                <img src="${gift.image}" alt="${gift.title}" class="gift-image" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkFmYmVlbGRpbmcgbmlldCBnZXZvbmRlbjwvdGV4dD48L3N2Zz4='">
                
                <div class="gift-content">
                    <h3 class="gift-title">${gift.title}</h3>
                    <p class="gift-description">${gift.description}</p>
                    <div class="gift-price">€${gift.price.toFixed(2)}</div>
                    
                    <div class="progress-container">
                        <div class="progress-label">
                            <span>Voortgang</span>
                            <span>€${gift.currentAmount.toFixed(2)} / €${gift.targetAmount.toFixed(2)}</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${percentage}%"></div>
                        </div>
                        <div style="text-align: center; margin-top: 0.5rem; font-size: 0.9rem; color: #4a5568;">
                            ${isCompleted ? '🎉 Volledig gefinancierd!' : `Nog €${remaining.toFixed(2)} nodig`}
                        </div>
                    </div>
                    
                    <button class="contribute-btn" 
                            onclick="initiatePayment('${gift.id}')"
                            ${isCompleted ? 'disabled' : ''}>
                        ${isCompleted ? '✓ Voltooid' : 'Bijdragen'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ===== BETAALFUNCTIES =====
// Functie om een betaling te starten via onze veilige backend
async function initiatePayment(giftId) {
    const gift = gifts.find(g => g.id === giftId);
    if (!gift) {
        alert('Cadeau niet gevonden!');
        return;
    }
    
    // Vraag gebruiker om bijdrage bedrag
    const remaining = gift.targetAmount - gift.currentAmount;
    const suggestedAmount = Math.min(50, remaining); // Stel €50 voor, of het restbedrag
    
    let amount = prompt(
        `Hoeveel wil je bijdragen aan "${gift.title}"?\n\n` +
        `Nog nodig: €${remaining.toFixed(2)}\n` +
        `Voer bedrag in (bijv. ${suggestedAmount}):`,
        suggestedAmount.toString()
    );
    
    if (!amount || amount <= 0) return;
    
    amount = parseFloat(amount);
    if (isNaN(amount) || amount <= 0) {
        alert('Voer een geldig bedrag in!');
        return;
    }
    
    // Toon loading modal
    showLoadingModal(true);
    
    try {
        // Roep onze veilige backend functie aan
        const response = await fetch(`${API_BASE}/create-payment`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                giftId: giftId,
                amount: amount
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Onbekende fout bij het aanmaken van de betaling');
        }
        
        if (result.checkoutUrl) {
            // Redirect naar echte Mollie checkout
            console.log('✅ Betaling aangemaakt:', result.paymentId);
            console.log('💰 Bedrag:', result.amount);
            window.location.href = result.checkoutUrl;
        } else {
            throw new Error('Geen checkout URL ontvangen');
        }
        
    } catch (error) {
        console.error('Betaling fout:', error);
        alert(`Er ging iets mis: ${error.message}`);
        showLoadingModal(false);
    }
}

// ===== INITIALISATIE =====
// Start de applicatie wanneer de pagina geladen is
document.addEventListener('DOMContentLoaded', function() {
    console.log('🍼 Geboortelijst applicatie gestart');
    console.log('🔒 Veilige backend integratie actief via Netlify Functions');
    
    // Render alle cadeaus
    renderGifts();
    
    // Check of er een betaling succesvol was
    checkPaymentSuccess();
});