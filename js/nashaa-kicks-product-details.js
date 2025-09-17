// js/nashaa-kicks-product-details.js

document.addEventListener('DOMContentLoaded', async () => {

    const productDetailsContainer = document.getElementById('product-details-content');
    const relatedProductsContainer = document.getElementById('related-products-container');
    const pageTitle = document.getElementById('page-title');

    // Color lookup map to get names from hex codes without changing the JSON file.
    const colorMap = {
        '#FFFFFF': 'White',
        '#000000': 'Black',
        '#808080': 'Gray',
        '#FF0000': 'Red',
        '#0000FF': 'Blue',
        '#008000': 'Green',
        '#800080': 'Purple',
        '#FFFF00': 'Yellow',
        '#FFA500': 'Orange'
        // You can add more hex-to-name mappings here as needed
    };

    // Function to get URL parameters
    function getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        const results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    // Function to show a custom alert message
    function showCustomAlert(message, type = 'success') {
        let alert = document.querySelector('.custom-alert');
        if (!alert) {
            alert = document.createElement('div');
            alert.classList.add('custom-alert');
            document.body.appendChild(alert);
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

    // Function to create HTML for product features
    function createFeaturesHtml(features) {
        if (!features || features.length === 0) {
            return '<p>No features listed.</p>';
        }
        const featureItems = features.map(feature => `
            <li><i class="fa-solid fa-check"></i> ${feature}</li>
        `).join('');
        return `<ul class="features-list">${featureItems}</ul>`;
    }

    // Function to create HTML for product details
    function createProductDetailsHtml(product) {
        const fullStars = Math.floor(product.rating);
        const hasHalfStar = (product.rating % 1) !== 0;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let ratingHtml = '';
        for (let i = 0; i < fullStars; i++) {
            ratingHtml += '<i class="fas fa-star"></i>';
        }
        if (hasHalfStar) {
            ratingHtml += '<i class="fas fa-star-half-alt"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            ratingHtml += '<i class="far fa-star"></i>';
        }

        const priceString = new Intl.NumberFormat('en-KE', { style: 'currency', currency: product.currency }).format(product.price);

        return `
            <div class="product-image-gallery">
                <div class="main-image-container">
                    <img src="${product.images[0]}" alt="${product.name}" class="main-image" id="main-product-image">
                </div>
                <div class="image-thumbnails" id="product-thumbnails">
                    ${product.images.map(image => `
                        <img src="${image}" alt="${product.name} thumbnail" class="thumbnail-image">
                    `).join('')}
                </div>
            </div>

            <div class="product-info-panel">
                <p class="brand">${product.brand}</p>
                <h1 class="product-name">${product.name}</h1>
                <p class="product-price">${priceString}</p>

                <div class="rating-reviews">
                    <div class="stars">${ratingHtml}</div>
                    <span>(${product.reviewsCount} Reviews)</span>
                </div>

                <div class="options-group">
                    <label>Colors:</label>
                    <div class="color-swatches" id="color-swatches-container">
                        ${product.availableColors.map((hexCode) => {
                            const colorName = colorMap[hexCode] || hexCode; // Use lookup map or fall back to hex code
                            return `
                                <span class="color-swatch" style="background-color: ${hexCode};" data-color-name="${colorName}" title="${colorName}"></span>
                            `;
                        }).join('')}
                    </div>
                </div>

                <div class="options-group">
                    <label>Sizes:</label>
                    <div class="size-buttons" id="size-buttons-container">
                        ${product.availableSizes.map((size) => `
                            <button class="size-button" data-size="${size}">${size}</button>
                        `).join('')}
                    </div>
                </div>

                <div class="quantity-add-cart">
                    <div class="quantity-control">
                        <button class="quantity-btn" id="decrease-qty" ${product.minOrderQuantity === 1 ? 'disabled' : ''}>-</button>
                        <input type="number" id="quantity-input" value="${product.minOrderQuantity}" min="${product.minOrderQuantity}" max="${product.maxOrderQuantity}">
                        <button class="quantity-btn" id="increase-qty" ${product.maxOrderQuantity === 1 ? 'disabled' : ''}>+</button>
                    </div>
                    <button class="btn-primary add-to-cart-btn">Add to Cart</button>
                </div>

                <div class="other-details">
                    <h3>Description</h3>
                    <p class="description">${product.description}</p>

                    <h3>Features</h3>
                    ${createFeaturesHtml(product.features)}
                </div>
            </div>
        `;
    }

    // Function to create a related product card
    function createRelatedProductCard(product) {
        const priceString = new Intl.NumberFormat('en-KE', { style: 'currency', currency: product.currency }).format(product.price);
        return `
            <a href="nashaa-kicks-product-details.html?id=${product.id}" class="product-card-uniform" title="View details for ${product.name}">
                <img src="${product.images[0]}" alt="${product.name}" loading="lazy">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">${priceString}</p>
            </a>
        `;
    }

    async function loadProductDetails() {
        const productId = getUrlParameter('id');

        if (!productId) {
            productDetailsContainer.innerHTML = '<p class="error-message">Product ID not found in URL. Please go back to the <a href="nashaa-kicks-index.html">homepage</a>.</p>';
            return;
        }

        try {
            const response = await fetch('data/nashaa-kicks.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const products = await response.json();
            const product = products.find(p => p.id === productId);

            if (product) {
                // Update page title
                pageTitle.textContent = `${product.name} | Nashaa Kicks`;

                // Render product details
                productDetailsContainer.innerHTML = createProductDetailsHtml(product);

                // Set up interactive elements
                setupInteractiveElements(product);

                // Load and display related products
                loadRelatedProducts(products, product.category, productId);

            } else {
                productDetailsContainer.innerHTML = `<p class="error-message">Product with ID "${productId}" not found.</p>`;
            }

        } catch (error) {
            console.error('Failed to load product data:', error);
            productDetailsContainer.innerHTML = `<p class="error-message">Failed to load product data. Please try again later.</p>`;
        }
    }

    function loadRelatedProducts(allProducts, currentCategory, currentProductId) {
        const related = allProducts.filter(p => p.category === currentCategory && p.id !== currentProductId);

        relatedProductsContainer.innerHTML = ''; // Clear container
        if (related.length > 0) {
            related.slice(0, 4).forEach(p => {
                relatedProductsContainer.innerHTML += createRelatedProductCard(p);
            });
        } else {
            relatedProductsContainer.innerHTML = `<p class="no-products-message">No related products found in this category.</p>`;
        }
    }

    function setupInteractiveElements(product) {
        // Initial state for quantity buttons
        const quantityInput = document.getElementById('quantity-input');
        const decreaseBtn = document.getElementById('decrease-qty');
        const increaseBtn = document.getElementById('increase-qty');

        function updateQuantityButtons() {
            const currentVal = parseInt(quantityInput.value);
            decreaseBtn.disabled = (currentVal <= product.minOrderQuantity);
            increaseBtn.disabled = (currentVal >= product.maxOrderQuantity);
        }

        // --- Image Gallery Logic ---
        const mainImage = document.getElementById('main-product-image');
        const thumbnails = document.querySelectorAll('.thumbnail-image');
        if (thumbnails.length > 0) {
            thumbnails[0].classList.add('active'); // Set first thumbnail as active by default
        }
        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                // Update main image source
                mainImage.src = thumb.src;
                // Update active thumbnail class
                thumbnails.forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
        });

        // --- Quantity Control Logic ---
        decreaseBtn.addEventListener('click', () => {
            let currentVal = parseInt(quantityInput.value);
            if (currentVal > product.minOrderQuantity) {
                quantityInput.value = currentVal - 1;
                updateQuantityButtons();
            }
        });

        increaseBtn.addEventListener('click', () => {
            let currentVal = parseInt(quantityInput.value);
            if (currentVal < product.maxOrderQuantity) {
                quantityInput.value = currentVal + 1;
                updateQuantityButtons();
            }
        });

        quantityInput.addEventListener('change', () => {
            let currentVal = parseInt(quantityInput.value);
            if (isNaN(currentVal) || currentVal < product.minOrderQuantity) {
                quantityInput.value = product.minOrderQuantity;
            } else if (currentVal > product.maxOrderQuantity) {
                quantityInput.value = product.maxOrderQuantity;
            }
            updateQuantityButtons();
        });

        // --- Color/Size Selection Logic ---
        const colorSwatches = document.querySelectorAll('.color-swatch');
        colorSwatches.forEach((swatch, index) => {
            swatch.addEventListener('click', () => {
                colorSwatches.forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');
            });
            if (index === 0) {
                swatch.classList.add('active'); // Select first color by default
            }
        });

        const sizeButtons = document.querySelectorAll('.size-button');
        sizeButtons.forEach((button, index) => {
            button.addEventListener('click', () => {
                sizeButtons.forEach(b => b.classList.remove('active'));
                button.classList.add('active');
            });
            if (index === 0) {
                button.classList.add('active'); // Select first size by default
            }
        });

        // --- Add to Cart Logic ---
        const addToCartBtn = document.querySelector('.add-to-cart-btn');
        addToCartBtn.addEventListener('click', () => {
            const selectedColorElement = document.querySelector('.color-swatch.active');
            const selectedSizeElement = document.querySelector('.size-button.active');
            const quantity = parseInt(quantityInput.value);

            if (!selectedColorElement) {
                showCustomAlert('Please select a color.', 'error');
                return;
            }
            if (!selectedSizeElement) {
                showCustomAlert('Please select a size.', 'error');
                return;
            }

            const selectedColor = selectedColorElement.dataset.colorName;
            const selectedSize = selectedSizeElement.dataset.size;

            // Log the item details (replace with actual cart functionality)
            console.log(`Added to cart: ${quantity} x ${product.name}, Color: ${selectedColor}, Size: ${selectedSize}`);

            // Show custom alert
            showCustomAlert(`${product.name} added to cart!`);

            // You would also update the cart count in the header here
            // Example: updateCartCount(1); // Assuming a global function exists
        });

        updateQuantityButtons(); // Initial call to set button states
    }

    // Call the function to load and display product details
    loadProductDetails();
});