//
// File: js/click-n-get-product-details.js
// -------------------------------------------------
// This script handles the dynamic content for a single product details page.
// It uses the product ID from the URL to fetch data and populate the page.
// It also includes the image gallery and related products section.
//

document.addEventListener('DOMContentLoaded', async () => {
    // Listen for a custom event that signifies all HTML partials are loaded.
    document.addEventListener('partialsLoaded', async () => {
        const loadingMessage = document.getElementById('loading-message');
        const productDetailsContent = document.getElementById('product-details-content');
        const relatedProductsGrid = document.getElementById('related-products-grid');

        let allProducts = [];

        /**
         * Fetches all product data from the JSON file.
         */
        async function fetchProducts() {
            try {
                const response = await fetch('data/click-n-get-products.json');
                if (!response.ok) {
                    throw new Error('Failed to load product data.');
                }
                allProducts = await response.json();
            } catch (error) {
                console.error('Error fetching product data:', error);
                if (loadingMessage) {
                    loadingMessage.textContent = 'Failed to load product data. Please try again later.';
                }
            }
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
         * Renders the details of a single product onto the page.
         * @param {Object} product - The product object to render.
         */
        function renderProductDetails(product) {
            if (!productDetailsContent || !product) {
                return;
            }

            // Hide the loading message
            if (loadingMessage) {
                loadingMessage.style.display = 'none';
            }

            // Update page title and breadcrumb
            document.getElementById('page-title').textContent = `${product.name} - Click 'n Get`;
            document.getElementById('breadcrumb-category').textContent = product.category;

            const priceHtml = product.isDiscounted ?
                `<p class="details-price">KES ${product.price.toLocaleString()}</p>
                 <p class="details-original-price">KES ${product.originalPrice.toLocaleString()}</p>` :
                `<p class="details-price">KES ${product.price.toLocaleString()}</p>`;

            const galleryHtml = `
                <div class="product-image-gallery">
                    <div class="main-image-container">
                        <img id="main-product-image" src="${product.images[0]}" alt="${product.name} main image">
                    </div>
                    ${product.thumbnailImages && product.thumbnailImages.length > 0 ? `
                    <div class="thumbnail-images">
                        ${product.thumbnailImages.map((img, index) => `
                            <img src="${img}" alt="${product.name} thumbnail ${index + 1}" data-image-url="${img}" ${index === 0 ? 'class="active"' : ''}>
                        `).join('')}
                    </div>` : ''}
                </div>
            `;

            const infoHtml = `
                <div class="product-info-column">
                    <h1 class="product-title">${product.name}</h1>
                    <div class="product-details-rating">
                        <span class="rating-stars">${getStarRating(product.rating)}</span>
                        <span class="review-count">(${product.reviewsCount} reviews)</span>
                    </div>

                    <div class="product-prices">
                        ${priceHtml}
                    </div>

                    <p class="product-details-description">${product.description}</p>
                    
                    <button class="add-to-cart-btn"><i class="fas fa-shopping-cart"></i> Add to Cart</button>
                    
                    <div class="product-features">
                        <h3>Key Features</h3>
                        <ul>
                            ${product.keyFeatures.map(feature => `<li><i class="fas fa-check-circle"></i> ${feature}</li>`).join('')}
                        </ul>
                    </div>

                    <div class="product-specs">
                        <h3>Specifications</h3>
                        <ul>
                            ${Object.keys(product.specifications).map(key => `<li><strong>${key}:</strong> ${product.specifications[key]}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;

            productDetailsContent.innerHTML = `
                <div class="product-details-container">
                    ${galleryHtml}
                    ${infoHtml}
                </div>
            `;
            
            setupEventListeners(product);
        }

        /**
         * Sets up event listeners for the page (image gallery, quantity selector).
         * @param {Object} product - The product object.
         */
        function setupEventListeners(product) {
            const mainImage = document.getElementById('main-product-image');
            const thumbnails = document.querySelectorAll('.thumbnail-images img');

            thumbnails.forEach(thumb => {
                thumb.addEventListener('click', () => {
                    mainImage.src = thumb.dataset.imageUrl;
                    thumbnails.forEach(t => t.classList.remove('active'));
                    thumb.classList.add('active');
                });
            });
        }

        /**
         * Renders related products based on the current product's category.
         * @param {Object} currentProduct - The product currently being viewed.
         */
        function renderRelatedProducts(currentProduct) {
            if (!relatedProductsGrid || !allProducts || allProducts.length === 0) {
                return;
            }

            const relatedProducts = allProducts.filter(p => 
                p.id !== currentProduct.id && 
                p.category === currentProduct.category
            ).slice(0, 4); // Display up to 4 related products

            if (relatedProducts.length === 0) {
                relatedProductsGrid.innerHTML = '<p class="text-center">No related products found.</p>';
                return;
            }
            
            relatedProducts.forEach(product => {
                const priceHtml = product.isDiscounted ?
                    `<p class="product-price">KES ${product.price.toLocaleString()}</p>
                     <p class="original-price">KES ${product.originalPrice.toLocaleString()}</p>` :
                    `<p class="product-price">KES ${product.price.toLocaleString()}</p>`;

                const cardHtml = `
                    <a href="click-n-get-product-details.html?id=${product.id}" class="product-card">
                        <img src="${product.images[0]}" alt="${product.name}" class="product-image" loading="lazy">
                        <div class="product-info">
                            <h4 class="product-title">${product.name}</h4>
                            <div class="price-container">
                                ${priceHtml}
                            </div>
                        </div>
                    </a>
                `;
                relatedProductsGrid.insertAdjacentHTML('beforeend', cardHtml);
            });
        }

        /**
         * Main function to initialize the page.
         */
        async function init() {
            // Get the product ID from the URL query parameter
            const params = new URLSearchParams(window.location.search);
            const productId = params.get('id');

            if (!productId) {
                if (loadingMessage) {
                    loadingMessage.textContent = 'Error: No product ID specified in the URL.';
                }
                return;
            }

            await fetchProducts();
            const product = allProducts.find(p => p.id === productId);

            if (product) {
                renderProductDetails(product);
                renderRelatedProducts(product);
            } else {
                if (loadingMessage) {
                    loadingMessage.textContent = 'Product not found. Please check the URL.';
                }
                if (productDetailsContent) {
                    productDetailsContent.style.display = 'none';
                }
            }
        }

        // Run the main initialization function
        init();
    });
});