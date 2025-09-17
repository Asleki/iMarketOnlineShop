// js/joy-totes-categories.js

document.addEventListener('DOMContentLoaded', async () => {

    // Define the cart count key
    const cartCountKey = 'joy-totes-cart-count';
    const cartCountElement = document.getElementById('cart-count');
    
    // Function to update the cart count in the header
    function updateCartCount() {
        const currentCount = parseInt(localStorage.getItem(cartCountKey) || '0');
        if (cartCountElement) {
            cartCountElement.textContent = currentCount;
        }
    }

    // Function to show the "Added to Cart" success message
    function showSuccessMessage(productName) {
        // Create the message element
        const message = document.createElement('div');
        message.className = 'cart-success-message';
        message.innerHTML = `<span class="product-name">${productName}</span> has been successfully added to cart.`;
        document.body.appendChild(message);

        // Show the message with a slight delay for the transition
        setTimeout(() => {
            message.classList.add('show');
        }, 10);

        // Hide the message after 3 seconds
        setTimeout(() => {
            message.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(message);
            }, 500); // Wait for the transition to finish
        }, 3000);
    }
    
    // Function to create a product card HTML string
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

    const categoryTitleElement = document.getElementById('category-hero-title');
    const productsGridContainer = document.getElementById('products-grid-container');
    const categoryCardsContainer = document.getElementById('category-cards-container');

    const allCategories = ["Tote Bag", "Crossbody Bag", "Backpack", "Clutch Bag", "Duffel Bag", "Shoulder Bag", "Waist Bag"];
    const categoryImages = {
        "Tote Bag": "tote-category.webp",
        "Crossbody Bag": "crossbody-category.webp",
        "Backpack": "backpack-category.webp",
        "Clutch Bag": "clutch-category.webp",
        "Duffel Bag": "duffel-category.webp",
        "Shoulder Bag": "shoulder-category.webp",
        "Waist Bag": "waist-category.webp"
    };

    function renderCategoryCards(activeCategory) {
        categoryCardsContainer.innerHTML = '';
        allCategories.forEach(category => {
            const cardLink = document.createElement('a');
            cardLink.href = `joy-totes-categories.html?category=${encodeURIComponent(category)}`;
            cardLink.className = `category-card${activeCategory === category ? ' active' : ''}`;
            cardLink.style.backgroundImage = `url('images/joy-totes/${categoryImages[category]}')`;
            cardLink.innerHTML = `<h3 class="category-name">${category}</h3>`;
            categoryCardsContainer.appendChild(cardLink);
        });
    }

    async function loadProductsByCategory() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const selectedCategory = urlParams.get('category') || 'Tote Bag';
            const decodedCategory = decodeURIComponent(selectedCategory);
    
            // Update the hero title
            if (categoryTitleElement) {
                categoryTitleElement.textContent = decodedCategory;
            }
    
            const response = await fetch('data/joy-totes.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const allProducts = await response.json();
            
            // Filter products based on the selected category
            const filteredProducts = allProducts.filter(p => p.category === decodedCategory);
            
            if (filteredProducts.length > 0) {
                const productsHtml = filteredProducts.map(createProductCard).join('');
                productsGridContainer.innerHTML = productsHtml;
            } else {
                productsGridContainer.innerHTML = `<p class="no-products-message">No products found in the "${decodedCategory}" category at this time. Please check back later!</p>`;
            }

            // Render category cards and mark the active one
            renderCategoryCards(decodedCategory);
            
            // Update cart count on page load
            updateCartCount();

        } catch (error) {
            console.error('Failed to load products for category:', error);
            const errorMessage = `<p class="error-message">Failed to load products. Please try again later.</p>`;
            productsGridContainer.innerHTML = errorMessage;
        }
    }
    
    // Add a single, delegated event listener for "Add to Cart" buttons
    document.addEventListener('click', (event) => {
        if (event.target.closest('.add-to-cart-btn')) {
            const button = event.target.closest('.add-to-cart-btn');
            const productId = button.dataset.productId;
            const productName = button.dataset.productName;

            // Increment cart count and update localStorage
            let currentCount = parseInt(localStorage.getItem(cartCountKey) || '0');
            currentCount += 1;
            localStorage.setItem(cartCountKey, currentCount);

            // Update the header count and show the success message
            updateCartCount();
            showSuccessMessage(productName);

            console.log(`Product with ID ${productId} added to cart from categories page.`);
        }
    });

    loadProductsByCategory();
});