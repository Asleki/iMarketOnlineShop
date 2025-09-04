// autogiant-motors-product-details.js

document.addEventListener('DOMContentLoaded', async () => {

    const productDetailsSection = document.getElementById('product-details-section');
    const backLink = document.getElementById('back-to-category-link');
    const backLinkText = document.getElementById('back-link-text');

    const relatedProductsCarousel = document.getElementById('related-products-carousel');
    const prevBtn = document.getElementById('related-prev-btn');
    const nextBtn = document.getElementById('related-next-btn');

    let allProducts = [];
    let relatedProducts = [];
    let currentIndex = 0;

    /**
     * Fetches product data from all three JSON files.
     * @returns {Promise<Array>} A promise that resolves with a single array of all products.
     */
    async function fetchAllProducts() {
        try {
            const vehicleUrl = 'data/autogiant-motors-products.json';
            const partsUrl = 'data/autogiant-motors-automotive-parts.json';
            const motorcyclesUrl = 'data/autogiant-motors-motorcycles.json';

            const [vehicleData, partsData, motorcyclesData] = await Promise.all([
                fetch(vehicleUrl).then(res => res.json()),
                fetch(partsUrl).then(res => res.json()),
                fetch(motorcyclesUrl).then(res => res.json())
            ]);

            // Assign categories to products and combine into a single array
            const vehicles = vehicleData.map(item => ({ ...item, category: 'Vehicles' }));
            const parts = partsData.map(item => ({ ...item, category: 'Automotive Parts' }));
            const motorcycles = motorcyclesData.map(item => ({ ...item, category: 'Motorcycles' }));

            return [...vehicles, ...parts, ...motorcycles];

        } catch (error) {
            console.error('Error fetching product data:', error);
            productDetailsSection.innerHTML = '<p class="error-message">Failed to load products. Please check your data files.</p>';
            return [];
        }
    }

    /**
     * Updates the page's meta tags for SEO and social sharing based on the product.
     * @param {Object} product - The product data object.
     */
    function updatePageMetaData(product) {
        const title = product.name || `${product.make} ${product.model}`;
        const description = product.description || `View detailed specifications and features for the ${title} at AutoGiant Motors.`;
        const imageUrl = product.car_display_image || product.images?.[0] || 'https://www.imarket.co.ke/images/autogiant-motors-share.jpg';
        const pageUrl = `https://www.imarket.co.ke/autogiant-motors-product-details.html?id=${encodeURIComponent(product.id || product.model)}`;
        
        document.title = `${title} | AutoGiant Motors`;
        document.querySelector('meta[name="description"]').setAttribute('content', description);
        document.querySelector('meta[property="og:title"]').setAttribute('content', title);
        document.querySelector('meta[property="og:description"]').setAttribute('content', description);
        document.querySelector('meta[property="og:url"]').setAttribute('content', pageUrl);
        document.querySelector('meta[property="og:image"]').setAttribute('content', imageUrl);
        document.querySelector('meta[name="twitter:title"]').setAttribute('content', title);
        document.querySelector('meta[name="twitter:description"]').setAttribute('content', description);
        document.querySelector('meta[name="twitter:image"]').setAttribute('content', imageUrl);
        document.querySelector('link[rel="canonical"]').setAttribute('href', pageUrl);
    }

    /**
     * Renders a single product card for the related products section.
     * @param {Object} product - The product data object.
     * @returns {HTMLElement} The created product card element.
     */
    function createRelatedProductCard(product) {
        const card = document.createElement('a');
        card.href = `autogiant-motors-product-details.html?id=${encodeURIComponent(product.id || product.model)}`;
        card.className = 'product-card';

        const imageSrc = product.images?.[0] || product.car_display_image || 'https://placehold.co/600x400/CCCCCC/000000?text=Image+Not+Found';
        const name = product.name || `${product.make} ${product.model}`;
        const price = product.price || product.price_ksh;
        const displayedPrice = price ? price.toLocaleString() : 'N/A';

        card.innerHTML = `
            <img src="${imageSrc}" alt="${name}" class="product-image">
            <div class="product-info">
                <h3>${name}</h3>
                <p class="price">Ksh ${displayedPrice}</p>
            </div>
        `;
        return card;
    }

    /**
     * Renders the related products carousel based on the current index.
     */
    function renderRelatedProducts() {
        relatedProductsCarousel.innerHTML = '';
        const itemsToShow = relatedProducts.slice(currentIndex, currentIndex + 4);

        if (itemsToShow.length > 0) {
            itemsToShow.forEach(product => {
                const card = createRelatedProductCard(product);
                relatedProductsCarousel.appendChild(card);
            });
        } else {
            relatedProductsCarousel.innerHTML = '<p class="no-results-related">No similar products found in this category.</p>';
        }

        // Disable buttons at start/end of the list
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex + 4 >= relatedProducts.length;
    }

    /**
     * Handles the click event for the next button.
     */
    function handleNext() {
        if (currentIndex + 4 < relatedProducts.length) {
            currentIndex += 4;
            renderRelatedProducts();
        }
    }

    /**
     * Handles the click event for the previous button.
     */
    function handlePrev() {
        if (currentIndex > 0) {
            currentIndex -= 4;
            renderRelatedProducts();
        }
    }

    // Add event listeners for the carousel buttons
    nextBtn.addEventListener('click', handleNext);
    prevBtn.addEventListener('click', handlePrev);

    /**
     * Renders the product details on the page.
     * @param {Object} product - The product data object.
     */
    function renderProductDetails(product) {
        // Clear loading message
        productDetailsSection.innerHTML = '';

        // Determine category for "Back to" link
        backLinkText.textContent = `Back to ${product.category}`;
        backLink.href = `autogiant-motors-categories.html?category=${encodeURIComponent(product.category)}`;

        const mainImage = product.car_display_image || product.images?.[0] || 'https://placehold.co/600x400/CCCCCC/000000?text=Image+Not+Found';
        const productTitle = product.name || `${product.make} ${product.model}`;
        const productPrice = product.price || product.price_ksh;
        const formattedPrice = productPrice ? productPrice.toLocaleString() : 'N/A';
        const contactAgent = product.contact_agent;

        // --- Create HTML for different product types ---
        let specsHtml = '';
        let keyFeaturesHtml = '';
        let fuelEfficiencyHtml = '';
        let badgesHtml = '';

        // Badges
        if (product.imported) badgesHtml += `<span class="product-badge">Imported</span>`;
        if (product.vat_included) badgesHtml += `<span class="product-badge">VAT Included</span>`;
        if (product.shipping_fee) badgesHtml += `<span class="product-badge">Shipping Fee: Ksh ${product.shipping_fee.toLocaleString()}</span>`;
        if (product.waiting_period_days) badgesHtml += `<span class="product-badge">Waiting Period: ${product.waiting_period_days} days</span>`;
        
        // Vehicle-specific details
        if (product.category === 'Vehicles') {
            specsHtml = `
                <li><strong>Color:</strong> ${product.color || 'N/A'}</li>
                <li><strong>Engine:</strong> ${product.engine_type || 'N/A'}</li>
                <li><strong>Doors:</strong> ${product.number_of_doors || 'N/A'}</li>
                <li><strong>Seats:</strong> ${product.seating_capacity || 'N/A'}</li>
                <li><strong>Year:</strong> ${product.year || 'N/A'}</li>
            `;
            if (product.fuel_efficiency) {
                fuelEfficiencyHtml = `
                    <div class="details-subsection">
                        <h3 class="subsection-title">Fuel Efficiency</h3>
                        <ul class="specs-list">
                            <li><strong>City:</strong> ${product.fuel_efficiency.city_km_per_liter} km/L</li>
                            <li><strong>Highway:</strong> ${product.fuel_efficiency.highway_km_per_liter} km/L</li>
                        </ul>
                    </div>
                `;
            }
        }
        
        // Parts/Motorcycle-specific details
        if (product.category === 'Automotive Parts' || product.category === 'Motorcycles') {
            specsHtml = `
                <li><strong>Brand:</strong> ${product.brand || 'N/A'}</li>
                <li><strong>Model No:</strong> ${product.model_number || 'N/A'}</li>
                <li><strong>Condition:</strong> ${product.condition || 'N/A'}</li>
            `;
        }

        // Key Features/Features list
        if (product.features && product.features.length > 0) {
            const featuresListItems = product.features.map(feature => `<li>${feature}</li>`).join('');
            keyFeaturesHtml = `
                <div class="details-subsection">
                    <h3 class="subsection-title">Key Features</h3>
                    <ul class="specs-list">
                        ${featuresListItems}
                    </ul>
                </div>
            `;
        }

        // --- Build the full HTML structure ---
        productDetailsSection.innerHTML = `
            <div class="product-header-content">
                <div class="product-image-gallery">
                    <div class="main-image-container">
                        <img id="main-product-image" src="${mainImage}" alt="${productTitle}">
                    </div>
                    <div id="thumbnail-gallery" class="thumbnail-images">
                        </div>
                </div>

                <div class="product-info-details">
                    <h1 class="product-name">${productTitle}</h1>
                    <p class="product-year">${product.year || ''}</p>
                    <p class="product-price">Ksh ${formattedPrice}</p>
                    <div class="product-badges-wrapper">
                        ${badgesHtml}
                    </div>
                    <ul class="product-specs">
                        ${specsHtml}
                    </ul>
                    <p class="product-description">${product.description || 'No description available.'}</p>
                    
                    ${keyFeaturesHtml}
                    ${fuelEfficiencyHtml}

                    <div class="agent-contact-card">
                        <h3 class="subsection-title">Contact Agent</h3>
                        <ul class="contact-info-list">
                            <li><i class="fas fa-user-circle"></i> ${contactAgent?.name || 'N/A'}</li>
                            <li><i class="fas fa-map-marker-alt"></i> ${contactAgent?.location || 'N/A'}</li>
                            <li><i class="fas fa-phone-alt"></i> ${contactAgent?.tel || 'N/A'}</li>
                        </ul>
                        <a href="autogiant-motors-contact-agent.html?carMake=${encodeURIComponent(product.make || product.brand)}&carModel=${encodeURIComponent(product.model || product.name)}&carYear=${encodeURIComponent(product.year || '')}&agentName=${encodeURIComponent(contactAgent?.name || 'N/A')}&agentPhone=${encodeURIComponent(contactAgent?.tel || 'N/A')}" class="inquire-btn">Inquire Now</a>
                    </div>
                    
                    <div class="currency-converter-card">
                        <h3 class="subsection-title">Currency Converter</h3>
                        <form id="currency-converter-form">
                            <label for="kes-amount">Amount (KES):</label>
                            <input type="number" id="kes-amount" value="${productPrice || ''}" readonly>
                            <label for="currency-select">Convert To:</label>
                            <select id="currency-select">
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                            </select>
                            <button type="submit" class="inquire-btn">Convert</button>
                            <div class="converter-result">
                                <span id="converted-amount-display">$ 0.00</span>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;

        // Populate thumbnail images if available
        const thumbnailGallery = document.getElementById('thumbnail-gallery');
        if (product.images && thumbnailGallery) {
            // Combine images and interior_images arrays for the gallery
            const allImages = [...(product.images || []), ...(product.interior_images || [])];
            
            allImages.forEach(src => {
                const img = document.createElement('img');
                img.src = src;
                img.className = 'thumbnail';
                img.alt = productTitle;
                img.addEventListener('click', () => {
                    document.getElementById('main-product-image').src = src;
                    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
                    img.classList.add('active');
                });
                thumbnailGallery.appendChild(img);
            });
            // Set the first thumbnail as active by default
            const firstThumbnail = thumbnailGallery.querySelector('.thumbnail');
            if (firstThumbnail) {
                firstThumbnail.classList.add('active');
            }
        }

        // Initialize currency converter
        const converterForm = document.getElementById('currency-converter-form');
        const kesAmountInput = document.getElementById('kes-amount');
        const currencySelect = document.getElementById('currency-select');
        const convertedAmountDisplay = document.getElementById('converted-amount-display');

        const exchangeRates = {
            USD: 0.0074, // Example rate
            EUR: 0.0068, // Example rate
            GBP: 0.0059  // Example rate
        };
        
        // Auto-convert on initial load
        const initialCurrency = currencySelect.value;
        const initialConversion = (productPrice * exchangeRates[initialCurrency]).toLocaleString('en-US', { style: 'currency', currency: initialCurrency });
        convertedAmountDisplay.textContent = initialConversion;


        converterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const kesValue = parseFloat(kesAmountInput.value);
            const selectedCurrency = currencySelect.value;
            if (kesValue && exchangeRates[selectedCurrency]) {
                const convertedValue = kesValue * exchangeRates[selectedCurrency];
                convertedAmountDisplay.textContent = convertedValue.toLocaleString('en-US', { style: 'currency', currency: selectedCurrency });
            } else {
                convertedAmountDisplay.textContent = 'Invalid amount';
            }
        });
    }

    // --- Main execution flow ---
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        productDetailsSection.innerHTML = '<p class="error-message">Product ID not found. Please navigate from a category page.</p>';
        return;
    }

    allProducts = await fetchAllProducts();
    const product = allProducts.find(p => (p.id || p.model) === productId);
    
    if (product) {
        updatePageMetaData(product);
        renderProductDetails(product);

        // Filter and display related products
        relatedProducts = allProducts.filter(p => p.category === product.category && (p.id || p.model) !== productId);
        renderRelatedProducts();

    } else {
        productDetailsSection.innerHTML = '<p class="no-results">Product not found.</p>';
    }

});