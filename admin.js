// admin.js
// ===== SUPABASE CLIENT & CONFIGURATIE =====
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://wixtfldcnmfmpqvwyotv.supabase.co'; // Vervang met jouw Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpeHRmbGRjbm1mbXBxdnd5b3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNDA2NjQsImV4cCI6MjA3MTYxNjY2NH0.x34CuRhuR5j6-iRNne6LIWegZiCLxJXODm6WhlRplAI'; // Vervang met jouw anon key
const BUCKET_NAME = 'gift-images'; // De naam van de Supabase Storage bucket

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== REFERENTIES NAAR HTML-ELEMENTEN =====
let adminGiftGrid;
let addGiftBtn;
let editGiftModal;
let closeBtn;
let modalTitle;
let editGiftForm;
let giftIdInput;
let titleInput;
let descriptionInput;
let priceInput;
let imageInput;
let imageFileInput;
let submitBtn;
let messageEl;

// ===== FUNCTIES VOOR DATA OPHALEN EN WEERGEVEN =====
async function fetchAndRenderGifts() {
    if (messageEl) {
        messageEl.textContent = '';
    }
    if (adminGiftGrid) {
        adminGiftGrid.innerHTML = '<p class="loading-message">Laden van cadeaus...</p>';
    }
    
    const { data: gifts, error } = await supabase.from('gifts').select('*');

    if (error) {
        console.error('Fout bij het ophalen van cadeaus:', error);
        if (adminGiftGrid) {
            adminGiftGrid.innerHTML = `<p class="error-message">Fout bij het laden van cadeaus: ${error.message}</p>`;
        }
        return;
    }

    renderGifts(gifts);
}

function renderGifts(gifts) {
    if (!adminGiftGrid) return;

    adminGiftGrid.innerHTML = '';
    if (!gifts || gifts.length === 0) {
        adminGiftGrid.innerHTML = '<p class="loading-message">Er zijn nog geen cadeaus toegevoegd.</p>';
        return;
    }

    gifts.forEach(gift => {
        const giftCard = document.createElement('div');
        giftCard.className = 'gift-card';
        giftCard.dataset.id = gift.id;

        // Gebruik een betrouwbare placeholder URL als de afbeelding ontbreekt
        const imageUrl = gift.image_url && gift.image_url.trim() !== ''
            ? gift.image_url
            : 'https://placehold.co/250x250/E0E0E0/333333?text=Geen+Afbeelding';
        
        giftCard.innerHTML = `
            <img src="${imageUrl}" alt="${gift.title}">
            <div class="gift-card-content">
                <h3>${gift.title}</h3>
                <p>${gift.description}</p>
                <p class="amount-text">Huidig: ${(gift.current_amount).toFixed(2)}€ / Doel: ${gift.target_amount.toFixed(2)}€</p>
                <div class="card-actions">
                    <button class="edit-btn" data-id="${gift.id}">Bewerken</button>
                    <button class="delete-btn" data-id="${gift.id}">Verwijderen</button>
                </div>
            </div>
        `;
        adminGiftGrid.appendChild(giftCard);
    });
}

// ===== MODAL FUNCTIES =====
function openModal(gift = null) {
    if (messageEl) {
        messageEl.textContent = '';
    }
    if (editGiftForm) {
        editGiftForm.reset();
    }
    
    if (gift) {
        modalTitle.textContent = 'Cadeau bewerken';
        submitBtn.textContent = 'Wijzigingen opslaan';
        giftIdInput.value = gift.id;
        titleInput.value = gift.title;
        descriptionInput.value = gift.description;
        priceInput.value = gift.target_amount;
        imageInput.value = gift.image_url;
    } else {
        modalTitle.textContent = 'Nieuw cadeau toevoegen';
        submitBtn.textContent = 'Cadeau toevoegen';
        giftIdInput.value = '';
    }
    if (editGiftModal) {
        editGiftModal.style.display = 'flex';
    }
}

function closeModal() {
    if (editGiftModal) {
        editGiftModal.style.display = 'none';
    }
}

