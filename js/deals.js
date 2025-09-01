//
// File: js/deals.js
// Description: This script fetches product data from all shops, filters for deals,
//              and dynamically renders them on the deals.html page, grouped by shop.
//

document.addEventListener('partialsLoaded', async () => {
    console.log('Partials loaded. Initializing Deals page logic.');

    // =========================================================
    // 1. Data Fetching, Standardization & Caching
    // =========================================================
    let shopsData = [];
    let allProducts = [];
    const dealsContainer = document.getElementById('deals-container');

    /**
     * Standardizes a product object from any shop's data structure
     * into a single, uniform format.
     * @param {object} product The original product object.
     * @param {object} shop The shop object associated with the product.
     * @returns {object} The standardized product object.
     */
    function standardizeProduct(product, shop) {
        // Fallback values
        const image = product.car_display_image || product.product_image_url || (product.images && product.images[0]) || 'https://placehold.co/150x150';
        const name = product.name || product.title || `${product.make} ${product.model}` || 'Unnamed Product';
        
        // Handle price, old price, and deals status from various formats
        let priceAmount = (product.price && product.price.amount) || product.price || product.price_ksh;
        let originalPrice = product.originalPrice || priceAmount;
        let isDeal = product.isDiscounted || product.isDeals || (product.discount_percent && product.discount_percent > 0) || false;

        // Apply discount_percent if it exists
        if (product.discount_percent && product.discount_percent > 0) {
            originalPrice = priceAmount;
            priceAmount = priceAmount * (1 - product.discount_percent / 100);
            isDeal = true;
        }

        const price = priceAmount > 0 ? `KES ${priceAmount.toLocaleString()}` : 'Price not available';
        const oldPrice = originalPrice && originalPrice !== priceAmount ? `KES ${originalPrice.toLocaleString()}` : null;
        
        const id = product.item_id || product.id || product.propertyId;

        return {
            id: id,
            name: name,
            price: price,
            oldPrice: oldPrice,
            image: image,
            shop_id: shop.shop_id,
            shop_name: shop.name,
            isDeal: isDeal,
        };
    }

    /**
     * Fetches shop data and then all product data files,
     * standardizing and caching all products into a single array.
     */
    async function fetchAndStandardizeAllData() {
        try {
            const shopsResponse = await fetch('data/shops.json');
            if (!shopsResponse.ok) throw new Error(`HTTP error! Status: ${shopsResponse.status}`);
            shopsData = await shopsResponse.json();

            const productFetchPromises = shopsData.map(shop =>
                fetch(`data/${shop.product_data_file}`)
                .then(response => {
                    if (!response.ok) {
                        console.warn(`Could not fetch data for ${shop.name}. Status: ${response.status}`);
                        return [];
                    }
                    return response.json();
                })
                .then(products => products.map(product => standardizeProduct(product, shop)))
                .catch(error => {
                    console.error(`Error fetching products for ${shop.name}:`, error);
                    return [];
                })
            );

            const productsByShop = await Promise.all(productFetchPromises);
            allProducts = productsByShop.flat();
            console.log('All product data loaded and standardized:', allProducts.length, 'products found.');

        } catch (error) {
            console.error('Error fetching initial data:', error);
        }
    }

    // =========================================================
    // 2. Dynamic Content Rendering
    // =========================================================

    function renderDealsPage() {
        if (!dealsContainer) {
            console.error('Error: "deals-container" element not found in the DOM.');
            return;
        }
        
        // Filter for products that are deals
        const deals = allProducts.filter(product => product.isDeal);
        
        if (deals.length === 0) {
            dealsContainer.innerHTML = '<p class="text-center">No deals available at the moment. Check back later!</p>';
            return;
        }

        // Group deals by shop
        const dealsByShop = deals.reduce((acc, product) => {
            if (!acc[product.shop_id]) {
                acc[product.shop_id] = {
                    shopName: product.shop_name,
                    products: []
                };
            }
            acc[product.shop_id].products.push(product);
            return acc;
        }, {});

        dealsContainer.innerHTML = ''; // Clear previous content

        // Render each shop's deals section
        for (const shopId in dealsByShop) {
            const shopData = dealsByShop[shopId];
            const shopSection = document.createElement('div');
            shopSection.classList.add('shop-deals-container');
            
            let shopTitleHTML = `<h2>${shopData.shopName}</h2>`;
            shopSection.innerHTML = shopTitleHTML;
            
            const dealsGrid = document.createElement('div');
            dealsGrid.classList.add('deals-grid');
            
            shopData.products.forEach(product => {
                const productUrl = `/shops/${product.shop_id}-products.html#${product.id}`;
                
                const card = document.createElement('a');
                card.href = productUrl;
                card.classList.add('product-card-uniform');
                
                let priceHtml = `<p class="price-new">${product.price}</p>`;
                if (product.oldPrice) {
                    priceHtml = `<p><span class="price-old">${product.oldPrice}</span><span class="price-new">${product.price}</span></p>`;
                }
                
                card.innerHTML = `
                    <span class="deals-badge">DEAL</span>
                    <img src="${product.image}" alt="${product.name}">
                    <h3>${product.name}</h3>
                    ${priceHtml}
                `;
                
                dealsGrid.appendChild(card);
            });
            
            shopSection.appendChild(dealsGrid);
            dealsContainer.appendChild(shopSection);
        }
    }

    // Wait for data to be fetched and then render the page
    await fetchAndStandardizeAllData();
    renderDealsPage();
});