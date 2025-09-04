//
// File: js/click-n-get-brands.js
// -------------------------------------------------
// This script handles the dynamic content for the brands page.
// It fetches product data, extracts unique brands, and renders them.
//

document.addEventListener('DOMContentLoaded', async () => {
    // Listen for the custom event that signifies all HTML partials are loaded.
    document.addEventListener('partialsLoaded', async () => {
        const brandsGrid = document.getElementById('brands-grid');
        const loadingMessage = document.getElementById('loading-message');

        /**
         * Fetches all product data from the JSON file.
         */
        async function fetchProducts() {
            try {
                const response = await fetch('data/click-n-get-products.json');
                if (!response.ok) {
                    throw new Error('Failed to load product data.');
                }
                return await response.json();
            } catch (error) {
                console.error('Error fetching product data:', error);
                if (loadingMessage) {
                    loadingMessage.textContent = 'Failed to load brand data. Please try again later.';
                }
                return null;
            }
        }

        /**
         * Renders the brand cards onto the page.
         * @param {Array<Object>} brands - The array of unique brand objects to render.
         */
        function renderBrands(brands) {
            if (!brandsGrid || brands.length === 0) {
                if (loadingMessage) {
                    loadingMessage.textContent = 'No brands found.';
                }
                return;
            }

            if (loadingMessage) {
                loadingMessage.style.display = 'none';
            }

            brands.forEach(brand => {
                const brandHtml = `
                    <a href="click-n-get-category.html?brand=${encodeURIComponent(brand.name)}" class="brand-card">
                        <img src="${brand.logo}" alt="${brand.name} logo" loading="lazy" class="brand-logo">
                        <p class="brand-name">${brand.name}</p>
                    </a>
                `;
                brandsGrid.insertAdjacentHTML('beforeend', brandHtml);
            });
        }

        /**
         * Main function to initialize the page.
         */
        async function init() {
            const allProducts = await fetchProducts();

            if (!allProducts) {
                return;
            }

            // Use a Map to store unique brands and their logos
            const uniqueBrands = new Map();
            allProducts.forEach(product => {
                if (product.brand && !uniqueBrands.has(product.brand)) {
                    uniqueBrands.set(product.brand, {
                        name: product.brand,
                        logo: product.brandLogo
                    });
                }
            });

            const brandsArray = Array.from(uniqueBrands.values());
            renderBrands(brandsArray);
        }

        // Run the main initialization function
        init();
    });
});