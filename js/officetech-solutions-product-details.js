// js/officetech-solutions-product-details.js

document.addEventListener('DOMContentLoaded', async () => {

    // Define the cart count key and get the element
    const cartCountKey = 'officetech-cart-count';
    const cartCountElement = document.getElementById('cart-count');

    // Function to update the cart count in the header
    function updateCartCount() {
        const currentCount = parseInt(localStorage.getItem(cartCountKey) || '0');
        if (cartCountElement) {
            cartCountElement.textContent = currentCount;
        }
    }

    // Function to show the "Add to Cart" success message
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

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const productDetailsContainer = document.getElementById('product-details-container');

    if (!productId) {
        productDetailsContainer.innerHTML = '<p class="error-message">Error: Product ID not found in URL.</p>';
        return;
    }

    function createRatingStars(rate) {
        const fullStars = Math.floor(rate);
        const hasHalfStar = (rate % 1) !== 0;
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
        return ratingHtml;
    }

    function createProductDetailsHtml(product) {
        let badgesHtml = '';
        if (product.discount_percent > 0) {
            badgesHtml += `<span class="badge discount">-${product.discount_percent}%</span>`;
        }
        if (product.in_stock) {
            badgesHtml += `<span class="badge stock">In Stock</span>`;
        }
        const priceString = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KSH' }).format(product.price_ksh);
        const originalPriceHtml = product.discount_percent > 0 ? `<span class="original-price">${new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KSH' }).format(product.price_ksh / (1 - product.discount_percent / 100))}</span>` : '';
        const thumbnailsHtml = product.thumbnail_urls.map((url, index) => {
            return `<img src="${url}" alt="Thumbnail ${index + 1}" class="product-thumbnail">`;
        }).join('');
        const featuresHtml = product.features.map(feature => {
            return `<li><i class="fas fa-check-circle"></i> ${feature}</li>`;
        }).join('');
        const reviewsHtml = product.reviews && product.reviews.length > 0 ?
            product.reviews.map(review => {
                return `
                    <div class="review">
                        <h4>${review.author}</h4>
                        <div class="review-rating">${createRatingStars(review.rating)}</div>
                        <p>${review.comment}</p>
                    </div>
                `;
            }).join('') : `<p>No customer reviews yet. Be the first!</p>`;

        return `
            <div class="product-details-content">
                <div class="product-image-gallery">
                    <div class="main-image">
                        <img id="main-product-image" src="${product.product_image_url}" alt="${product.name}">
                    </div>
                    <div class="thumbnail-container" id="thumbnail-container">
                        <img src="${product.product_image_url}" alt="${product.name} thumbnail" class="product-thumbnail active">
                        ${thumbnailsHtml}
                    </div>
                </div>
                <div class="product-info-column">
                    <div class="product-badges">${badgesHtml}</div>
                    <h1>${product.name}</h1>
                    <div class="product-rating">
                        <div class="stars">${createRatingStars(product.review_star_rate)}</div>
                        <span>(${product.review_star_rate} out of 5 stars)</span>
                    </div>
                    <div class="product-price-section">
                        <span class="current-price">${priceString}</span>
                        ${originalPriceHtml}
                    </div>
                    <p class="product-description">${product.description || ''}</p>
                    <div class="product-actions">
                        <button class="btn-add-to-cart" data-product-id="${product.item_id}" data-product-name="${product.name}">
                            <i class="fas fa-shopping-cart"></i> Add to Cart
                        </button>
                    </div>
                </div>
            </div>
            <section class="product-section container">
                <h2>Product Features</h2>
                <ul class="product-features-list">
                    ${featuresHtml}
                </ul>
            </section>
            <section class="product-section container customer-reviews">
                <h2>Customer Reviews</h2>
                <div id="review-list">
                    ${reviewsHtml}
                </div>
            </section>
        `;
    }

    async function loadProductDetails() {
        try {
            const response = await fetch('data/officetech-solutions-products.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const products = await response.json();
            const product = products.find(p => p.item_id === productId);

            if (product) {
                productDetailsContainer.innerHTML = createProductDetailsHtml(product);

                document.querySelectorAll('.product-thumbnail').forEach(thumbnail => {
                    thumbnail.addEventListener('click', (e) => {
                        const mainImage = document.getElementById('main-product-image');
                        mainImage.src = e.target.src;
                        document.querySelectorAll('.product-thumbnail').forEach(t => t.classList.remove('active'));
                        e.target.classList.add('active');
                    });
                });

                document.querySelector('.btn-add-to-cart').addEventListener('click', (e) => {
                    const button = e.target.closest('.btn-add-to-cart');
                    const productName = button.dataset.productName;
                    
                    let currentCount = parseInt(localStorage.getItem(cartCountKey) || '0');
                    currentCount += 1;
                    localStorage.setItem(cartCountKey, currentCount);

                    updateCartCount();
                    showSuccessMessage(productName);
                });
                
            } else {
                productDetailsContainer.innerHTML = '<p class="error-message">Product not found.</p>';
            }
            
            // Call the function to update the cart count initially
            updateCartCount();

        } catch (error) {
            console.error('Failed to load product details:', error);
            productDetailsContainer.innerHTML = `<p class="error-message">Failed to load product details. Please try again later.</p>`;
        }
    }

    loadProductDetails();
});