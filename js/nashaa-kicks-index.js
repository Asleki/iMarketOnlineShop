// js/nashaa-kicks-index.js

document.addEventListener('DOMContentLoaded', async () => {

    const featuredProductsContainer = document.getElementById('featured-products-container');
    const newArrivalsContainer = document.getElementById('new-arrivals-container');
    const dealsContainer = document.getElementById('deals-container');

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

            // Clear loading spinners
            featuredProductsContainer.innerHTML = '';
            newArrivalsContainer.innerHTML = '';
            dealsContainer.innerHTML = '';

            // Render all products for the featured section
            products.forEach(product => {
                featuredProductsContainer.innerHTML += createProductCard(product);
            });

            // Render new arrivals (hot picks)
            const newArrivals = products.filter(p => p.isHotPick);
            if (newArrivals.length > 0) {
                newArrivals.forEach(product => {
                    newArrivalsContainer.innerHTML += createProductCard(product);
                });
            } else {
                newArrivalsContainer.innerHTML = `<p class="no-products-message">No new arrivals at the moment.</p>`;
            }

            // Render deals
            const deals = products.filter(p => p.isDeals);
            if (deals.length > 0) {
                deals.forEach(product => {
                    dealsContainer.innerHTML += createProductCard(product);
                });
            } else {
                dealsContainer.innerHTML = `<p class="no-products-message">No deals available right now.</p>`;
            }

        } catch (error) {
            console.error('Failed to load product data:', error);
            featuredProductsContainer.innerHTML = `<p class="error-message">Failed to load products. Please try again later.</p>`;
            newArrivalsContainer.innerHTML = `<p class="error-message">Failed to load new arrivals.</p>`;
            dealsContainer.innerHTML = `<p class="error-message">Failed to load deals.</p>`;
        }
    }

    // Call the function to load and display products
    loadProducts();
});