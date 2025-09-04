//
// File: js/click-n-get-category.js
// -------------------------------------------------
// This script handles the dynamic content for a specific brand's product category page.
// It uses the brand name from the URL to fetch and display relevant products.
//

document.addEventListener('DOMContentLoaded', async () => {
    // Listen for the custom event that signifies all HTML partials are loaded.
    document.addEventListener('partialsLoaded', async () => {
        const brandTitle = document.getElementById('brand-title');
        const brandTagline = document.getElementById('brand-tagline');
        const productsGrid = document.getElementById('category-products-grid');
        const loadingMessage = document.getElementById('loading-message');
        const pageTitle = document.getElementById('page-title');

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
                    loadingMessage.textContent = 'Failed to load products. Please try again later.';
                }
                return null;
            }
        }

        /**
         * Renders the details of products onto the page.
         * @param {Array<Object>} products - The array of product objects to render.
         */
        function renderProducts(products) {
            if (!productsGrid || products.length === 0) {
                if (loadingMessage) {
                    loadingMessage.textContent = 'No products found for this brand.';
                }
                return;
            }

            if (loadingMessage) {
                loadingMessage.style.display = 'none';
            }

            products.forEach(product => {
                const priceHtml = product.isDiscounted ?
                    `<p class="product-price">KES ${product.price.toLocaleString()}</p>
                     <p class="original-price">KES ${product.originalPrice.toLocaleString()}</p>` :
                    `<p class="product-price">KES ${product.price.toLocaleString()}</p>`;

                const productCardHtml = `
                    <a href="click-n-get-product-details.html?id=${product.id}" class="product-card">
                        <img src="${product.images[0]}" alt="${product.name}" class="product-image" loading="lazy">
                        <div class="product-info">
                            <h4 class="product-title">${product.name}</h4>
                            <p class="product-brand">${product.brand}</p>
                            <div class="product-rating">
                                <span class="rating-stars">${getStarRating(product.rating)}</span>
                                <span class="review-count">(${product.reviewsCount})</span>
                            </div>
                            <div class="price-container">
                                ${priceHtml}
                            </div>
                        </div>
                    </a>
                `;
                productsGrid.insertAdjacentHTML('beforeend', productCardHtml);
            });
        }

        /**
         * Helper function to generate star rating HTML.
         * @param {number} rating - The product's rating.
         * @returns {string} The HTML for star icons.
         */
        function getStarRating(rating) {
            const fullStar = '<i class="fas fa-star"></i>';
            const halfStar = '<i class="fas fa-star-half-alt"></i>';
            const emptyStar = '<i class="far fa-star"></i>';
            let stars = '';
            for (let i = 0; i < 5; i++) {
                if (rating >= i + 1) {
                    stars += fullStar;
                } else if (rating >= i + 0.5) {
                    stars += halfStar;
                } else {
                    stars += emptyStar;
                }
            }
            return stars;
        }

        /**
         * Main function to initialize the page.
         */
        async function init() {
            // Get the brand name from the URL query parameter
            const params = new URLSearchParams(window.location.search);
            const brandName = params.get('brand');

            if (!brandName) {
                if (loadingMessage) {
                    loadingMessage.textContent = 'Error: No brand specified in the URL.';
                }
                if (brandTitle) {
                    brandTitle.textContent = 'Brand Not Found';
                }
                if (brandTagline) {
                    brandTagline.textContent = 'Please select a brand from the brands page.';
                }
                return;
            }

            // Decode the URL-encoded brand name
            const decodedBrandName = decodeURIComponent(brandName);
            
            // Update the page's title, heading, and tagline dynamically
            if (pageTitle) {
                pageTitle.textContent = `${decodedBrandName} Products | Click 'n Get Kenya`;
            }
            if (brandTitle) {
                brandTitle.textContent = decodedBrandName;
            }
            if (brandTagline) {
                brandTagline.textContent = `Browse all products from the ${decodedBrandName} brand.`;
            }

            const allProducts = await fetchProducts();
            if (!allProducts) {
                return;
            }

            // Filter products by the brand name
            const filteredProducts = allProducts.filter(p => p.brand === decodedBrandName);

            if (filteredProducts.length > 0) {
                renderProducts(filteredProducts);
            } else {
                if (loadingMessage) {
                    loadingMessage.textContent = `No products found for "${decodedBrandName}".`;
                }
            }
        }

        // Run the main initialization function
        init();
    });
});