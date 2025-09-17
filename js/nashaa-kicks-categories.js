// js/nashaa-kicks-categories.js

document.addEventListener('DOMContentLoaded', async () => {
    const productsGridContainer = document.getElementById('products-grid-container');
    const productsSectionTitle = document.getElementById('products-section-title');
    const categoryCardsWrapper = document.getElementById('category-cards-container');

    // Function to get URL parameters
    function getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        const results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
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
            badgesHtml += `<span class="badge deal">Deal</span>`;
        }
        if (product.isHotPick) {
            badgesHtml += `<span class="badge hot-pick">Hot Pick</span>`;
        }
        if (product.isFreeShipping) {
            badgesHtml += `<span class="badge free-shipping">Free Shipping</span>`;
        }
    
        const priceString = new Intl.NumberFormat('en-KE', { style: 'currency', currency: product.currency }).format(product.price);
    
        return `
            <a href="nashaa-kicks-product-details.html?id=${product.id}" class="product-card-uniform" title="View details for ${product.name}">
                <div class="product-badges">${badgesHtml}</div>
                <img src="${product.images[0]}" alt="${product.name}" loading="lazy">
                <div class="product-details">
                    <p class="product-rating">${ratingHtml} (${product.reviewsCount})</p>
                    <p class="product-price">Price: <span class="price-value">${priceString}</span></p>
                    <h3 class="product-name">${product.name}</h3>
                </div>
            </a>
        `;
    }

    async function loadProducts() {
        try {
            const response = await fetch('data/nashaa-kicks.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const products = await response.json();

            // Get the category from the URL
            let selectedCategory = getUrlParameter('category');
            
            // Default to 'All Products' if no category is selected
            if (!selectedCategory) {
                selectedCategory = 'All Products';
            }

            // Filter products based on the selected category
            let filteredProducts;
            if (selectedCategory === 'All Products') {
                filteredProducts = products;
            } else {
                filteredProducts = products.filter(product => product.category === selectedCategory);
            }

            // Update the page title
            productsSectionTitle.textContent = selectedCategory;

            // Highlight the active category card
            const categoryCards = categoryCardsWrapper.querySelectorAll('.category-card');
            categoryCards.forEach(card => {
                if (card.dataset.category === selectedCategory) {
                    card.classList.add('active');
                } else {
                    card.classList.remove('active');
                }
            });

            // Render the filtered products
            productsGridContainer.innerHTML = ''; // Clear previous content
            if (filteredProducts.length > 0) {
                filteredProducts.forEach(product => {
                    productsGridContainer.innerHTML += createProductCard(product);
                });
            } else {
                productsGridContainer.innerHTML = `<p class="no-products-message">No products found in this category.</p>`;
            }

        } catch (error) {
            console.error('Failed to load product data:', error);
            productsGridContainer.innerHTML = `<p class="error-message">Failed to load products. Please try again later.</p>`;
        }
    }

    // Call the function to load and display products
    loadProducts();
});