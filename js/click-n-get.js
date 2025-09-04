//
// File: js/click-n-get.js
// -------------------------------------------------
// This script provides all dynamic functionality for the Click 'n Get shop page.
// It handles data fetching, dynamic product rendering, hero slider,
// and the "Load More" functionality for product sections.
//

document.addEventListener('DOMContentLoaded', async () => {
    // Listen for a custom event that signifies all HTML partials are loaded.
    document.addEventListener('partialsLoaded', async () => {
        let allProducts = [];
        const productsPerPage = 10;
        const currentProductPages = {
            featured: 0,
            deals: 0,
            hotPicks: 0,
            newArrivals: 0
        };

        const heroSlider = document.getElementById('hero-slider');
        const prevBtn = heroSlider.querySelector('.prev-btn');
        const nextBtn = heroSlider.querySelector('.next-btn');

        let slideIndex = 0;
        let slideInterval;

        /**
         * Fetches all required data from JSON files.
         * @returns {Promise<Object>} A promise that resolves to an object containing products and shops data.
         */
        async function fetchData() {
            try {
                const [productsResponse, shopsResponse] = await Promise.all([
                    fetch('data/click-n-get-products.json'),
                    fetch('data/shops.json')
                ]);

                if (!productsResponse.ok || !shopsResponse.ok) {
                    throw new Error('Failed to load one or more JSON files.');
                }

                allProducts = await productsResponse.json();
                const shops = await shopsResponse.json();
                console.log('Data loaded successfully.');
                return { allProducts, shops };
            } catch (error) {
                console.error('Failed to load data:', error);
                document.querySelectorAll('.product-grid').forEach(grid => {
                    grid.innerHTML = '<p class="text-danger">Failed to load product data.</p>';
                });
                return { allProducts: [], shops: [] };
            }
        }

/**
 * Renders a set of product cards into a specified grid.
 * @param {Array<Object>} products - The array of product objects to render.
 * @param {string} gridId - The ID of the HTML element to append the cards to.
 */
function renderProducts(products, gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;

    products.forEach(product => {
        // Essential check: make sure the product object has a valid ID
        if (!product.id) {
            console.error('Product object is missing an ID:', product);
            return; // Skip this product if it has no ID
        }

        const priceHtml = product.isDiscounted ?
            `<p class="product-price">KES ${product.price.toLocaleString()}</p>
             <p class="original-price">KES ${product.originalPrice.toLocaleString()}</p>` :
            `<p class="product-price">KES ${product.price.toLocaleString()}</p>`;

        const shippingHtml = product.isFreeShipping ?
            `<span class="product-badge shipping-badge"><i class="fas fa-shipping-fast"></i> Free Shipping</span>` : '';

        const discountHtml = product.isDiscounted ?
            `<span class="product-badge discount-badge"><i class="fas fa-tags"></i> Deal</span>` : '';
        
        const hotPickHtml = product.isHotPick ?
            `<span class="product-badge hot-pick-badge"><i class="fas fa-fire"></i> Hot Pick</span>` : '';

        // The href attribute now uses the validated product.id
        const cardHtml = `
            <a href="click-n-get-product-details.html?id=${product.id}" class="product-card">
                <div class="product-badges">
                    ${shippingHtml}
                    ${hotPickHtml}
                    ${discountHtml}
                </div>
                <img src="${product.images[0]}" alt="${product.name}" class="product-image" loading="lazy">
                <div class="product-info">
                    <h4 class="product-title">${product.name}</h4>
                    <p class="product-brand">${product.brand}</p>
                    <div class="price-container">
                        ${priceHtml}
                    </div>
                    <div class="product-rating">
                        <span class="rating-stars">
                            ${getStarRating(product.rating)}
                        </span>
                        <span class="review-count">(${product.reviewsCount})</span>
                    </div>
                </div>
            </a>
        `;
        grid.insertAdjacentHTML('beforeend', cardHtml);
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
         * Renders a specific number of products for a section and updates the load more button.
         * @param {Array<Object>} allProducts - The full array of products for the section.
         * @param {string} gridId - The ID of the product grid to render to.
         * @param {string} buttonId - The ID of the "Load More" button.
         * @param {string} type - The type of product section (e.g., 'deals').
         */
        function renderSection(allProducts, gridId, buttonId, type) {
            const button = document.getElementById(buttonId);
            const startIndex = currentProductPages[type] * productsPerPage;
            const endIndex = startIndex + productsPerPage;
            const productsToRender = allProducts.slice(startIndex, endIndex);

            if (productsToRender.length > 0) {
                renderProducts(productsToRender, gridId);
                currentProductPages[type]++;
            }

            if (endIndex >= allProducts.length) {
                if (button) {
                    button.style.display = 'none';
                }
            } else {
                if (button) {
                    button.style.display = 'inline-block';
                }
            }
        }

        /**
         * Sets up event listeners for the Load More buttons.
         */
        function setupLoadMoreButtons() {
            document.getElementById('featured-products-load-more')?.addEventListener('click', () => {
                const featuredProducts = allProducts.filter(p => p.isFeatured);
                renderSection(featuredProducts, 'featured-products-grid', 'featured-products-load-more', 'featured');
            });
            document.getElementById('todays-deals-load-more')?.addEventListener('click', () => {
                const deals = allProducts.filter(p => p.isDeals);
                renderSection(deals, 'todays-deals-grid', 'todays-deals-load-more', 'deals');
            });
            document.getElementById('hot-picks-load-more')?.addEventListener('click', () => {
                const hotPicks = allProducts.filter(p => p.isHotPick);
                renderSection(hotPicks, 'hot-picks-grid', 'hot-picks-load-more', 'hotPicks');
            });
            document.getElementById('new-arrivals-load-more')?.addEventListener('click', () => {
                const today = new Date();
                const newArrivals = allProducts.filter(p => {
                    const dateAdded = new Date(p.dateAdded);
                    const diffTime = Math.abs(today - dateAdded);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    return diffDays <= 60;
                });
                renderSection(newArrivals, 'new-arrivals-grid', 'new-arrivals-load-more', 'newArrivals');
            });
        }

        /**
         * Renders the hero slider with categories from shops.json.
         * @param {Array<Object>} shops - The array of shop objects.
         */
        function renderHeroSlider(shops) {
            const clickNGetShop = shops.find(shop => shop.shop_id === 'click_n_get');
            const slidesContainer = document.getElementById('slides-container');
            if (!clickNGetShop || !slidesContainer) return;

            const categories = clickNGetShop.categories;
            const slideTemplate = (category, index) => `
                <div class="hero-slide ${index === 0 ? 'active' : ''}">
                    <div class="slide-content">
                        <h2>${category}</h2>
                        <p>Discover our range of ${category.toLowerCase()} products.</p>
                        <a href="click-n-get-categories.html?category=${encodeURIComponent(category)}" class="btn-primary">Shop Now</a>
                    </div>
                </div>
            `;

            slidesContainer.innerHTML = categories.map((cat, index) => slideTemplate(cat, index)).join('');
            
            const slides = slidesContainer.querySelectorAll('.hero-slide');
            if(slides.length > 1) {
                prevBtn.style.display = 'block';
                nextBtn.style.display = 'block';
            }

            prevBtn.addEventListener('click', () => {
                changeSlide(-1);
            });

            nextBtn.addEventListener('click', () => {
                changeSlide(1);
            });

            function changeSlide(n) {
                slideIndex += n;
                if (slideIndex >= slides.length) {
                    slideIndex = 0;
                }
                if (slideIndex < 0) {
                    slideIndex = slides.length - 1;
                }
                updateSlider();
            }

            function updateSlider() {
                slides.forEach((slide, index) => {
                    slide.classList.remove('active');
                    if (index === slideIndex) {
                        slide.classList.add('active');
                    }
                });
            }

            // Auto-slide every 5 seconds
            clearInterval(slideInterval);
            slideInterval = setInterval(() => {
                changeSlide(1);
            }, 5000);
        }

        /**
         * Renders the featured brands section.
         * @param {Array<Object>} products - The array of all product objects.
         */
        function renderFeaturedBrands(products) {
            const brandsGrid = document.getElementById('featured-brands-grid');
            if (!brandsGrid) return;
            
            const uniqueBrands = [...new Map(products.map(item => [item.brand, item])).values()];
            const brandsToDisplay = uniqueBrands.slice(0, 6);

            brandsToDisplay.forEach(brand => {
                const brandCardHtml = `
                    <a href="click-n-get-brands.html?brand=${encodeURIComponent(brand.brand)}" class="brand-card">
                        <img src="${brand.brandLogo}" alt="${brand.brand} Logo" class="brand-logo" loading="lazy">
                        <h4>${brand.brand}</h4>
                    </a>
                `;
                brandsGrid.insertAdjacentHTML('beforeend', brandCardHtml);
            });
        }

        /**
         * Main function to initialize all dynamic components on the page.
         */
        async function initPage() {
            const { allProducts: products, shops } = await fetchData();
            if (products.length === 0) {
                return;
            }

            // Render Hero Slider
            renderHeroSlider(shops);

            // Initial render of product sections (first 10 products)
            renderSection(products.filter(p => p.isFeatured), 'featured-products-grid', 'featured-products-load-more', 'featured');
            renderSection(products.filter(p => p.isDeals), 'todays-deals-grid', 'todays-deals-load-more', 'deals');
            renderSection(products.filter(p => p.isHotPick), 'hot-picks-grid', 'hot-picks-load-more', 'hotPicks');
            
            const today = new Date();
            const newArrivals = products.filter(p => {
                const dateAdded = new Date(p.dateAdded);
                const diffTime = Math.abs(today - dateAdded);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays <= 60;
            });
            renderSection(newArrivals, 'new-arrivals-grid', 'new-arrivals-load-more', 'newArrivals');

            // Render Featured Brands
            renderFeaturedBrands(products);

            // Set up event listeners for loading more products
            setupLoadMoreButtons();
        }

        initPage();
    });
});