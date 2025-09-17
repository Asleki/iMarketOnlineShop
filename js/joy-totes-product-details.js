// js/joy-totes-product-details.js

document.addEventListener('DOMContentLoaded', async () => {

    // Define the cart count key and get the cart count element
    const cartCountKey = 'joy-totes-cart-count';
    const cartCountElement = document.getElementById('cart-count');

    // Function to update the cart count in the header
    function updateCartCount() {
        const currentCount = parseInt(localStorage.getItem(cartCountKey) || '0');
        if (cartCountElement) {
            cartCountElement.textContent = currentCount;
        }
    }

    // Function to show a custom alert message
    function showAlertMessage(message) {
        const alertBox = document.createElement('div');
        alertBox.className = 'styled-alert-message';
        alertBox.innerHTML = `
            <p>${message}</p>
            <button id="alert-close-btn">OK</button>
        `;
        document.body.appendChild(alertBox);

        setTimeout(() => {
            alertBox.classList.add('show');
        }, 10);

        document.getElementById('alert-close-btn').addEventListener('click', () => {
            alertBox.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(alertBox);
            }, 300);
        });
    }

    // Function to show the "Added to Cart" success message
    function showSuccessMessage(productName) {
        const message = document.createElement('div');
        message.className = 'cart-success-message';
        message.innerHTML = `<span class="product-name">${productName}</span> has been successfully added to cart.`;
        document.body.appendChild(message);

        setTimeout(() => {
            message.classList.add('show');
        }, 10);

        setTimeout(() => {
            message.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(message);
            }, 500);
        }, 3000);
    }

    // Function to create a product card HTML string (for related products)
    function createProductCard(product) {
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
    
        let badgesHtml = '';
        if (product.isFeatured) {
            badgesHtml += `<span class="badge featured">Featured</span>`;
        }
        if (product.isDeals) {
            badgesHtml += `<span class="badge discount">Deal</span>`;
        }
    
        const priceString = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(product.price);
    
        const imageUrl = product.images[0];
    
        return `
            <div class="product-card-uniform">
                <div class="product-badges">${badgesHtml}</div>
                <a href="joy-totes-product-details.html?id=${product.id}" title="View details for ${product.name}">
                    <img src="${imageUrl}" alt="${product.name}" loading="lazy">
                    <h3 class="product-name">${product.name}</h3>
                </a>
                <div class="product-details">
                    <p class="product-rating">${ratingHtml} (${product.reviewsCount})</p>
                    <p class="product-price">Price: <span class="price-value">${priceString}</span></p>
                    <button class="btn-primary add-to-cart-btn" data-product-id="${product.id}" data-product-name="${product.name}">
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                </div>
            </div>
        `;
    }

    async function loadProductDetails() {
        const urlParams = new URLSearchParams(window.location.search);
        const productId = urlParams.get('id');

        if (!productId) {
            document.getElementById('product-details-container').innerHTML = `<p class="error-message text-center">No product ID specified in the URL.</p>`;
            document.querySelector('.related-products-section').style.display = 'none';
            return;
        }

        try {
            const response = await fetch('data/joy-totes.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const products = await response.json();
            const product = products.find(p => p.id === productId);

            if (!product) {
                document.getElementById('product-details-container').innerHTML = `<p class="error-message text-center">Product not found.</p>`;
                document.querySelector('.related-products-section').style.display = 'none';
                return;
            }

            // Update page title
            document.getElementById('product-page-title').textContent = `${product.name} | Joy Totes`;

            // Function to render stars
            function renderStars(rating) {
                const fullStars = Math.floor(rating);
                const hasHalfStar = (rating % 1) !== 0;
                let starsHtml = '';
                for (let i = 0; i < fullStars; i++) {
                    starsHtml += '<i class="fas fa-star"></i>';
                }
                if (hasHalfStar) {
                    starsHtml += '<i class="fas fa-star-half-alt"></i>';
                }
                for (let i = 0; i < (5 - fullStars - (hasHalfStar ? 1 : 0)); i++) {
                    starsHtml += '<i class="far fa-star"></i>';
                }
                return starsHtml;
            }

            // Generate available colors HTML
            const availableColorsHtml = product.availableColors.map(color => {
                const isSelected = color === product.color;
                return `
                    <div class="color-swatch-wrapper">
                        <div class="color-swatch ${color.toLowerCase().replace(/\s/g, '-')} ${isSelected ? 'selected' : ''}" data-color="${color}" title="${color}" style="background-color: ${color.toLowerCase() === 'khaki' ? 'khaki' : color.toLowerCase() === 'black' ? 'black' : color.toLowerCase() === 'navy' ? 'navy' : color};"></div>
                        <span class="color-name">${color}</span>
                    </div>
                `;
            }).join('');

            // Generate main product details HTML
            const priceString = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(product.price);
            
            const productDetailsHtml = `
                <div class="product-image-gallery">
                    <div class="main-image-container">
                        <img id="main-product-image" src="${product.images[0]}" alt="${product.name}">
                    </div>
                    <div class="thumbnail-images">
                        ${product.images.map((img, index) => `<img src="${img}" alt="Thumbnail ${index + 1}" data-image-url="${img}" class="${index === 0 ? 'active' : ''}">`).join('')}
                    </div>
                </div>
                <div class="product-info">
                    <h1>${product.name}</h1>
                    <div class="product-rating">
                        ${renderStars(product.rating)}
                        <span class="rating-count">(${product.reviewsCount} reviews)</span>
                    </div>
                    <p class="product-price">${priceString}</p>
                    <p class="product-stock-status">
                        <i class="fas fa-info-circle"></i> In Stock: ${product.inStock} items available
                    </p>
                    <div class="product-options">
                        <div class="available-colors-section">
                            <span class="option-label">Available Colors:</span>
                            <div class="color-swatches-container">
                                ${availableColorsHtml}
                            </div>
                        </div>

                        <div class="quantity-selector">
                            <label for="quantity" class="option-label">Quantity:</label>
                            <div class="quantity-control">
                                <button id="decrement-btn" class="quantity-btn"><i class="fas fa-minus"></i></button>
                                <input type="number" id="quantity" name="quantity" value="1" min="${product.minOrderQuantity}" max="${product.maxOrderQuantity}">
                                <button id="increment-btn" class="quantity-btn"><i class="fas fa-plus"></i></button>
                            </div>
                        </div>
                    </div>

                    <button class="btn-primary add-to-cart-btn" data-product-id="${product.id}" data-product-name="${product.name}">
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                    <ul class="product-features-list">
                        ${product.features.map(feature => `<li><i class="fas fa-check-circle"></i> ${feature}</li>`).join('')}
                    </ul>
                </div>
            `;
            document.getElementById('product-details-container').innerHTML = productDetailsHtml;

            // Quantity control logic
            const quantityInput = document.getElementById('quantity');
            const incrementBtn = document.getElementById('increment-btn');
            const decrementBtn = document.getElementById('decrement-btn');

            incrementBtn.addEventListener('click', () => {
                let currentValue = parseInt(quantityInput.value);
                if (currentValue < product.maxOrderQuantity) {
                    quantityInput.value = currentValue + 1;
                } else {
                    showAlertMessage(`You cannot add more than ${product.maxOrderQuantity} item(s).`);
                }
            });

            decrementBtn.addEventListener('click', () => {
                let currentValue = parseInt(quantityInput.value);
                if (currentValue > product.minOrderQuantity) {
                    quantityInput.value = currentValue - 1;
                } else {
                    showAlertMessage(`You cannot order less than ${product.minOrderQuantity} item(s).`);
                }
            });

            // Image switching logic
            document.querySelectorAll('.thumbnail-images img').forEach(thumbnail => {
                thumbnail.addEventListener('click', (event) => {
                    document.getElementById('main-product-image').src = event.target.dataset.imageUrl;
                    document.querySelectorAll('.thumbnail-images img').forEach(img => img.classList.remove('active'));
                    event.target.classList.add('active');
                });
            });

            // Color swatch logic
            document.querySelectorAll('.color-swatch').forEach(swatch => {
                swatch.addEventListener('click', (event) => {
                    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
                    event.target.classList.add('selected');
                });
            });

            // Load related products
            const relatedProducts = products.filter(p => p.category === product.category && p.id !== product.id);
            const relatedProductsContainer = document.getElementById('related-products-container');
            if (relatedProducts.length > 0) {
                const relatedHtml = relatedProducts.map(createProductCard).join('');
                relatedProductsContainer.innerHTML = relatedHtml;
            } else {
                relatedProductsContainer.innerHTML = `<p class="no-products-message">No related products found.</p>`;
            }

            // Update cart count on page load
            updateCartCount();

        } catch (error) {
            console.error('Failed to load product details:', error);
            document.getElementById('product-details-container').innerHTML = `<p class="error-message text-center">Failed to load product details. Please try again later.</p>`;
        }
    }

    // Add a single, delegated event listener for "Add to Cart" buttons
    document.addEventListener('click', (event) => {
        if (event.target.closest('.add-to-cart-btn')) {
            const button = event.target.closest('.add-to-cart-btn');
            const productId = button.dataset.productId;
            const productName = button.dataset.productName;

            let currentCount = parseInt(localStorage.getItem(cartCountKey) || '0');
            currentCount += 1;
            localStorage.setItem(cartCountKey, currentCount);

            updateCartCount();
            showSuccessMessage(productName);
            
            console.log(`Product with ID ${productId} added to cart from details page.`);
        }
    });

    loadProductDetails();
});