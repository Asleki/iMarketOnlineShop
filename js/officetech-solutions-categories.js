// js/officetech-solutions-categories.js

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
    
    // --- Product Card Creation Function ---
    function createProductCard(product) {
        const fullStars = Math.floor(product.review_star_rate);
        const hasHalfStar = (product.review_star_rate % 1) !== 0;
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
        if (product.discount_percent > 0) {
            badgesHtml += `<span class="badge discount">-${product.discount_percent}%</span>`;
        }
        if (product.in_stock) {
            badgesHtml += `<span class="badge stock">In Stock</span>`;
        }

        const priceString = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KSH' }).format(product.price_ksh);

        return `
            <div class="product-card-uniform">
                <div class="product-badges">${badgesHtml}</div>
                <a href="officetech-solutions-product-details.html?id=${product.item_id}" title="View details for ${product.name}">
                    <img src="${product.product_image_url}" alt="${product.name}" loading="lazy">
                    <h3 class="product-name">${product.name}</h3>
                </a>
                <div class="product-details">
                    <p class="product-rating">${ratingHtml} (${product.review_star_rate})</p>
                    <p class="product-price">Price: <span class="price-value">${priceString}</span></p>
                    <button class="btn-primary add-to-cart-btn" data-product-id="${product.item_id}" data-product-name="${product.name}">
                        <i class="fas fa-shopping-cart"></i> Add to Cart
                    </button>
                </div>
            </div>
        `;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    const productsContainer = document.getElementById('products-container');
    const categoryHeading = document.getElementById('category-heading');
    const categoryIntro = document.getElementById('category-intro');
    const noProductsMessage = document.getElementById('no-products-message');
    const pageTitle = document.getElementById('page-title');

    // Dictionary of category-specific titles and introductions
    const categoryInfo = {
        'Computers': {
            title: 'Computers',
            intro: 'Explore our wide selection of desktop computers and laptops, perfect for all your office needs, from basic tasks to high-performance computing.',
        },
        'Printers': {
            title: 'Printers',
            intro: 'Find the perfect printer for your home or office. We offer a range of laser, inkjet, and multi-function printers from leading brands.',
        },
        'Monitors': {
            title: 'Monitors',
            intro: 'Enhance your workspace with our high-quality monitors. Choose from various sizes and resolutions for better productivity and visual clarity.',
        }
    };

    // Main function to load and render products
    async function loadCategoryProducts() {
        if (!category || !categoryInfo[category]) {
            // Handle invalid category
            productsContainer.innerHTML = '';
            noProductsMessage.classList.remove('hidden');
            categoryHeading.textContent = 'Category Not Found';
            categoryIntro.textContent = 'The category you are looking for does not exist.';
            pageTitle.textContent = 'Category Not Found | OfficeTech Solutions';
            return;
        }

        // Set page title and hero content
        const info = categoryInfo[category];
        categoryHeading.textContent = info.title;
        categoryIntro.textContent = info.intro;
        pageTitle.textContent = `${info.title} | OfficeTech Solutions`;
        noProductsMessage.classList.add('hidden');

        try {
            const response = await fetch('data/officetech-solutions-products.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const products = await response.json();

            const filteredProducts = products.filter(p => p.category === category);

            if (filteredProducts.length > 0) {
                const productHtml = filteredProducts.map(createProductCard).join('');
                productsContainer.innerHTML = productHtml;
            } else {
                productsContainer.innerHTML = '';
                noProductsMessage.classList.remove('hidden');
            }

            // Update cart count on page load
            updateCartCount();

        } catch (error) {
            console.error('Failed to load category products:', error);
            productsContainer.innerHTML = `<p class="error-message">Failed to load products for this category. Please try again later.</p>`;
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

            console.log(`Product with ID ${productId} added to cart from category page.`);
        }
    });

    loadCategoryProducts();
});