// File: autogiant-motors.js
// This script handles all dynamic content and functionality for the AutoGiant Motors homepage.

document.addEventListener('DOMContentLoaded', () => {

    const vehicleContainer = document.getElementById('vehicles-list');
    const partsContainer = document.getElementById('parts-list');
    const motorcyclesContainer = document.getElementById('motorcycles-list');
    const featuredContainer = document.getElementById('featured-products-list');

    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const searchSuggestions = document.getElementById('searchSuggestions');

    const productsToShow = 6; // Number of products to show per category on the homepage

    // Store all products from all JSON files
    let allProducts = [];
    let vehicles = [];
    let parts = [];
    let motorcycles = [];

    /**
     * Hides the cart icon from the iMarket header.
     * This function should be called after the header has loaded.
     */
    function hideCartIcon() {
        const cartIcon = document.querySelector('.iMarket_cart_icon');
        if (cartIcon) {
            cartIcon.style.display = 'none';
        }
    }
    
    /**
     * Watches for changes in the DOM to hide the cart icon once the header is loaded.
     */
    const observer = new MutationObserver((mutations, obs) => {
        const headerPlaceholder = document.getElementById('main-header-placeholder');
        if (headerPlaceholder && headerPlaceholder.children.length > 0) {
            // The header has been loaded, now we can hide the icon
            hideCartIcon();
            obs.disconnect(); // Stop observing once the task is complete
        }
    });

    // Start observing the header placeholder element for child additions
    const headerPlaceholder = document.getElementById('main-header-placeholder');
    if (headerPlaceholder) {
        observer.observe(headerPlaceholder, {
            childList: true
        });
    }


    /**
     * Fetches product data from all JSON files.
     * @returns {Promise<void>}
     */
    async function fetchAllData() {
        showLoadingIndicators();
        
        const vehicleUrl = 'data/autogiant-motors-products.json';
        const partsUrl = 'data/autogiant-motors-automotive-parts.json';
        const motorcyclesUrl = 'data/autogiant-motors-motorcycles.json';

        try {
            const [vehicleData, partsData, motorcyclesData] = await Promise.all([
                fetch(vehicleUrl).then(res => res.json()),
                fetch(partsUrl).then(res => res.json()),
                fetch(motorcyclesUrl).then(res => res.json())
            ]);

            // Assign categories and combine into a single array for search
            vehicles = vehicleData.map(item => ({ ...item, category: 'Vehicles' }));
            parts = partsData.map(item => ({ ...item, category: 'Automotive Parts' }));
            motorcycles = motorcyclesData.map(item => ({ ...item, category: 'Motorcycles' }));

            allProducts = [...vehicles, ...parts, ...motorcycles];
            
            // Sort products by dateAdded for displaying the latest ones first
            allProducts.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));

            renderAllSections();
            hideLoadingIndicators();

        } catch (error) {
            console.error('Error fetching data:', error);
            // Display an error message to the user
            const mainContent = document.querySelector('.autogiant-motors-page');
            if (mainContent) {
                mainContent.innerHTML = `<p class="text-center">Failed to load products. Please try again later.</p>`;
            }
        }
    }

    /**
     * Renders products for each section of the homepage.
     */
    function renderAllSections() {
        const featuredProducts = allProducts.filter(p => p.isFeatured).slice(0, productsToShow);
        const latestVehicles = vehicles.slice(0, productsToShow);
        const latestParts = parts.slice(0, productsToShow);
        const latestMotorcycles = motorcycles.slice(0, productsToShow);

        renderProducts(featuredProducts, featuredContainer);
        renderProducts(latestVehicles, vehicleContainer);
        renderProducts(latestParts, partsContainer);
        renderProducts(latestMotorcycles, motorcyclesContainer);
    }

    /**
     * Renders a list of products to a specific container.
     * @param {Array} products - The array of product objects to render.
     * @param {HTMLElement} container - The container element to render into.
     */
    function renderProducts(products, container) {
        if (!container) return; // Prevent errors if container is not found

        container.innerHTML = ''; // Clear existing content
        if (products.length === 0) {
            container.innerHTML = '<p class="text-center">No products available in this category.</p>';
            return;
        }

        products.forEach(product => {
            const card = createProductCard(product);
            container.appendChild(card);
        });
    }

    /**
     * Creates a single product card HTML element.
     * @param {Object} product - The product data object.
     * @returns {HTMLElement} The created product card element.
     */
    function createProductCard(product) {
        const card = document.createElement('a');
        card.href = `autogiant-motors-product-details.html?id=${encodeURIComponent(product.id || product.model)}`;
        card.className = 'product-card';

        const imageSrc = product.images ? product.images[0] : (product.car_display_image || 'https://placehold.co/600x400/CCCCCC/000000?text=Image+Not+Found');
        const name = product.name || `${product.make} ${product.model}`;
        const price = product.price || product.price_ksh;

        let badges = [];
        if (product.isFeatured) {
            badges.push(`<span class="badge featured"><i class="fas fa-star"></i> Featured</span>`);
        }
        if (product.isDeals) {
            badges.push(`<span class="badge deal">Deal</span>`);
        }
        if (product.isDiscounted && product.discount_percent) {
             badges.push(`<span class="badge deal">${product.discount_percent}% Off</span>`);
        }
        if (product.vat_included) {
            badges.push(`<span class="badge deal">VAT Inc.</span>`);
        }

        const badgesHtml = badges.length > 0 ? `<div class="badges">${badges.join('')}</div>` : '';
        const originalPriceHtml = product.originalPrice ? `<span class="original-price">Ksh ${product.originalPrice.toLocaleString()}</span>` : '';
        const displayedPrice = product.price ? product.price.toLocaleString() : (product.price_ksh ? product.price_ksh.toLocaleString() : 'N/A');

        card.innerHTML = `
            ${badgesHtml}
            <img src="${imageSrc}" alt="${name}" class="product-image">
            <div class="product-info">
                <h3>${name}</h3>
                <p class="price">Ksh ${displayedPrice}${originalPriceHtml}</p>
                <p class="description">${product.description || 'No description available.'}</p>
            </div>
        `;
        return card;
    }

    /**
     * Toggles between grid and list view for product sections.
     */
    function toggleView() {
        const productSections = [vehicleContainer, partsContainer, motorcyclesContainer, featuredContainer];

        if (this.id === 'grid-view-btn') {
            gridViewBtn.classList.add('active');
            listViewBtn.classList.remove('active');
            productSections.forEach(section => {
                if (section) {
                    section.classList.remove('product-list');
                    section.classList.add('product-grid');
                }
            });
        } else {
            gridViewBtn.classList.remove('active');
            listViewBtn.classList.add('active');
            productSections.forEach(section => {
                if (section) {
                    section.classList.remove('product-grid');
                    section.classList.add('product-list');
                }
            });
        }
    }

    /**
     * Handles search bar functionality, including suggestions.
     * @param {Event} e - The input event.
     */
    function handleSearchInput(e) {
        const query = e.target.value.toLowerCase().trim();
        searchSuggestions.innerHTML = '';
        if (query.length === 0) {
            searchSuggestions.classList.remove('active');
            return;
        }

        const filteredProducts = allProducts.filter(product =>
            (product.name && product.name.toLowerCase().includes(query)) ||
            (product.make && product.make.toLowerCase().includes(query)) ||
            (product.model && product.model.toLowerCase().includes(query)) ||
            (product.category && product.category.toLowerCase().includes(query))
        );

        filteredProducts.slice(0, 5).forEach(product => {
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.textContent = product.name || `${product.make} ${product.model}`;
            suggestionItem.dataset.id = product.id || product.model;
            suggestionItem.dataset.type = product.category;
            suggestionItem.addEventListener('click', () => {
                searchInput.value = suggestionItem.textContent;
                searchSuggestions.classList.remove('active');
                searchInput.dataset.selectedId = suggestionItem.dataset.id;
            });
            searchSuggestions.appendChild(suggestionItem);
        });

        searchSuggestions.classList.add('active');
    }
    
    /**
     * Navigates to the product details page.
     */
    function handleSearch() {
        const selectedId = searchInput.dataset.selectedId;
        const query = searchInput.value.trim();

        if (selectedId) {
            window.location.href = `autogiant-motors-product-details.html?id=${encodeURIComponent(selectedId)}`;
        } else if (query) {
             const product = allProducts.find(p => (p.name || `${p.make} ${p.model}`).toLowerCase() === query.toLowerCase());
             if (product) {
                 window.location.href = `autogiant-motors-product-details.html?id=${encodeURIComponent(product.id || product.model)}`;
             } else {
                 alert('Product not found. Please select from the suggestions.');
             }
        } else {
             alert('Please type to search for a product.');
        }
    }

    // Simple loading indicator functions
    function showLoadingIndicators() {
        const containers = [vehicleContainer, partsContainer, motorcyclesContainer, featuredContainer];
        containers.forEach(container => {
            if (container) {
                container.innerHTML = '<p class="text-center">Loading products...</p>';
            }
        });
    }

    function hideLoadingIndicators() {
        const containers = [vehicleContainer, partsContainer, motorcyclesContainer, featuredContainer];
        containers.forEach(container => {
            if (container && container.querySelector('.text-center')) {
                container.innerHTML = '';
            }
        });
    }

    // Event listeners
    if (gridViewBtn) gridViewBtn.addEventListener('click', toggleView);
    if (listViewBtn) listViewBtn.addEventListener('click', toggleView);
    if (searchInput) searchInput.addEventListener('input', handleSearchInput);
    if (searchButton) searchButton.addEventListener('click', handleSearch);
    
    // Initial function calls
    fetchAllData();
});