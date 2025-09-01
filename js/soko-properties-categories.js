//
// File: js/soko-properties-categories.js
// -------------------------------------------------
// This script provides all dynamic functionality for the Soko Properties
// categories page. It handles fetching data, filtering properties by category,
// updating the URL, and marking the selected category card.
//

document.addEventListener('DOMContentLoaded', async () => {
    let allProperties = [];
    const categoryProductsGrid = document.getElementById('category-products-grid');
    const categoryTitle = document.getElementById('category-listing-title');
    const noResultsMessage = document.getElementById('no-results-message');

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
        } catch (error) {
            console.error('Failed to load property data:', error);
            categoryProductsGrid.innerHTML = '<p class="text-danger">Failed to load properties. Please try again later.</p>';
        }
    }

    /**
     * Renders properties into the main product grid.
     * @param {Array} propertiesArray - The array of property objects to render.
     */
    function renderProperties(propertiesArray) {
        if (!categoryProductsGrid) return;

        categoryProductsGrid.innerHTML = '';
        noResultsMessage.style.display = propertiesArray.length > 0 ? 'none' : 'block';

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

            card.innerHTML = `
                <div class="product-image-container">
                    <img src="${property.images[0]}" alt="${property.title}" class="product-image">
                </div>
                <div class="product-info">
                    <h3>${property.title}</h3>
                    <p class="product-location">
                        <i class="fas fa-map-marker-alt"></i> ${property.location.city}, ${property.location.county}
                    </p>
                    <p class="product-price">${price}</p>
                </div>
            `;
            categoryProductsGrid.appendChild(card);
        });
    }

    /**
     * Filters properties based on the given category.
     * @param {string} category - The category to filter by (e.g., 'Land').
     * @returns {Array} - The filtered array of properties.
     */
    function filterByCategory(category) {
        if (!category || category === 'all') {
            return allProperties;
        }
        return allProperties.filter(p => p.propertyType.toLowerCase() === category.toLowerCase());
    }

    /**
     * Updates the UI based on the selected category.
     * @param {string} category - The category to highlight and filter by.
     */
    function updatePage(category) {
        // Update URL to reflect the selected category without a full page reload
        history.pushState(null, '', `soko-properties-categories.html?category=${category}`);

        // Update active class on category cards
        document.querySelectorAll('.category-card').forEach(card => {
            card.classList.remove('selected');
            if (card.getAttribute('data-category').toLowerCase() === category.toLowerCase()) {
                card.classList.add('selected');
            }
        });

        // Update the section title
        const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);
        categoryTitle.textContent = `${formattedCategory} Properties`;

        // Filter and render the properties
        const filtered = filterByCategory(category);
        renderProperties(filtered);
    }

    /**
     * Initializes event listeners for the category cards.
     */
    function initEventListeners() {
        document.querySelectorAll('.category-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const selectedCategory = card.getAttribute('data-category');
                updatePage(selectedCategory);
            });
        });

        // Handle browser's back/forward buttons
        window.addEventListener('popstate', () => {
            const params = new URLSearchParams(window.location.search);
            const categoryFromUrl = params.get('category') || 'all';
            updatePage(categoryFromUrl);
        });
    }

    /**
     * Main initialization function.
     */
    async function init() {
        // Fetch data and wait for it to be ready
        await fetchProperties();

        // Get the initial category from the URL on page load
        const params = new URLSearchParams(window.location.search);
        const initialCategory = params.get('category') || 'all';
        
        // Update the page with the initial category
        updatePage(initialCategory);

        // Set up event listeners for category cards
        initEventListeners();
    }

    // Wait for the header and footer to be loaded before running the script
    document.addEventListener('partialsLoaded', init);
});