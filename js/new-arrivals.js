//
// File: js/new-arrivals.js
// Description: This script fetches product data from shops that contain a 'dateAdded' field,
//              filters for new arrivals, and dynamically renders them on the new-arrivals.html page.
//

document.addEventListener('partialsLoaded', async () => {
    console.log('Partials loaded. Initializing New Arrivals page logic.');

    // =========================================================
    // 1. Data Fetching, Standardization & Caching
    // =========================================================
    let shopsData = [];
    let allProducts = [];
    const newArrivalsContainer = document.getElementById('new-arrivals-container');

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
        const priceAmount = (product.price && product.price.amount) || product.price || product.price_ksh || 0;
        const price = priceAmount > 0 ? `KES ${priceAmount.toLocaleString()}` : 'Price not available';
        const id = product.item_id || product.id || product.propertyId;

        return {
            id: id,
            name: name,
            price: price,
            image: image,
            shop_id: shop.shop_id,
            shop_name: shop.name,
            isDeal: product.isDiscounted || product.isDeals || (product.discount_percent && product.discount_percent > 0) || false,
            // We specifically use 'dateAdded' as per your request
            dateAdded: new Date(product.dateAdded || '1970-01-01'),
        };
    }

    /**
     * Fetches shop data and then filters and fetches the relevant product data files,
     * standardizing and caching all products into a single array.
     */
    async function fetchAndStandardizeAllData() {
        try {
            const shopsResponse = await fetch('data/shops.json');
            if (!shopsResponse.ok) throw new Error(`HTTP error! Status: ${shopsResponse.status}`);
            shopsData = await shopsResponse.json();

            // Filter shops to only include those with the 'dateAdded' field
            const shopsWithDateAdded = shopsData.filter(shop => 
                shop.product_data_file === 'joy-totes.json' || 
                shop.product_data_file === 'nashaa-kicks.json' || 
                shop.product_data_file === 'click-n-get-products.json'
            );

            const productFetchPromises = shopsWithDateAdded.map(shop =>
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
            console.log('New Arrivals product data loaded and standardized:', allProducts.length, 'products found.');

        } catch (error) {
            console.error('Error fetching initial data:', error);
        }
    }

    // =========================================================
    // 2. Dynamic Content Rendering
    // =========================================================

    function renderNewArrivalsPage() {
        if (!newArrivalsContainer) {
            console.error('Error: "new-arrivals-container" element not found in the DOM.');
            return;
        }

        const oneMonthAgo = new Date();
        oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
        
        // Filter for products that are new arrivals (added within the last 30 days)
        const newArrivals = allProducts.filter(product => product.dateAdded > oneMonthAgo);
        
        if (newArrivals.length === 0) {
            newArrivalsContainer.innerHTML = '<p class="text-center">No new arrivals from participating shops at the moment. Check back soon!</p>';
            return;
        }

        // Group new arrivals by shop
        const newArrivalsByShop = newArrivals.reduce((acc, product) => {
            if (!acc[product.shop_id]) {
                acc[product.shop_id] = {
                    shopName: product.shop_name,
                    products: []
                };
            }
            acc[product.shop_id].products.push(product);
            return acc;
        }, {});

        newArrivalsContainer.innerHTML = ''; // Clear previous content

        // Render each shop's new arrivals section
        for (const shopId in newArrivalsByShop) {
            const shopData = newArrivalsByShop[shopId];
            const shopSection = document.createElement('div');
            shopSection.classList.add('shop-deals-container');
            
            let shopTitleHTML = `<h2>${shopData.shopName}</h2>`;
            shopSection.innerHTML = shopTitleHTML;
            
            const newArrivalsGrid = document.createElement('div');
            newArrivalsGrid.classList.add('deals-grid');
            
            shopData.products.forEach(product => {
                const productUrl = `/shops/${product.shop_id}-products.html#${product.id}`;
                
                const card = document.createElement('a');
                card.href = productUrl;
                card.classList.add('product-card-uniform');
                
                card.innerHTML = `
                    <img src="${product.image}" alt="${product.name}">
                    <h3>${product.name}</h3>
                    <p>From ${product.shop_name}</p>
                    <p class="price-new">${product.price}</p>
                `;
                
                newArrivalsGrid.appendChild(card);
            });
            
            shopSection.appendChild(newArrivalsGrid);
            newArrivalsContainer.appendChild(shopSection);
        }
    }

    // Wait for data to be fetched and then render the page
    await fetchAndStandardizeAllData();
    renderNewArrivalsPage();
});