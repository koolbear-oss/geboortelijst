// admin.js
// ===== SUPABASE CLIENT & CONFIGURATIE =====
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://wixtfldcnmfmpqvwyotv.supabase.co'; // Vervang met jouw Supabase URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndpeHRmbGRjbm1mbXBxdnd5b3R2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNDA2NjQsImV4cCI6MjA3MTYxNjY2NH0.x34CuRhuR5j6-iRNne6LIWegZiCLxJXODm6WhlRplAI'; // Vervang met jouw anon key
const BUCKET_NAME = 'gift-images'; // De naam van de Supabase Storage bucket

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== REFERENTIES NAAR HTML-ELEMENTEN =====
const adminGiftGrid = document.getElementById('adminGiftGrid');
const addGiftBtn = document.getElementById('addGiftBtn');
const editGiftModal = document.getElementById('editGiftModal');
const closeBtn = editGiftModal.querySelector('.close-btn');
const modalTitle = document.getElementById('modalTitle');
const editGiftForm = document.getElementById('editGiftForm');
const giftIdInput = document.getElementById('giftId');
const titleInput = document.getElementById('title');
const descriptionInput = document.getElementById('description');
const priceInput = document.getElementById('price');
const imageInput = document.getElementById('image_url');
const imageFileInput = document.getElementById('image_file'); // Nieuw input veld
const submitBtn = editGiftForm.querySelector('.submit-btn');
const messageEl = document.getElementById('message');

// ===== FUNCTIES VOOR DATA OPHALEN EN WEERGEVEN =====
async function fetchAndRenderGifts() {
    messageEl.textContent = '';
    adminGiftGrid.innerHTML = '<p class="loading-message">Laden van cadeaus...</p>';
    
    const { data: gifts, error } = await supabase.from('gifts').select('*');

    if (error) {
        console.error('Fout bij het ophalen van cadeaus:', error);
        adminGiftGrid.innerHTML = `<p class="error-message">Fout bij het laden van cadeaus: ${error.message}</p>`;
        return;
    }

    renderGifts(gifts);
}

function renderGifts(gifts) {
    adminGiftGrid.innerHTML = '';
    if (!gifts || gifts.length === 0) {
        adminGiftGrid.innerHTML = '<p class="loading-message">Er zijn nog geen cadeaus toegevoegd.</p>';
        return;
    }

    gifts.forEach(gift => {
        const giftCard = document.createElement('div');
        giftCard.className = 'gift-card';
        giftCard.dataset.id = gift.id;
        giftCard.innerHTML = `
            <img src="${gift.image_url}" alt="${gift.title}" onerror="this.src='https://via.placeholder.com/250'">
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
    messageEl.textContent = '';
    editGiftForm.reset();
    
    if (gift) {
        // Modus: Bewerken
        modalTitle.textContent = 'Cadeau bewerken';
        submitBtn.textContent = 'Wijzigingen opslaan';
        giftIdInput.value = gift.id;
        titleInput.value = gift.title;
        descriptionInput.value = gift.description;
        priceInput.value = gift.target_amount;
        imageInput.value = gift.image_url;
    } else {
        // Modus: Toevoegen
        modalTitle.textContent = 'Nieuw cadeau toevoegen';
        submitBtn.textContent = 'Cadeau toevoegen';
        giftIdInput.value = '';
    }
    editGiftModal.style.display = 'flex';
}

function closeModal() {
    editGiftModal.style.display = 'none';
}

// ===== EVENT LISTENERS =====
document.addEventListener('DOMContentLoaded', () => {
    fetchAndRenderGifts();
});

addGiftBtn.addEventListener('click', () => {
    openModal();
});

adminGiftGrid.addEventListener('click', async (e) => {
    // Bewerk-knop
    if (e.target.classList.contains('edit-btn')) {
        const giftId = e.target.dataset.id;
        const { data: gift, error } = await supabase.from('gifts').select('*').eq('id', giftId).single();
        if (error) {
            console.error('Fout bij het ophalen van cadeau voor bewerken:', error);
            messageEl.textContent = '❌ Fout bij het laden van cadeaugegevens.';
            messageEl.style.color = 'red';
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

editGiftForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    messageEl.textContent = 'Bezig met verwerken...';
    messageEl.style.color = '#333';

    const isEditing = !!giftIdInput.value;

    let imageUrl = imageInput.value; // Gebruik de URL uit het tekstveld als fallback

    // Controleer of er een nieuw bestand is geüpload
    if (imageFileInput.files.length > 0) {
        const file = imageFileInput.files[0];
        const filePath = `gifts/${Date.now()}_${file.name}`; // Creëer een unieke bestandsnaam

        try {
            // Upload de afbeelding naar Supabase Storage
            const { data, error: uploadError } = await supabase.storage.from(BUCKET_NAME).upload(filePath, file);

            if (uploadError) {
                throw uploadError;
            }

            // Haal de publieke URL op
            const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
            imageUrl = publicUrlData.publicUrl;

        } catch (error) {
            console.error('Fout bij het uploaden van de afbeelding:', error);
            messageEl.textContent = '❌ Fout bij het uploaden van de afbeelding.';
            messageEl.style.color = 'red';
            return;
        }
    }

    const giftData = {
        title: titleInput.value,
        description: descriptionInput.value,
        target_amount: parseFloat(priceInput.value),
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
        messageEl.textContent = '❌ Fout: ' + error.message;
        messageEl.style.color = 'red';
    } else {
        messageEl.textContent = `✅ Cadeau succesvol ${isEditing ? 'bijgewerkt' : 'toegevoegd'}!`;
        messageEl.style.color = 'green';
        editGiftForm.reset();
        closeModal();
        fetchAndRenderGifts();
    }
});

closeBtn.addEventListener('click', closeModal);
window.addEventListener('click', (e) => {
    if (e.target === editGiftModal) {
        closeModal();
    }
});