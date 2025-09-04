// autogiant-motors-categories.js

document.addEventListener('DOMContentLoaded', () => {

    const categoryProductList = document.getElementById('category-product-list');

    /**
     * Fetches all product data from the three separate JSON files.
     * @returns {Promise<Array>} A promise that resolves with a single array of all products.
     */
    async function fetchAllProducts() {
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
    }

    /**
     * Fetches product data and displays it on the page.
     */
    async function fetchAndDisplayProducts() {
        try {
            // Get category from URL or default to 'All Products'
            const urlParams = new URLSearchParams(window.location.search);
            const categoryFromUrl = urlParams.get('category');
            
            // Show a loading message
            categoryProductList.innerHTML = '<p class="text-center">Loading products...</p>';
            
            // Fetch all products
            const allProducts = await fetchAllProducts();

            // Filter products based on the category from the URL
            const filteredProducts = allProducts.filter(product => {
                // If no category in URL, show all products
                if (!categoryFromUrl || categoryFromUrl === 'All Products') return true;
                
                // Match the product's category to the URL parameter
                return product.category.toLowerCase() === decodeURIComponent(categoryFromUrl).toLowerCase();
            });

            // Clear loading message
            categoryProductList.innerHTML = '';
            
            // If no products are found, display a message
            if (filteredProducts.length === 0) {
                categoryProductList.innerHTML = '<p class="no-results">No products found in this category.</p>';
                return;
            }
            
            // Render the filtered products
            filteredProducts.forEach(product => {
                const card = createProductCard(product);
                categoryProductList.appendChild(card);
            });

        } catch (error) {
            console.error('Error fetching or displaying products:', error);
            categoryProductList.innerHTML = '<p class="error-message">Failed to load products. Please check your data files.</p>';
        }
    }

    /**
     * Creates a single product card HTML element.
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
        if (product.isDiscounted && product.discount_percent) {
             badges.push(`<span class="badge deal">${product.discount_percent}% Off</span>`);
        }
        if (product.vat_included) {
            badges.push(`<span class="badge deal">VAT Inc.</span>`);
        }

        const badgesHtml = badges.length > 0 ? `<div class="badges">${badges.join('')}</div>` : '';
        const originalPriceHtml = product.originalPrice ? `<span class="original-price">Ksh ${product.originalPrice.toLocaleString()}</span>` : '';
        const displayedPrice = price ? price.toLocaleString() : 'N/A';

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

    // Call the main function to start the process
    fetchAndDisplayProducts();
});