// ===== INITIALISATIE EN EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
    // Definieer de referenties NA het laden van de pagina
    adminGiftGrid = document.getElementById('adminGiftGrid');
    addGiftBtn = document.getElementById('addGiftBtn');
    editGiftModal = document.getElementById('editGiftModal');
    closeBtn = editGiftModal ? editGiftModal.querySelector('.close-btn') : null;
    modalTitle = document.getElementById('modalTitle');
    editGiftForm = document.getElementById('editGiftForm');
    giftIdInput = document.getElementById('giftId');
    titleInput = document.getElementById('title');
    descriptionInput = document.getElementById('description');
    priceInput = document.getElementById('price');
    imageInput = document.getElementById('image_url');
    imageFileInput = document.getElementById('image_file');
    submitBtn = editGiftForm ? editGiftForm.querySelector('.submit-btn') : null;
    messageEl = document.getElementById('message');

    // Haal de cadeaus op en render ze
    fetchAndRenderGifts();
    
    // Voeg event listeners toe
    if (addGiftBtn) {
        addGiftBtn.addEventListener('click', () => {
            openModal();
        });
    }

    if (adminGiftGrid) {
        adminGiftGrid.addEventListener('click', async (e) => {
            // Bewerk-knop
            if (e.target.classList.contains('edit-btn')) {
                const giftId = e.target.dataset.id;
                const { data: gift, error } = await supabase.from('gifts').select('*').eq('id', giftId).single();
                if (error) {
                    console.error('Fout bij het ophalen van cadeau voor bewerken:', error);
                    if (messageEl) {
                        messageEl.textContent = '❌ Fout bij het laden van cadeaugegevens.';
                        messageEl.style.color = 'red';
                    }
                    return;
                }
                openModal(gift);
            }
            // Verwijder-knop
            if (e.target.classList.contains('delete-btn')) {
                if (confirm('Weet je zeker dat je dit cadeau wilt verwijderen?')) {
                    const giftId = e.target.dataset.id;
                    const { error } = await supabase.from('gifts').delete().eq('id', giftId);
                    if (error) {
                        console.error('Fout bij het verwijderen:', error);
                        alert('❌ Fout bij het verwijderen van het cadeau.');
                    } else {
                        fetchAndRenderGifts(); // Herlaad de lijst
                    }
                }
            }
        });
    }

    if (editGiftForm) {
        editGiftForm.addEventListener('submit', async (e) => {
            e.preventDefault();
        
            if (messageEl) {
                messageEl.textContent = 'Bezig met verwerken...';
                messageEl.style.color = '#333';
            }
        
            const isEditing = !!giftIdInput.value;
        
            let imageUrl = imageInput.value;
        
            if (imageFileInput.files.length > 0) {
                const file = imageFileInput.files[0];
                const filePath = `gifts/${Date.now()}_${file.name}`;
        
                try {
                    const { error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file);
        
                    if (uploadError) {
                        throw uploadError;
                    }
        
                    const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
                    imageUrl = publicUrlData.publicUrl;
        
                } catch (error) {
                    console.error('Fout bij het uploaden van de afbeelding:', error);
                    if (messageEl) {
                        messageEl.textContent = '❌ Fout bij het uploaden van de afbeelding.';
                        messageEl.style.color = 'red';
                    }
                    return;
                }
            } else if (!imageInput.value && !isEditing) {
                imageUrl = 'https://via.placeholder.com/250';
            }
        
            const giftData = {
                title: titleInput.value,
                description: descriptionInput.value,
                target_amount: parseFloat(priceInput.value) || 0, 
                image_url: imageUrl
            };
        
            let result, error;
        
            if (isEditing) {
                ({ data: result, error } = await supabase
                    .from('gifts')
                    .update(giftData)
                    .eq('id', giftIdInput.value));
            } else {
                ({ data: result, error } = await supabase
                    .from('gifts')
                    .insert([{
                        ...giftData,
                        current_amount: 0.00
                    }]));
            }
        
            if (error) {
                console.error('Supabase error:', error);
                if (messageEl) {
                    messageEl.textContent = '❌ Fout: ' + error.message;
                    messageEl.style.color = 'red';
                }
            } else {
                if (messageEl) {
                    messageEl.textContent = `✅ Cadeau succesvol ${isEditing ? 'bijgewerkt' : 'toegevoegd'}!`;
                    messageEl.style.color = 'green';
                }
                editGiftForm.reset();
                closeModal();
                fetchAndRenderGifts();
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    window.addEventListener('click', (e) => {
        if (e.target === editGiftModal) {
            closeModal();
        }
    });
});