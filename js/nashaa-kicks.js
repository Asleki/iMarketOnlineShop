import { updateHeaderCounts } from './header.js';

// DOM elements
const shopHeaderPlaceholder = document.getElementById('shop-header-placeholder');
const hotPicksGrid = document.getElementById('hot-picks-grid');
const allProductsGrid = document.getElementById('all-products-grid');
const loadMoreBtn = document.getElementById('load-more-btn');
const productSearchInput = document.getElementById('product-search');
const categoryDropdownContent = document.getElementById('category-dropdown');

// Data variables
let products = [];
let displayedProducts = [];
const productsPerLoad = 12;
let currentProductIndex = 0;

/**
 * Fetches JSON data from a specified path.
 * @param {string} filePath - The path to the JSON file.
 * @returns {Promise<object|Array>} The parsed JSON data.
 */
async function fetchJSON(filePath) {
    const response = await fetch(filePath);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
    }
    return response.json();
}

/**
 * Renders the comprehensive shop header dynamically.
 * @param {object} shopData - The data for the current shop.
 */
function renderShopHeader(shopData) {
    if (!shopData) return;

    const shopHeaderHTML = `
        <header class="main-header">
            <div class="logo">
                <a href="${shopData.shopPageUrl}" title="Go to ${shopData.name} Homepage">
                    <img src="${shopData.logo_url}" alt="${shopData.name} Logo" class="shop-logo">
                </a>
                <h1 class="shop-name-title">${shopData.name}</h1>
            </div>

            <div class="search-and-filters">
                <div class="search-bar">
                    <input type="text" id="product-search" placeholder="Search for products...">
                    <button id="search-btn"><i class="fas fa-search"></i></button>
                    <div id="search-suggestions" class="search-suggestions-dropdown"></div>
                </div>
                
                <div class="filters">
                    <div class="filter-dropdown">
                        <button class="dropdown-btn">Categories <i class="fas fa-chevron-down"></i></button>
                        <div id="category-dropdown" class="dropdown-content">
                            </div>
                    </div>
                </div>
            </div>
            
            <div class="header-icons">
                <a href="#" title="Shopping Cart">
                    <i class="fas fa-shopping-cart"></i>
                    <span id="cart-count" class="item-count"></span>
                </a>
                <a href="#" title="Wishlist">
                    <i class="fas fa-heart"></i>
                    <span id="wishlist-count" class="item-count"></span>
                </a>
            </div>
        </header>
    `;

    shopHeaderPlaceholder.innerHTML = shopHeaderHTML;
    
    // Populate categories
    const categories = shopData.categories || [];
    const categoryDropdownContent = document.getElementById('category-dropdown');
    if (categoryDropdownContent) {
        categories.forEach(category => {
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = category;
            link.dataset.category = category;
            categoryDropdownContent.appendChild(link);
        });
    }
}

/**
 * Creates and returns the HTML string for a single product card.
 * @param {object} product - The product data object.
 * @returns {string} The HTML string for the product card.
 */
function createProductCard(product) {
    const isHotPick = product.isHotPick ? `<span class="product-badge hot-pick">Hot Pick</span>` : '';
    const isDeal = product.isDeals ? `<span class="product-badge deals">Deal</span>` : '';

    return `
        <a href="product-detail.html?shop=nashaa_kicks&id=${product.id}" class="product-card">
            <div class="product-image-container">
                <img src="${product.images[0]}" alt="${product.name}" class="product-image">
                ${isHotPick}
                ${isDeal}
            </div>
            <div class="product-info">
                <p class="product-name">${product.name}</p>
                <p class="product-price">Ksh ${product.price.toFixed(2)}</p>
                <div class="product-rating">
                    <i class="fas fa-star"></i>
                    <span>${product.rating}</span>
                </div>
            </div>
        </a>
    `;
}

/**
 * Renders products to the specified grid.
 * @param {Array} productList - The list of products to display.
 * @param {HTMLElement} gridElement - The grid element to render to.
 */
function displayProducts(productList, gridElement) {
    gridElement.innerHTML = '';
    productList.forEach(product => {
        gridElement.innerHTML += createProductCard(product);
    });
}

/**
 * Loads more products into the 'All Products' grid.
 */
function loadMoreProducts() {
    const nextProducts = products.slice(currentProductIndex, currentProductIndex + productsPerLoad);
    nextProducts.forEach(product => {
        allProductsGrid.innerHTML += createProductCard(product);
    });

    currentProductIndex += productsPerLoad;

    if (currentProductIndex >= products.length) {
        loadMoreBtn.style.display = 'none';
    }
}

/**
 * Filters and displays products based on a search query.
 * @param {string} query - The search query.
 */
function filterProducts(query) {
    const filtered = products.filter(product => 
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase())
    );
    displayProducts(filtered, allProductsGrid);
}

/**
 * Initializes all the page data and functionality.
 */
async function loadPageData() {
    try {
        const [productsData, shopsData] = await Promise.all([
            fetchJSON('../data/nashaa-kicks.json'),
            fetchJSON('../data/shops.json')
        ]);

        products = productsData;
        displayedProducts = [...products];

        const nashaaKicksShop = shopsData.find(shop => shop.shop_id === 'nashaa_kicks');
        renderShopHeader(nashaaKicksShop);

        const hotPicks = products.filter(p => p.isHotPick);
        displayProducts(hotPicks, hotPicksGrid);

        loadMoreProducts();

        const searchInput = document.getElementById('product-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                filterProducts(e.target.value);
                loadMoreBtn.style.display = 'none';
            });
        }
        
        const categoryDropdown = document.getElementById('category-dropdown');
        if (categoryDropdown) {
            categoryDropdown.addEventListener('click', (e) => {
                e.preventDefault();
                if (e.target.tagName === 'A') {
                    const category = e.target.dataset.category;
                    const filtered = products.filter(p => p.category === category);
                    displayProducts(filtered, allProductsGrid);
                    loadMoreBtn.style.display = 'none';
                }
            });
        }
        
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', loadMoreProducts);
        }

        updateHeaderCounts();
        setTimeout(() => {
            const liveAgent = document.getElementById('live-agent-popup');
            if (liveAgent) {
                liveAgent.classList.add('show');
            }
        }, 5000);

    } catch (error) {
        console.error('Error loading page data:', error);
    }
}

// Start the page initialization
document.addEventListener('DOMContentLoaded', loadPageData);