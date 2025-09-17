// js/autogiant-motors-product-details.js

document.addEventListener('DOMContentLoaded', async () => {

    const productDetailsContainer = document.getElementById('product-details-content');
    const pageTitle = document.getElementById('page-title');
    const breadcrumbProductName = document.getElementById('breadcrumb-product-name');
    const relatedProductsContainer = document.getElementById('related-products-container');
    const customAlertContainer = document.getElementById('custom-alert-container');

    // Mappings for Font Awesome icons based on product data keys
    const iconMap = {
        'make': 'fas fa-car-side',
        'model': 'fas fa-cogs',
        'year': 'fas fa-calendar-alt',
        'color': 'fas fa-palette',
        'engine_type': 'fas fa-gas-pump',
        'number_of_doors': 'fas fa-door-closed',
        'seating_capacity': 'fas fa-users',
        'fuel_type': 'fas fa-gas-pump',
        'transmission': 'fas fa-cogs',
        'city_km_per_liter': 'fas fa-city',
        'highway_km_per_liter': 'fas fa-road',
        'mileage_km': 'fas fa-tachometer-alt',
        'horsepower': 'fas fa-horse',
        'torque': 'fas fa-gear',
        'part_number': 'fas fa-barcode',
        'brand': 'fas fa-award',
        'category': 'fas fa-tags',
        'subCategory': 'fas fa-tag',
        'inStock': 'fas fa-warehouse',
        'warranty': 'fas fa-shield-alt',
        'engine_size': 'fas fa-engine',
        'displacement': 'fas fa-chart-bar'
    };
    
    // Function to get URL parameters
    function getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        const results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }
    
    /**
     * Shows a custom alert message at the top of the page.
     * @param {string} message - The message to display.
     * @param {string} type - The type of alert ('success' or 'error').
     */
    function showCustomAlert(message, type = 'success') {
        let alert = document.querySelector('.custom-alert');
        if (!alert) {
            alert = document.createElement('div');
            alert.classList.add('custom-alert');
            customAlertContainer.appendChild(alert);
        }
        
        // Update message and type
        alert.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${message}`;
        alert.classList.remove('success', 'error');
        alert.classList.add(type);
        
        // Show the alert
        alert.classList.add('show');
        
        // Hide the alert after 3 seconds
        setTimeout(() => {
            alert.classList.remove('show');
        }, 3000);
    }
    
    /**
     * Fetches all product data from the different JSON files.
     * @returns {Promise<Array>} A single array containing all products.
     */
    async function fetchAllProducts() {
        const vehicleUrl = 'data/autogiant-motors-products.json';
        const partsUrl = 'data/autogiant-motors-automotive-parts.json';
        const motorcyclesUrl = 'data/autogiant-motors-motorcycles.json';

        try {
            const [vehicles, parts, motorcycles] = await Promise.all([
                fetch(vehicleUrl).then(res => res.json()),
                fetch(partsUrl).then(res => res.json()),
                fetch(motorcyclesUrl).then(res => res.json())
            ]);

            // Assign a unique type to each product to identify its origin
            const allProducts = [
                ...vehicles.map(item => ({ ...item, type: 'vehicle', id: item.model || item.id })),
                ...parts.map(item => ({ ...item, type: 'part' })),
                ...motorcycles.map(item => ({ ...item, type: 'motorcycle' }))
            ];
            
            return allProducts;
        } catch (error) {
            console.error('Error fetching data:', error);
            productDetailsContainer.innerHTML = `<p class="text-center error-message">Failed to load product data. Please try again later.</p>`;
            return null;
        }
    }

    /**
     * Creates a single product card HTML element.
     * This is used for the related products section.
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
        if (product.isDiscounted && product.discountPercentage) {
            badges.push(`<span class="badge deal">${product.discountPercentage}% Off</span>`);
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
     * Renders a product's details to the page.
     * @param {Object} product - The product object to display.
     */
    function renderProductDetails(product) {
        // Update the page title and breadcrumb
        const productName = product.name || `${product.make} ${product.model}`;
        pageTitle.textContent = `${productName} | AutoGiant Motors`;
        breadcrumbProductName.textContent = productName;

        // Build the main details HTML
        const mainImage = product.car_display_image || product.images[0] || 'https://placehold.co/1000x750/CCCCCC/000000?text=Image+Not+Found';
        const imagesHtml = (product.images || product.thumbnails || []).map(image => `
            <img src="${image}" alt="${productName} thumbnail" class="thumbnail-image">
        `).join('');
        
        const price = product.price || product.price_ksh;
        const priceHtml = price ? `
            <p class="product-price">Ksh ${price.toLocaleString()}${product.originalPrice ? `<span class="original-price">Ksh ${product.originalPrice.toLocaleString()}</span>` : ''}</p>
        ` : '';

        const badgesHtml = `
            <div class="badges-container">
                ${product.isFeatured ? `<span class="product-badge"><i class="fas fa-star"></i> Featured</span>` : ''}
                ${product.isDeals ? `<span class="product-badge"><i class="fas fa-tags"></i> Deal</span>` : ''}
                ${product.vat_included ? `<span class="product-badge"><i class="fas fa-percent"></i> VAT Included</span>` : ''}
                ${product.imported ? `<span class="product-badge"><i class="fas fa-globe"></i> Imported</span>` : ''}
                ${product.inStock ? `<span class="product-badge"><i class="fas fa-check-circle"></i> In Stock</span>` : ''}
                ${product.freeShipping ? `<span class="product-badge"><i class="fas fa-shipping-fast"></i> Free Shipping</span>` : ''}
            </div>
        `;
        
        const detailsHtml = `
            <div class="product-image-gallery">
                <div class="main-image-container">
                    <img src="${mainImage}" alt="${productName}" class="main-image" id="main-product-image">
                </div>
                <div class="image-thumbnails" id="product-thumbnails">
                    ${imagesHtml}
                </div>
            </div>
            
            <div class="product-info-panel">
                <h1 class="product-name">${productName}</h1>
                ${priceHtml}
                ${badgesHtml}
                <p class="description-full">${product.description || 'No description available for this product.'}</p>
                ${createFeaturesTable(product)}
                ${product.contact_agent ? createContactAgentSection(product) : ''}
            </div>
        `;
        
        productDetailsContainer.innerHTML = detailsHtml;
        setupInteractiveElements(product);
    }
    
    /**
     * Creates the dynamic features table based on the product type.
     * @param {Object} product - The product data object.
     * @returns {string} The HTML for the features table.
     */
    function createFeaturesTable(product) {
        let tableRows = '';
        
        // Define a mapping of JSON keys to user-friendly display names
        const featuresMapping = {
            'year': 'Year',
            'make': 'Make',
            'model': 'Model',
            'engine_type': 'Engine Type',
            'engine_size': 'Engine Size',
            'horsepower': 'Horsepower',
            'torque': 'Torque',
            'transmission': 'Transmission',
            'fuel_type': 'Fuel Type',
            'mileage_km': 'Mileage',
            'color': 'Color',
            'number_of_doors': 'Number of Doors',
            'seating_capacity': 'Seating Capacity',
            'warranty': 'Warranty',
            'part_number': 'Part Number',
            'brand': 'Brand'
        };
        
        // Add specific features based on product type
        if (product.type === 'vehicle' || product.type === 'motorcycle') {
            for (const key in featuresMapping) {
                if (product[key] !== undefined) {
                    const iconClass = iconMap[key] || 'fas fa-info-circle';
                    const value = product[key] || 'N/A';
                    tableRows += `
                        <tr>
                            <td><i class="feature-icon ${iconClass}"></i> ${featuresMapping[key]}</td>
                            <td>${value}</td>
                        </tr>
                    `;
                }
            }
            if (product.fuel_efficiency) {
                tableRows += `
                    <tr>
                        <td><i class="feature-icon fas fa-city"></i> City Fuel Efficiency</td>
                        <td>${product.fuel_efficiency.city_km_per_liter} km/L</td>
                    </tr>
                    <tr>
                        <td><i class="feature-icon fas fa-road"></i> Highway Fuel Efficiency</td>
                        <td>${product.fuel_efficiency.highway_km_per_liter} km/L</td>
                    </tr>
                `;
            }
        } else if (product.type === 'part') {
             for (const key in featuresMapping) {
                if (product[key] !== undefined) {
                    const iconClass = iconMap[key] || 'fas fa-info-circle';
                    const value = product[key] || 'N/A';
                    tableRows += `
                        <tr>
                            <td><i class="feature-icon ${iconClass}"></i> ${featuresMapping[key]}</td>
                            <td>${value}</td>
                        </tr>
                    `;
                }
            }
        }
        
        // Add a general features section if it exists
        if (product.features && product.features.length > 0) {
            tableRows += `
                <tr>
                    <td><i class="feature-icon fas fa-list"></i> Additional Features</td>
                    <td>${product.features.join(', ')}</td>
                </tr>
            `;
        }

        return `
            <table class="product-features-table">
                <thead>
                    <tr>
                        <th>Feature</th>
                        <th>Details</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        `;
    }

    /**
     * Creates the contact agent section HTML.
     * @param {Object} product - The product data object.
     * @returns {string} The HTML for the contact agent section.
     */
    function createContactAgentSection(product) {
        const agent = product.contact_agent;
        const inquireLink = `autogiant-motors-contact-agent.html?carMake=${encodeURIComponent(product.make)}&carModel=${encodeURIComponent(product.model)}&carYear=${encodeURIComponent(product.year)}&agentName=${encodeURIComponent(agent.name)}&agentPhone=${encodeURIComponent(agent.tel)}`;

        return `
            <div class="contact-agent-section">
                <h3 class="contact-agent-title">Contact Agent</h3>
                <div class="agent-details">
                    <p class="agent-name">${agent.name}</p>
                    <p class="agent-location"><i class="fas fa-map-marker-alt"></i> ${agent.location}</p>
                    <p class="agent-phone"><i class="fas fa-phone"></i> ${agent.tel}</p>
                </div>
                <a href="${inquireLink}" class="btn btn-primary inquire-btn">
                    <i class="fas fa-envelope"></i> Inquire Now
                </a>
            </div>
        `;
    }

    /**
     * Sets up event listeners for interactive elements like the image gallery.
     * @param {Object} product - The product data object.
     */
    function setupInteractiveElements(product) {
        const mainImage = document.getElementById('main-product-image');
        const thumbnails = document.querySelectorAll('.thumbnail-image');

        if (thumbnails.length > 0) {
            thumbnails[0].classList.add('active'); // Set first thumbnail as active
        }
        
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                mainImage.src = thumb.src;
                thumbnails.forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
        });
    }
    
    async function loadProductDetails() {
        const productId = getUrlParameter('id');
        
        if (!productId) {
            productDetailsContainer.innerHTML = '<p class="text-center error-message">Product ID not found in URL. Please go back to the <a href="autogiant-motors-index.html">homepage</a>.</p>';
            return;
        }

        const allProducts = await fetchAllProducts();
        if (!allProducts) return;
        
        const product = allProducts.find(p => p.id === productId);

        if (product) {
            renderProductDetails(product);
            
            // Load and display related products
            const related = allProducts.filter(p => p.id !== productId && p.type === product.type).slice(0, 4);
            if (related.length > 0) {
                relatedProductsContainer.innerHTML = '';
                related.forEach(p => {
                    relatedProductsContainer.appendChild(createProductCard(p));
                });
            } else {
                relatedProductsContainer.innerHTML = `<p class="text-center no-products-message">No related products found in this category.</p>`;
            }
        } else {
            productDetailsContainer.innerHTML = `<p class="text-center error-message">Product with ID "${productId}" not found.</p>`;
        }
    }
    
    loadProductDetails();
});