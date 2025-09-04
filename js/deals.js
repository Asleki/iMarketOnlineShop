// File: deals.js
// This script fetches and displays deals from multiple shops.

document.addEventListener('DOMContentLoaded', () => {
    const dealsList = document.getElementById('deals-list');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const shops = {
        'autogiant-motors': {
            url: 'data/autogiant-motors-products.json',
            dealCheck: (item) => item.vat_included === true,
            cardRenderer: (item) => createAutoGiantCard(item)
        },
        'click-n-get': {
            url: 'data/click-n-get-products.json',
            dealCheck: (item) => item.isDeals === true,
            cardRenderer: (item) => createClickNGetCard(item)
        },
        'joy-totes': {
            url: 'data/joy-totes.json',
            dealCheck: (item) => item.isDeals === true,
            cardRenderer: (item) => createJoyTotesCard(item)
        },
        'nashaa-kicks': {
            url: 'data/nashaa-kicks.json',
            dealCheck: (item) => item.isDeals === true,
            cardRenderer: (item) => createNashaaKicksCard(item)
        },
        'officetech-solutions': {
            url: 'data/officetech-solutions-products.json',
            dealCheck: (item) => item.discount_percent > 9,
            cardRenderer: (item) => createOfficeTechCard(item)
        },
        'soko-properties': {
            url: 'data/soko-properties-products.json',
            dealCheck: (item) => item.isDiscounted === true,
            cardRenderer: (item) => createSokoPropertiesCard(item)
        }
    };

    let allDeals = [];
    let dealsPerPage = 9; // Number of deals to show initially and on "Load More" click
    let currentPage = 0;

    /**
     * Fetches all products from all shops, filters for deals, and initializes the display.
     */
    async function loadAllDeals() {
        showLoadingIndicator();
        const fetchPromises = Object.entries(shops).map(([shopName, shopData]) =>
            fetch(shopData.url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Failed to fetch ${shopData.url}`);
                    }
                    return response.json();
                })
                .then(products => {
                    return products.filter(shopData.dealCheck).map(product => ({
                        ...product,
                        shopName: shopName,
                        shopRenderer: shopData.cardRenderer
                    }));
                })
                .catch(error => {
                    console.error(`Error loading deals for ${shopName}:`, error);
                    return []; // Return an empty array to prevent breaking the whole app
                })
        );

        const results = await Promise.all(fetchPromises);
        allDeals = results.flat();
        
        // Shuffle the deals for a randomized display
        allDeals.sort(() => Math.random() - 0.5);

        hideLoadingIndicator();
        renderDeals();
    }

    /**
     * Renders a batch of deals to the page.
     */
    function renderDeals() {
        const start = currentPage * dealsPerPage;
        const end = start + dealsPerPage;
        const dealsToRender = allDeals.slice(start, end);

        if (dealsToRender.length === 0) {
            dealsList.innerHTML = '<p class="text-center">No deals available at the moment. Check back later!</p>';
            loadMoreBtn.style.display = 'none';
            return;
        }

        dealsToRender.forEach(deal => {
            const card = deal.shopRenderer(deal);
            dealsList.appendChild(card);
        });

        currentPage++;

        if (currentPage * dealsPerPage >= allDeals.length) {
            loadMoreBtn.style.display = 'none';
        } else {
            loadMoreBtn.style.display = 'block';
        }
    }

    // --- Card Creation Functions (Page Specific) ---
    function createAutoGiantCard(deal) {
        const card = document.createElement('a');
        card.href = `autogiant-motors-product-details.html?id=${encodeURIComponent(deal.model)}`;
        card.className = 'product-card';
        card.innerHTML = `
            <div class="deal-badge">VAT Inclusive</div>
            <img src="${deal.car_display_image}" alt="${deal.make} ${deal.model}" class="product-image">
            <div class="product-info">
                <span class="shop-name">AutoGiant Motors</span>
                <h3>${deal.make} ${deal.model}</h3>
                <p class="deal-price">Ksh ${deal.price.toLocaleString()}</p>
                <div class="deal-details">
                    <p><strong>Status:</strong> VAT Included</p>
                </div>
            </div>
        `;
        return card;
    }

    function createClickNGetCard(deal) {
        const card = document.createElement('a');
        card.href = `click-n-get-product-details.html?id=${encodeURIComponent(deal.id)}`;
        card.className = 'product-card';
        const discountBadge = deal.isDiscounted ? `<div class="deal-badge">On Sale</div>` : '';
        const originalPriceHtml = deal.originalPrice ? `<span class="original-price">Ksh ${deal.originalPrice.toLocaleString()}</span>` : '';
        card.innerHTML = `
            ${discountBadge}
            <img src="${deal.images[0]}" alt="${deal.name}" class="product-image">
            <div class="product-info">
                <span class="shop-name">Click 'n Get</span>
                <h3>${deal.name}</h3>
                <p class="deal-price">Ksh ${deal.price.toLocaleString()}${originalPriceHtml}</p>
                <div class="deal-details">
                    <p><strong>Shipping:</strong> ${deal.shipping}</p>
                </div>
            </div>
        `;
        return card;
    }

    function createJoyTotesCard(deal) {
        const card = document.createElement('a');
        card.href = `joy-totes-product-details.html?id=${encodeURIComponent(deal.id)}`;
        card.className = 'product-card';
        card.innerHTML = `
            <div class="deal-badge">Deal</div>
            <img src="${deal.images[0]}" alt="${deal.name}" class="product-image">
            <div class="product-info">
                <span class="shop-name">Joy Totes</span>
                <h3>${deal.name}</h3>
                <p class="deal-price">KES ${deal.price.toLocaleString()}</p>
                <div class="deal-details">
                    <p><strong>Shipping:</strong> ${deal.shipping}</p>
                </div>
            </div>
        `;
        return card;
    }

    function createNashaaKicksCard(deal) {
        const card = document.createElement('a');
        card.href = `nashaa-kicks-product-details.html?id=${encodeURIComponent(deal.id)}`;
        card.className = 'product-card';
        card.innerHTML = `
            <div class="deal-badge">Deal</div>
            <img src="${deal.images[0]}" alt="${deal.name}" class="product-image">
            <div class="product-info">
                <span class="shop-name">Nashaa Kicks</span>
                <h3>${deal.name}</h3>
                <p class="deal-price">KES ${deal.price.toLocaleString()}</p>
                <div class="deal-details">
                    <p><strong>Shipping:</strong> ${deal.shipping}</p>
                </div>
            </div>
        `;
        return card;
    }

    function createOfficeTechCard(deal) {
        const card = document.createElement('a');
        card.href = `officetech-solutions-product-details.html?id=${encodeURIComponent(deal.item_id)}`;
        card.className = 'product-card';
        const discountAmount = deal.price_ksh * (deal.discount_percent / 100);
        const newPrice = deal.price_ksh - discountAmount;
        card.innerHTML = `
            <div class="deal-badge">${deal.discount_percent}% Off</div>
            <img src="${deal.product_image_url}" alt="${deal.name}" class="product-image">
            <div class="product-info">
                <span class="shop-name">OfficeTech Solutions</span>
                <h3>${deal.name}</h3>
                <p class="deal-price">Ksh ${newPrice.toLocaleString()}<span class="original-price">Ksh ${deal.price_ksh.toLocaleString()}</span></p>
            </div>
        `;
        return card;
    }

    function createSokoPropertiesCard(deal) {
        const card = document.createElement('a');
        card.href = `soko-properties-product-details.html?id=${encodeURIComponent(deal.propertyId)}`;
        card.className = 'product-card';
        card.innerHTML = `
            <div class="deal-badge">Discounted</div>
            <img src="${deal.images[0]}" alt="${deal.title}" class="product-image">
            <div class="product-info">
                <span class="shop-name">Soko Properties</span>
                <h3>${deal.title}</h3>
                <p class="deal-price">KES ${deal.price.amount.toLocaleString()}</p>
                <div class="deal-details">
                    <p><strong>Bedrooms:</strong> ${deal.bedrooms}</p>
                    <p><strong>Location:</strong> ${deal.location.city}</p>
                </div>
            </div>
        `;
        return card;
    }

    // Simple loading indicator functions
    function showLoadingIndicator() {
        dealsList.innerHTML = '<p class="text-center">Loading deals...</p>';
    }

    function hideLoadingIndicator() {
        dealsList.innerHTML = '';
    }

    // Event listeners
    loadMoreBtn.addEventListener('click', renderDeals);

    // Initial load of deals
    loadAllDeals();
});