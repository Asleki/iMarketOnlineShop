//
// File: js/soko-properties.js
// -------------------------------------------------
// This script provides all dynamic functionality for the Soko Properties page.
// It handles data fetching, dynamic product rendering, filtering, searching,
// and view toggles (grid/list).
//

document.addEventListener('DOMContentLoaded', async () => {
    // Listen for a custom event that signifies all HTML partials are loaded.
    // This ensures our script runs after the main content is fully in the DOM.
    // This pattern is consistent with other files in the iMarket project.
    document.addEventListener('partialsLoaded', async () => {
        let allProperties = [];

        /**
         * Fetches property data from the JSON file.
         */
        async function fetchProperties() {
            try {
                const response = await fetch('data/soko-properties-products.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                allProperties = await response.json();
                console.log('Property data loaded successfully.');
            } catch (error) {
                console.error('Failed to load property data:', error);
                // Fallback or display an error message on the page
                document.querySelectorAll('.product-grid').forEach(grid => {
                    grid.innerHTML = '<p class="text-danger">Failed to load properties. Please try again later.</p>';
                });
            }
        }

        /**
         * Renders properties into a specific section of the page.
         * @param {Array} propertiesArray - The array of property objects to render.
         * @param {string} containerId - The ID of the HTML element to render into.
         * @param {string} badgeText - Optional text for a badge (e.g., "Discounted").
         */
        function renderProperties(propertiesArray, containerId, badgeText = null) {
            const container = document.getElementById(containerId);
            if (!container) return;

            // Clear existing content
            container.innerHTML = '';

            propertiesArray.forEach(property => {
                const card = document.createElement('a');
                // CORRECTED: Link to the specific product details page with its ID
                card.href = `soko_properties-product-details.html?id=${property.propertyId}`;
                card.classList.add('product-card-uniform');

                const price = property.price.amount.toLocaleString('en-KE', {
                    style: 'currency',
                    currency: 'KES',
                    minimumFractionDigits: 0
                });

                let badgeHtml = '';
                if (badgeText) {
                    badgeHtml = `<span class="listing-badge">${badgeText}</span>`;
                }

                // Construct inner HTML for the product card
                card.innerHTML = `
                    <div class="product-image-container">
                        <img src="${property.images[0]}" alt="${property.title}" class="product-image">
                        ${badgeHtml}
                    </div>
                    <div class="product-info">
                        <h3>${property.title}</h3>
                        <p class="product-location">
                            <i class="fas fa-map-marker-alt"></i> ${property.location.city}, ${property.location.county}
                        </p>
                        <p class="product-price">${price}</p>
                    </div>
                `;
                container.appendChild(card);
            });
        }

        /**
         * Filters properties based on the current filter criteria.
         * @returns {Array} - The filtered array of properties.
         */
        function filterProperties() {
            const searchInput = document.getElementById('soko-search-input').value.toLowerCase();
            const propertyType = document.getElementById('property-type-filter').value;
            const minPrice = parseFloat(document.getElementById('min-price').value) || 0;
            const maxPrice = parseFloat(document.getElementById('max-price').value) || Infinity;
            const minBeds = parseInt(document.querySelector('input[name="bedrooms"]:checked').value) || 0;
            const minBaths = parseInt(document.querySelector('input[name="bathrooms"]:checked').value) || 0;

            const filtered = allProperties.filter(property => {
                const matchesSearch = property.title.toLowerCase().includes(searchInput) ||
                                      property.description.toLowerCase().includes(searchInput) ||
                                      property.location.city.toLowerCase().includes(searchInput);
                const matchesType = propertyType === 'all' || property.propertyType.toLowerCase() === propertyType;
                const matchesPrice = property.price.amount >= minPrice && property.price.amount <= maxPrice;
                const matchesBeds = !property.bedrooms || property.bedrooms >= minBeds;
                const matchesBaths = !property.bathrooms || property.bathrooms >= minBaths;
                
                return matchesSearch && matchesType && matchesPrice && matchesBeds && matchesBaths;
            });

            return filtered;
        }

        /**
         * Initializes all event listeners for the page.
         */
        function initEventListeners() {
            // View Toggles
            const gridViewBtn = document.getElementById('grid-view-btn');
            const listViewBtn = document.getElementById('list-view-btn');
            const productGrids = document.querySelectorAll('.product-grid');

            if (gridViewBtn && listViewBtn && productGrids.length > 0) {
                gridViewBtn.addEventListener('click', () => {
                    productGrids.forEach(grid => {
                        grid.classList.remove('list-view');
                        grid.classList.add('grid-view');
                    });
                    gridViewBtn.classList.add('active');
                    listViewBtn.classList.remove('active');
                });

                listViewBtn.addEventListener('click', () => {
                    productGrids.forEach(grid => {
                        grid.classList.remove('grid-view');
                        grid.classList.add('list-view');
                    });
                    listViewBtn.classList.add('active');
                    gridViewBtn.classList.remove('active');
                });
            }

            // Filter Toggles
            const filterToggleBtn = document.getElementById('filter-toggle-btn');
            const filterPanel = document.getElementById('filter-panel');
            if (filterToggleBtn && filterPanel) {
                filterToggleBtn.addEventListener('click', () => {
                    filterPanel.classList.toggle('hidden');
                });
            }

            // Apply Filters
            const applyFiltersBtn = document.getElementById('apply-filters-btn');
            if (applyFiltersBtn) {
                applyFiltersBtn.addEventListener('click', () => {
                    const filteredProperties = filterProperties();
                    // Render the filtered list to the main products page.
                    // This assumes the user is on the main products page for full filtering.
                    // For the index page, we will just re-render the sections with filtered data.
                    renderProperties(filteredProperties.filter(p => p.isDiscounted), 'discounts-grid', 'Discount');
                    renderProperties(filteredProperties.filter(p => new Date(p.listingDate).getFullYear() === 2025), 'new-listings-grid', 'New');
                    renderProperties(filteredProperties.slice(0, 6), 'featured-properties-grid', 'Featured'); // For demo, just show first 6 filtered
                    // Hide the filter panel after applying filters
                    filterPanel.classList.add('hidden');
                });
            }
        }

        /**
         * Populates the page sections with initial data on load.
         */
        async function populatePage() {
            await fetchProperties();

            // Filter and render for the "Amazing Discounts" section
            const discountedProperties = allProperties.filter(p => p.isDiscounted);
            renderProperties(discountedProperties, 'discounts-grid', 'Discount');

            // Filter and render for the "New Listings" section (listed in 2025)
            const newProperties = allProperties.filter(p => {
                const listingYear = new Date(p.listingDate).getFullYear();
                return listingYear === 2025;
            });
            renderProperties(newProperties, 'new-listings-grid', 'New');

            // Filter and render for the "Featured Properties" section
            // As per instructions, this is a placeholder. We will show the first 6 properties.
            const featuredProperties = allProperties.slice(0, 6);
            renderProperties(featuredProperties, 'featured-properties-grid', 'Featured');
        }

        // Initialize everything
        await populatePage();
        initEventListeners();
    });
});