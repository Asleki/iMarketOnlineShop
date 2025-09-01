//
// File: js/index.js
// -------------------------------------------------
// This script provides dynamic functionality for the homepage (index.html).
// It populates the Top Categories with a rotating list, the
// Recommended for You section with a dynamic list of products, and
// includes a hero slider.
//

document.addEventListener('partialsLoaded', async () => {
    console.log('Partials loaded. Initializing homepage logic.');

    // =========================================================
    // 1. Data Fetching, Standardization & Caching
    // =========================================================
    let shopsData = [];
    let allProducts = [];

    /**
     * Standardizes a product object from any shop's data structure
     * into a single, uniform format.
     * @param {object} product The original product object.
     * @param {object} shop The shop object associated with the product.
     * @returns {object} The standardized product object.
     */
    function standardizeProduct(product, shop) {
        // Fallback values for image, price, and name
        const image = product.car_display_image || product.product_image_url || (product.images && product.images[0]) || 'https://placehold.co/150x150';
        const name = product.name || product.title || `${product.make} ${product.model}` || 'Unnamed Product';
        const priceAmount = (product.price && product.price.amount) || product.price || product.price_ksh || 0;
        const price = priceAmount > 0 ? `KES ${priceAmount.toLocaleString()}` : 'Price not available';
        const id = product.item_id || product.id || product.propertyId;

        return {
            id: id,
            name: name,
            price: price,
            image: image,
            shop_id: shop.shop_id,
            shop_name: shop.name,
            shop_logo: shop.logo_url,
            isDiscounted: product.isDiscounted || product.isDeals || (product.discount_percent && product.discount_percent > 0) || false,
            rating: product.rating || product.review_star_rate || 0,
            views: product.views || 0, // Only present in Soko Properties
            dateAdded: new Date(product.listingDate || product.date_added || '1970-01-01'),
        };
    }

    /**
     * Fetches shop data and then all product data files,
     * standardizing and caching all products into a single array.
     */
    async function fetchAndStandardizeAllData() {
        try {
            const shopsResponse = await fetch('data/shops.json');
            if (!shopsResponse.ok) throw new Error(`HTTP error! Status: ${shopsResponse.status}`);
            shopsData = await shopsResponse.json();

            const productFetchPromises = shopsData.map(shop =>
                fetch(`data/${shop.product_data_file}`)
                .then(response => {
                    if (!response.ok) {
                        console.warn(`Could not fetch data for ${shop.name}. Status: ${response.status}`);
                        return [];
                    }
                    return response.json();
                })
                .then(products => products.map(product => standardizeProduct(product, shop)))
                .catch(error => {
                    console.error(`Error fetching products for ${shop.name}:`, error);
                    return [];
                })
            );

            const productsByShop = await Promise.all(productFetchPromises);
            allProducts = productsByShop.flat();
            console.log('All product data loaded and standardized:', allProducts.length, 'products found.');

        } catch (error) {
            console.error('Error fetching initial data:', error);
        }
    }

    await fetchAndStandardizeAllData();

    // =========================================================
    // 2. Populate Hero Section
    // =========================================================
    const heroSlider = document.querySelector('.hero-slider');
    const heroSlidesData = [
        {
            image_url: 'https://placehold.co/1200x450/B0E0E6/000000?text=4K+Smart+TV',
            headline: "Super AMOLED Smart TV",
            description: "Experience stunning 4K resolution at an unbeatable price!",
            cta_link: "/shops/click_n_get-categories.html",
            cta_text: "Shop Now"
        },
        {
            image_url: 'https://placehold.co/1200x450/F0E0D0/000000?text=Range+Rover+Sport',
            headline: "Range Rover Sport 2020",
            description: "Luxury and performance combined. Explore a new standard of driving.",
            cta_link: "/shops/autogiant_motors-categories.html",
            cta_text: "View Vehicle"
        },
        {
            image_url: 'https://placehold.co/1200x450/E0F0E0/000000?text=Lavington+Townhouse',
            headline: "Spacious 4-Bedroom Townhouse",
            description: "Your new dream home awaits in the serene neighborhood of Lavington.",
            cta_link: "/shops/soko_properties-categories.html",
            cta_text: "View Property"
        }
    ];

    function renderHeroSlider() {
        if (!heroSlider) {
            console.error('Error: ".hero-slider" element not found in the DOM.');
            return;
        }

        // Clear previous content
        heroSlider.innerHTML = '';

        heroSlidesData.forEach((slide, index) => {
            const slideElement = document.createElement('div');
            slideElement.classList.add('hero-slide');
            if (index === 0) {
                slideElement.classList.add('active');
            }

            slideElement.innerHTML = `
                <img src="${slide.image_url}" alt="${slide.headline}" class="hero-bg-image">
                <div class="hero-slide-content">
                    <h2>${slide.headline}</h2>
                    <p>${slide.description}</p>
                    <a href="${slide.cta_link}" class="btn-primary">${slide.cta_text}</a>
                </div>
            `;
            heroSlider.appendChild(slideElement);
        });

        // Add gift icon to spin-win-card
        const spinWinCard = document.querySelector('.spin-win-card');
        if (spinWinCard) {
            spinWinCard.insertAdjacentHTML('afterbegin', '<i class="fas fa-gift spin-icon"></i>');
        }

        let currentSlide = 0;
        const slides = document.querySelectorAll('.hero-slide');
        setInterval(() => {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        }, 5000); // Change slide every 5 seconds
    }

    // =========================================================
    // 3. Populate Top Categories Section 
    // =========================================================
    const topCategoriesGrid = document.getElementById('categories-grid');

    function renderTopCategories() {
        if (!topCategoriesGrid) {
            console.error('Error: "categories-grid" element not found in the DOM.');
            return;
        }

        try {
            const allCategories = shopsData.flatMap(shop => shop.categories);
            const uniqueCategories = [...new Set(allCategories)];
            const categoryShopMap = {};

            shopsData.forEach(shop => {
                shop.categories.forEach(category => {
                    if (!categoryShopMap[category]) {
                        categoryShopMap[category] = shop.shop_id;
                    }
                });
            });

            const startIndex = parseInt(localStorage.getItem('categoryStartIndex')) || 0;
            const categoriesPerLoad = 8;
            let endIndex = startIndex + categoriesPerLoad;
            let newStartIndex = endIndex;

            if (endIndex >= uniqueCategories.length) {
                endIndex = uniqueCategories.length;
                newStartIndex = 0;
            }

            const categoriesToDisplay = uniqueCategories.slice(startIndex, endIndex);
            localStorage.setItem('categoryStartIndex', newStartIndex);

            topCategoriesGrid.innerHTML = '';

            categoriesToDisplay.forEach(category => {
                const shopId = categoryShopMap[category];
                const linkUrl = shopId ? `/shops/${shopId}-categories.html#${category.toLowerCase().replace(/\s+/g, '-')}` : '#';
                const card = document.createElement('a');
                card.href = linkUrl;
                card.classList.add('category-card');
                const placeholderImageUrl = `https://placehold.co/150x150/E0E0E0/000000?text=${category.split(' ')[0]}`;
                card.innerHTML = `
                    <img src="${placeholderImageUrl}" alt="Category: ${category}" class="category-image">
                    <h3>${category}</h3>
                `;
                topCategoriesGrid.appendChild(card);
            });
        } catch (error) {
            console.error('Error fetching or rendering categories:', error);
            topCategoriesGrid.innerHTML = '<p class="text-center">Failed to load categories. Please try again later.</p>';
        }
    }

    // =========================================================
    // 4. Populate Recommended for You Section (UNCHANGED)
    // =========================================================
    const recommendedGrid = document.getElementById('recommended-products-grid');
    const exploreMoreBtn = document.getElementById('explore-more-btn');

    function renderRecommendedProducts() {
        if (!recommendedGrid || !exploreMoreBtn) {
            console.error('Error: "recommended-products-grid" or "explore-more-btn" element not found in the DOM.');
            return;
        }

        if (allProducts.length === 0) {
            recommendedGrid.innerHTML = '<p class="text-center">No recommendations available.</p>';
            exploreMoreBtn.style.display = 'none';
            return;
        }

        const userPreferences = JSON.parse(localStorage.getItem('userPreferences')) || { lastVisitedShopId: null };
        const productsToDisplay = [];
        const numToDisplay = 12;

        if (userPreferences.lastVisitedShopId) {
            const preferredShopProducts = allProducts.filter(p => p.shop_id === userPreferences.lastVisitedShopId);
            if (preferredShopProducts.length > 0) {
                productsToDisplay.push(...preferredShopProducts
                    .sort(() => 0.5 - Math.random())
                    .slice(0, numToDisplay));
            }
        } else {
            const topProducts = allProducts.filter(product =>
                product.isDiscounted || (new Date() - product.dateAdded < 30 * 24 * 60 * 60 * 1000)
            ).sort(() => 0.5 - Math.random());

            const shopProductsCount = {};
            for (const product of topProducts) {
                if (!shopProductsCount[product.shop_id]) {
                    shopProductsCount[product.shop_id] = 0;
                }
                if (shopProductsCount[product.shop_id] < 3 && productsToDisplay.length < numToDisplay) {
                    productsToDisplay.push(product);
                    shopProductsCount[product.shop_id]++;
                }
            }

            if (productsToDisplay.length < numToDisplay) {
                const remaining = allProducts.filter(p => !productsToDisplay.includes(p));
                productsToDisplay.push(...remaining.sort(() => 0.5 - Math.random()).slice(0, numToDisplay - productsToDisplay.length));
            }
        }

        recommendedGrid.innerHTML = '';

        if (productsToDisplay.length > 0) {
            const shopCounts = productsToDisplay.reduce((acc, product) => {
                acc[product.shop_id] = (acc[product.shop_id] || 0) + 1;
                return acc;
            }, {});

            let topShopId = null;
            let maxCount = 0;
            for (const shopId in shopCounts) {
                if (shopCounts[shopId] > maxCount) {
                    maxCount = shopCounts[shopId];
                    topShopId = shopId;
                }
            }

            if (topShopId) {
                exploreMoreBtn.href = `/shops/${topShopId}-categories.html`;
            } else {
                exploreMoreBtn.href = '/shops';
            }

            productsToDisplay.forEach(product => {
                const card = document.createElement('div');
                card.classList.add('product-card-uniform');
                const productUrl = `/shops/${product.shop_id}-products.html#${product.id}`;
                card.innerHTML = `
                    <img src="${product.image}" alt="${product.name}">
                    <h3>${product.name}</h3>
                    <p>From ${product.shop_name}</p>
                    <p>${product.price}</p>
                    <a href="${productUrl}" class="btn-secondary">View Details</a>
                `;
                recommendedGrid.appendChild(card);
            });
        } else {
            recommendedGrid.innerHTML = '<p class="text-center">No recommendations available.</p>';
            exploreMoreBtn.style.display = 'none';
        }
    }

    // =========================================================
    // 5. Initializing Homepage Functionality
    // =========================================================
    renderHeroSlider();
    renderTopCategories();
    renderRecommendedProducts();
});