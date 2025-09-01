//
// File: js/shops.js
// -------------------------------------------------
// This script provides dynamic functionality for the shops directory page.
// It fetches all shops data, populates a grid, and manages a shop details modal.
//

// This code is now wrapped in the 'partialsLoaded' event listener,
// ensuring the header and footer are on the page before we try to use them.
document.addEventListener('partialsLoaded', () => {
    // =========================================================
    // Dynamic Header Spacing
    // =========================================================
    function adjustMainContentPadding() {
        // Corrected selector to find the header element directly by its ID
        const header = document.getElementById('main-header-placeholder');
        const mainContent = document.getElementById('main-content');
        
        if (header && mainContent) {
            const headerHeight = header.offsetHeight;
            mainContent.style.paddingTop = `${headerHeight}px`;
            console.log(`Header height is ${headerHeight}px. Applied padding-top to main content.`);
        }
    }

    // Call the function initially and on window resize
    adjustMainContentPadding();
    window.addEventListener('resize', adjustMainContentPadding);

    // =========================================================
    // Fetch and Render All Shops
    // =========================================================
    async function loadAllShops() {
        try {
            const response = await fetch('data/shops.json');
            if (!response.ok) {
                throw new Error('Failed to fetch shops data.');
            }
            const shops = await response.json();
            renderShopsGrid(shops);
        } catch (error) {
            console.error('Error loading shops data:', error);
            displayMessage('An error occurred while loading the shops. Please try again later.');
        }
    }

    function renderShopsGrid(shops) {
        const shopsGrid = document.getElementById('shops-grid');
        if (!shopsGrid) return;
        
        shopsGrid.innerHTML = ''; // Clear any existing content

        if (shops.length === 0) {
            displayMessage('No shops are currently available.');
            return;
        }

        shops.forEach(shop => {
            const shopCard = createShopCard(shop);
            shopsGrid.appendChild(shopCard);
        });
    }

    function createShopCard(shop) {
        const card = document.createElement('div');
        card.className = 'shop-card';
        card.setAttribute('data-shop-id', shop.shop_id);
        
        card.innerHTML = `
            <div class="shop-logo-container">
                <img src="${shop.logo_url}" alt="${shop.name} logo" class="shop-logo">
            </div>
            <div class="shop-details-summary">
                <h3 class="shop-name">${shop.name}</h3>
                <p class="shop-address"><i class="fas fa-map-marker-alt"></i> ${shop.contact_info ? shop.contact_info.address : 'Location not specified'}</p>
                <p class="shop-category"><i class="fas fa-tags"></i> ${shop.categories.join(', ')}</p>
            </div>
        `;

        // Add event listener to open the modal when the card is clicked
        card.addEventListener('click', () => showShopModal(shop));
        
        return card;
    }

    // =========================================================
    // Modal Logic
    // =========================================================
    const modal = document.getElementById('shop-modal');
    const modalContent = document.getElementById('modal-shop-details');
    const closeBtn = document.querySelector('.close-btn');

    function showShopModal(shop) {
        modalContent.innerHTML = `
            <div class="modal-shop-header">
                <img src="${shop.logo_url}" alt="${shop.name} logo" class="modal-shop-logo">
                <div>
                    <h2>${shop.name}</h2>
                    <p class="modal-shop-description">${shop.description}</p>
                </div>
            </div>
            <div class="modal-shop-info">
                <p><i class="fas fa-map-marker-alt"></i> <strong>Address:</strong> ${shop.contact_info ? shop.contact_info.address : 'Not specified'}</p>
                ${shop.contact_info && shop.contact_info.email ? `<p><i class="fas fa-envelope"></i> <strong>Email:</strong> <a href="mailto:${shop.contact_info.email}">${shop.contact_info.email}</a></p>` : ''}
                ${shop.contact_info && shop.contact_info.phone ? `<p><i class="fas fa-phone"></i> <strong>Phone:</strong> <a href="tel:${shop.contact_info.phone}">${shop.contact_info.phone}</a></p>` : ''}
                <p><i class="fas fa-tags"></i> <strong>Categories:</strong> ${shop.categories.join(', ')}</p>
            </div>
            <div class="modal-shop-actions">
                <a href="${shop.shopPageUrl}" class="btn btn-primary">Visit Shop</a>
            </div>
        `;
        modal.style.display = 'block';
    }

    // Close the modal when the user clicks on the 'x' button
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    // Close the modal when the user clicks anywhere outside of it
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    // =========================================================
    // Helper Functions
    // =========================================================
    function displayMessage(message) {
        const shopsGrid = document.getElementById('shops-grid');
        if (shopsGrid) {
            shopsGrid.innerHTML = `<p class="text-center">${message}</p>`;
        }
    }

    // =========================================================
    // Initialization
    // =========================================================
    loadAllShops();
});