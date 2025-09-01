/**
 * soko-properties.js
 * * This script handles the dynamic loading, filtering, and sorting of
 * properties for the Soko Properties shop page. It fetches property
 * data from a JSON file and renders it dynamically.
 */

document.addEventListener('partialsLoaded', async () => {

    let allProperties = [];
    let filteredProperties = [];
    let displayedCount = 0;
    const itemsPerLoad = 9;

    // =========================================================
    // 2. Data Fetching & Initialization
    // =========================================================
    async function fetchProperties() {
        try {
            const response = await fetch('data/soko-properties-products.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allProperties = await response.json();
            // Assign a date_added for sorting purposes, using a simple index-based approach
            // for demonstration, with a slight offset for each item.
            allProperties.forEach((prop, index) => {
                const date = new Date('2024-01-01');
                date.setDate(date.getDate() + index);
                prop.date_added = prop.listingDate || date.toISOString().split('T')[0];
            });

            // After fetching, inject the shop header partial and then initialize functionality
            await injectShopHeader();
            initializePage();
        } catch (error) {
            console.error('Failed to fetch properties:', error);
            const propertiesGrid = document.getElementById('properties-grid');
            if (propertiesGrid) {
                propertiesGrid.innerHTML = '<p class="text-center">Error loading properties. Please try again later.</p>';
            }
        }
    }

    async function injectShopHeader() {
        const shopHeaderPlaceholder = document.getElementById('shop-header-placeholder');
        if (shopHeaderPlaceholder) {
            try {
                const response = await fetch('partials/soko-properties-header.html');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const headerHtml = await response.text();
                shopHeaderPlaceholder.innerHTML = headerHtml;
            } catch (error) {
                console.error('Failed to inject shop header:', error);
            }
        }
    }

    // Main initialization function to be called after data is fetched AND partials are loaded
    function initializePage() {
        // =========================================================
        // 1. DOM Elements & State Variables (Moved here to ensure they exist)
        // =========================================================
        const propertiesGrid = document.getElementById('properties-grid');
        const searchInput = document.getElementById('soko-properties-search');
        const typeFilter = document.getElementById('property-type');
        const bedCountFilter = document.getElementById('bedroom-count');
        const bathCountFilter = document.getElementById('bathroom-count');
        const priceRangeFilter = document.getElementById('price-range');
        const sortBySelect = document.getElementById('sort-by');
        const applyFiltersBtn = document.getElementById('apply-filters-btn');
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        const loadMoreBtn = document.getElementById('load-more-btn');

        filteredProperties = [...allProperties]; // Start with all properties
        applyFiltersAndSort();
        setupEventListeners(searchInput, typeFilter, bedCountFilter, bathCountFilter, priceRangeFilter, sortBySelect, applyFiltersBtn, clearFiltersBtn, loadMoreBtn);
    }

    // =========================================================
    // 3. Rendering Functions
    // =========================================================
    function renderProperties(properties) {
        const propertiesGrid = document.getElementById('properties-grid');
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (!propertiesGrid) return;

        propertiesGrid.innerHTML = '';
        if (properties.length === 0) {
            propertiesGrid.innerHTML = '<p class="text-center">No properties found matching your criteria.</p>';
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
            return;
        }

        const propertiesToDisplay = properties.slice(0, displayedCount);
        propertiesToDisplay.forEach(property => {
            const propertyCard = createPropertyCard(property);
            propertiesGrid.appendChild(propertyCard);
        });

        // Toggle load more button visibility
        if (loadMoreBtn) {
            if (displayedCount >= properties.length) {
                loadMoreBtn.style.display = 'none';
            } else {
                loadMoreBtn.style.display = 'block';
            }
        }
    }

    function createPropertyCard(property) {
        const card = document.createElement('div');
        card.classList.add('property-card');
        const price = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(property.price.amount);
        const area = property.area ? `${property.area.size} m²` : 'N/A';
        const imageUrl = property.images && property.images.length > 0 ? property.images[0] : 'images/placeholder.webp';

        // Construct the dynamic URL for the details page using the propertyId
        const propertyUrl = `soko-properties-product-details.html?id=${property.propertyId}`;

        // Conditionally create the beds and baths HTML
        const bedsHtml = property.bedrooms ? `<span><i class="fas fa-bed"></i> ${property.bedrooms} Beds</span>` : '';
        const bathsHtml = property.bathrooms ? `<span><i class="fas fa-bath"></i> ${property.bathrooms} Baths</span>` : '';

        card.innerHTML = `
            <img src="${imageUrl}" alt="${property.title}">
            <div class="property-info">
                <h3>${property.title}</h3>
                <p class="property-price">${price}</p>
                <div class="property-details">
                    ${bedsHtml}
                    ${bathsHtml}
                    <span><i class="fas fa-ruler-combined"></i> ${area}</span>
                </div>
                <p class="property-location"><i class="fas fa-map-marker-alt"></i> ${property.location.city}</p>
                <a href="${propertyUrl}" class="btn-primary">View Details</a>
            </div>
        `;
        return card;
    }

    // =========================================================
    // 4. Filtering, Sorting & Event Handling Logic
    // =========================================================
    function applyFiltersAndSort() {
        const searchInput = document.getElementById('soko-properties-search');
        const typeFilter = document.getElementById('property-type');
        const bedCountFilter = document.getElementById('bedroom-count');
        const bathCountFilter = document.getElementById('bathroom-count');
        const priceRangeFilter = document.getElementById('price-range');
        const sortBySelect = document.getElementById('sort-by');

        // Check if all elements exist before proceeding
        if (!searchInput || !typeFilter || !bedCountFilter || !bathCountFilter || !priceRangeFilter || !sortBySelect) {
            console.error('One or more filter/sort elements are not available in the DOM.');
            return;
        }

        // 4.1. Filtering Logic
        let currentProperties = allProperties.filter(property => {
            const searchTerm = searchInput.value.toLowerCase();
            const matchesSearch = property.title.toLowerCase().includes(searchTerm) ||
                property.location.city.toLowerCase().includes(searchTerm) ||
                property.propertyType.toLowerCase().includes(searchTerm);

            const selectedType = typeFilter.value;
            const matchesType = selectedType === 'all' || property.propertyType === selectedType;

            const selectedBeds = bedCountFilter.value;
            const matchesBeds = selectedBeds === 'any' ||
                (selectedBeds === '5+' ? property.bedrooms >= 5 : property.bedrooms === parseInt(selectedBeds));

            const selectedBaths = bathCountFilter.value;
            const matchesBaths = selectedBaths === 'any' ||
                (selectedBaths === '4+' ? property.bathrooms >= 4 : property.bathrooms === parseInt(selectedBaths));

            const selectedPriceRange = priceRangeFilter.value;
            // Correctly access the price
            const matchesPrice = selectedPriceRange === 'any' || checkPriceRange(property.price.amount, selectedPriceRange);

            return matchesSearch && matchesType && matchesBeds && matchesBaths && matchesPrice;
        });

        // 4.2. Sorting Logic
        const sortByValue = sortBySelect.value;
        if (sortByValue === 'price-asc') {
            currentProperties.sort((a, b) => a.price.amount - b.price.amount);
        } else if (sortByValue === 'price-desc') {
            currentProperties.sort((a, b) => b.price.amount - a.price.amount);
        } else if (sortByValue === 'newest') {
            currentProperties.sort((a, b) => new Date(b.date_added) - new Date(a.date_added));
        } else if (sortByValue === 'oldest') {
            currentProperties.sort((a, b) => new Date(a.date_added) - new Date(b.date_added));
        }

        filteredProperties = currentProperties;
        displayedCount = itemsPerLoad; // Reset displayed count for new filter/sort
        renderProperties(filteredProperties);
    }

    function checkPriceRange(price, range) {
        const [min, max] = range.split('-').map(Number);
        if (range.endsWith('+')) {
            return price >= min;
        }
        return price >= min && price <= max;
    }

    function setupEventListeners(searchInput, typeFilter, bedCountFilter, bathCountFilter, priceRangeFilter, sortBySelect, applyFiltersBtn, clearFiltersBtn, loadMoreBtn) {
        // Event listeners for filters and sort
        [searchInput, typeFilter, bedCountFilter, bathCountFilter, priceRangeFilter, sortBySelect].forEach(element => {
            if (element) {
                element.addEventListener('change', applyFiltersAndSort);
            }
        });

        // Specific event listener for search input to update on keyup
        if (searchInput) searchInput.addEventListener('keyup', applyFiltersAndSort);

        // Event listener for the Apply Filters button (redundant but good practice for clarity)
        if (applyFiltersBtn) applyFiltersBtn.addEventListener('click', applyFiltersAndSort);

        // Event listener for the Clear button
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                if (typeFilter) typeFilter.value = 'all';
                if (bedCountFilter) bedCountFilter.value = 'any';
                if (bathCountFilter) bathCountFilter.value = 'any';
                if (priceRangeFilter) priceRangeFilter.value = 'any';
                if (sortBySelect) sortBySelect.value = 'default';
                applyFiltersAndSort();
            });
        }

        // Event listener for the Load More button
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                displayedCount += itemsPerLoad;
                renderProperties(filteredProperties);
            });
        }
    }

    // =========================================================
    // 5. Initial Execution
    // =========================================================
    fetchProperties();
});