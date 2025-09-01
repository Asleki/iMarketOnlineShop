// A simple object to map color names to hex codes for the UI circles.
const colorMap = {
    'Beige': '#F5F5DC',
    'Classic Black': '#000000',
    'Navy Blue': '#000080',
    'White': '#FFFFFF',
    'Red': '#FF0000',
    'Yellow': '#FFFF00',
    'Dark Brown': '#654321',
    'Nude': '#E8A598',
    'Olive Green': '#556B2F'
};

// Function to update the cart and wishlist counts in the header
function updateHeaderCounts() {
    const cartCount = document.getElementById('cart-count');
    const wishlistCount = document.getElementById('wishlist-count');

    if (cartCount) {
        const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
        cartCount.textContent = cartItems.length > 0 ? cartItems.length : '';
        cartCount.style.display = cartItems.length > 0 ? 'flex' : 'none';
    }

    if (wishlistCount) {
        const wishlistItems = JSON.parse(localStorage.getItem('wishlist')) || [];
        wishlistCount.textContent = wishlistItems.length > 0 ? wishlistItems.length : '';
        wishlistCount.style.display = wishlistItems.length > 0 ? 'flex' : 'none';
    }
}

// Function to show a toast message
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-message');
    if (!toast) return;

    toast.textContent = message;
    
    // Set color based on message type
    toast.style.backgroundColor = type === 'success' ? 'var(--color-success)' : 'var(--color-danger)';
    
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000); // Hide after 3 seconds
}

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    const container = document.getElementById('product-details-container');

    if (!productId) {
        container.innerHTML = '<p>No product ID found in the URL. Please go back to the shops page.</p>';
        return;
    }

    try {
        const response = await fetch('data/nashaa-kicks.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const products = await response.json();
        const product = products.find(p => p.id === productId);

        if (!product) {
            container.innerHTML = '<p>Product not found. The item you are looking for may have been removed.</p>';
            return;
        }

        // Set page title dynamically
        document.title = `${product.name} - Nashaa Kicks`;

        // Generate product details HTML
        const featuresTableRows = Object.entries(product).map(([key, value]) => {
            if (['id', 'name', 'images', 'price', 'description', 'availableSizes', 'availableColors', 'rating', 'reviewsCount', 'isFeatured', 'isDeals', 'isHotPick', 'features'].includes(key)) {
                return ''; // Skip these keys from the table
            }
            if (Array.isArray(value)) value = value.join(', ');
            return `<tr><td>${key.replace(/([A-Z])/g, ' $1').trim()}</td><td>${value}</td></tr>`;
        }).join('');

        const sizesButtons = product.availableSizes.map(size => `<button class="option-btn size-btn" data-size="${size}">${size}</button>`).join('');
        const colorsCircles = product.availableColors.map(color => `
            <span class="color-circle" style="background-color: ${colorMap[color] || color};" data-color="${color}" title="${color}"></span>
        `).join('');
        
        const productHtml = `
            <section class="product-details-section">
                <div class="product-container">
                    <div class="product-image-gallery">
                        <img id="main-product-image" src="${product.images[0]}" alt="${product.name}" class="main-image">
                        <div class="thumbnail-container">
                            ${product.images.map(image => `
                                <img src="${image}" alt="Thumbnail for ${product.name}" class="thumbnail" data-image-url="${image}">
                            `).join('')}
                        </div>
                    </div>
                    <div class="product-info-panel">
                        <h1 class="product-title">${product.name}</h1>
                        <p class="product-brand">by ${product.brand}</p>
                        <p class="product-description">${product.description}</p>
                        <p class="product-price">KES ${product.price.toLocaleString()}</p>
                        <p class="product-stock-status">In Stock: ${product.inStock}</p>
                        <div class="product-rating">
                            <i class="fas fa-star" style="color: #ffc107;"></i> ${product.rating} (${product.reviewsCount} reviews)
                        </div>

                        <div class="product-options">
                            <div class="option-group">
                                <h4>Available Sizes:</h4>
                                <div id="size-options">${sizesButtons}</div>
                            </div>
                            <div class="option-group">
                                <h4>Available Colors:</h4>
                                <div id="color-options">${colorsCircles}</div>
                            </div>
                        </div>

                        <div class="action-buttons">
                            <div class="quantity-selector">
                                <button id="decrement-btn">-</button>
                                <input type="number" id="product-quantity" value="${product.minOrderQuantity}" min="${product.minOrderQuantity}" max="${product.maxOrderQuantity}">
                                <button class="add-to-cart-btn"><i class="fas fa-shopping-cart"></i> Add to Cart</button>
                                <button class="add-to-wishlist-btn"><i class="far fa-heart"></i> Wishlist</button>
                            </div>
                        </div>

                        <div class="product-features">
                            <h4>Additional Details:</h4>
                            <table class="feature-table">
                                <tbody>
                                    ${featuresTableRows}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>
        `;

        container.innerHTML = productHtml;

        // Add event listeners for new features
        const mainImage = document.getElementById('main-product-image');
        const thumbnailsList = document.querySelectorAll('.thumbnail');
        const sizeButtons = document.querySelectorAll('.size-btn');
        const colorButtons = document.querySelectorAll('.color-circle');
        const quantityInput = document.getElementById('product-quantity');
        const incrementBtn = document.getElementById('increment-btn');
        const decrementBtn = document.getElementById('decrement-btn');
        const addToCartBtn = document.querySelector('.add-to-cart-btn');
        const addToWishlistBtn = document.querySelector('.add-to-wishlist-btn');

        // Image Gallery Logic
        thumbnailsList.forEach(thumb => {
            thumb.addEventListener('click', () => {
                mainImage.src = thumb.dataset.imageUrl;
                thumbnailsList.forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            });
        });

        // Initial state
        if (thumbnailsList.length > 0) thumbnailsList[0].classList.add('active');

        // Option selection logic
        sizeButtons.forEach(btn => btn.addEventListener('click', () => {
            sizeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }));

        colorButtons.forEach(btn => btn.addEventListener('click', () => {
            colorButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        }));
        
        // Quantity Logic
        if (incrementBtn && decrementBtn && quantityInput) {
            incrementBtn.addEventListener('click', () => {
                if (parseInt(quantityInput.value) < product.maxOrderQuantity) {
                    quantityInput.value = parseInt(quantityInput.value) + 1;
                }
            });
            decrementBtn.addEventListener('click', () => {
                if (parseInt(quantityInput.value) > product.minOrderQuantity) {
                    quantityInput.value = parseInt(quantityInput.value) - 1;
                }
            });
        }
        
        // Add to Cart Logic
        addToCartBtn.addEventListener('click', () => {
            let cart = JSON.parse(localStorage.getItem('cart')) || [];
            const selectedSize = document.querySelector('.size-btn.active')?.dataset.size;
            const selectedColor = document.querySelector('.color-circle.active')?.dataset.color;
            const quantity = parseInt(quantityInput.value);

            if (!selectedSize || !selectedColor) {
                showToast('Please select a size and color.');
                return;
            }
            
            // Validation check for max order quantity
            if (quantity > product.maxOrderQuantity) {
                showToast(`You cannot add more than ${product.maxOrderQuantity} items.`, 'danger');
                return;
            }
            
            const newItem = {
                id: product.id,
                name: product.name,
                price: product.price,
                size: selectedSize,
                color: selectedColor,
                quantity: quantity,
                image: product.images[0]
            };
            
            // Check if item is already in cart
            const existingItemIndex = cart.findIndex(item => 
                item.id === newItem.id && item.size === newItem.size && item.color === newItem.color
            );

            if (existingItemIndex > -1) {
                // Update quantity
                cart[existingItemIndex].quantity += quantity;
            } else {
                cart.push(newItem);
            }

            localStorage.setItem('cart', JSON.stringify(cart));
            showToast('Item added to cart!');
            updateHeaderCounts();
        });

        // Add to Wishlist Logic
        addToWishlistBtn.addEventListener('click', () => {
            let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
            const selectedSize = document.querySelector('.size-btn.active')?.dataset.size;
            const selectedColor = document.querySelector('.color-circle.active')?.dataset.color;
            const newItem = {
                id: product.id,
                name: product.name,
                price: product.price,
                size: selectedSize,
                color: selectedColor,
                image: product.images[0]
            };

            const itemExists = wishlist.some(item => 
                item.id === newItem.id && item.size === newItem.size && item.color === newItem.color
            );

            if (!itemExists) {
                wishlist.push(newItem);
                localStorage.setItem('wishlist', JSON.stringify(wishlist));
                showToast('Item added to wishlist!');
                updateHeaderCounts();
            } else {
                showToast('Item is already in your wishlist!');
            }
        });
        
    } catch (error) {
        console.error('Could not fetch product data:', error);
        container.innerHTML = '<p>Error loading product data. Please try again later.</p>';
    }

    // Call this once on page load to set initial counts
    updateHeaderCounts();
});