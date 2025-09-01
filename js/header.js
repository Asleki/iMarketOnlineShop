//
// File: js/header.js
// -------------------------------------------------
// This script provides all dynamic functionality for the header,
// including theme toggle, navigation, search, and dynamic ad content.
// It runs after the header HTML has been loaded.
//

document.addEventListener('partialsLoaded', async () => {
    let shopsData = [];
    let allProducts = [];
    let searchableSuggestions = [];

    // =========================================================
    // Data Fetching & Standardization
    // =========================================================
    async function fetchAllData() {
        try {
            const shopsResponse = await fetch('data/shops.json');
            shopsData = await shopsResponse.json();

            const productFetchPromises = shopsData.map(shop =>
                fetch(`data/${shop.product_data_file}`)
                .then(response => response.ok ? response.json() : [])
                .catch(() => [])
            );

            const productsByShop = await Promise.all(productFetchPromises);
            allProducts = productsByShop.flat().map((product, index) => {
                const shopIndex = productsByShop.findIndex(p => p.includes(product));
                const shop = shopIndex !== -1 ? shopsData[shopIndex] : null;
                const date = product.listingDate || product.date_added || '1970-01-01';
                const isDeal = product.isDeals || (product.discount_percent && product.discount_percent > 0) || false;

                return {
                    id: product.item_id || product.id || product.propertyId || index,
                    shop_id: shop ? shop.shop_id : 'unknown',
                    dateAdded: new Date(date),
                    isDeals: isDeal,
                    name: product.name || product.title,
                    category: product.category || product.car_type || product.propertyType,
                    subCategory: product.subCategory
                };
            });
            createSearchableSuggestions();
        } catch (error) {
            console.error('Error fetching data for header:', error);
        }
    }

    // =========================================================
    // Theme Toggle Logic
    // =========================================================
    function initThemeToggle() {
        const themeToggleBtn = document.getElementById('theme-toggle');
        const lightIcon = document.getElementById('light-icon');
        const darkIcon = document.getElementById('dark-icon');
        const body = document.body;

        const currentTheme = localStorage.getItem('theme') || 'light';
        if (currentTheme === 'dark') {
            body.classList.add('dark-mode');
        } else {
            body.classList.remove('dark-mode');
        }

        if (lightIcon && darkIcon) {
            if (currentTheme === 'dark') {
                lightIcon.classList.add('hidden');
                darkIcon.classList.remove('hidden');
            } else {
                lightIcon.classList.remove('hidden');
                darkIcon.classList.add('hidden');
            }
        }

        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                const isDark = body.classList.toggle('dark-mode');
                localStorage.setItem('theme', isDark ? 'dark' : 'light');

                if (lightIcon && darkIcon) {
                    if (isDark) {
                        lightIcon.classList.add('hidden');
                        darkIcon.classList.remove('hidden');
                    } else {
                        lightIcon.classList.remove('hidden');
                        darkIcon.classList.add('hidden');
                    }
                }
            });
        }
    }

    // =========================================================
    // Dropdown Menu & Hamburger Menu Logic
    // =========================================================
    function initNavigation() {
        console.log('initNavigation() is running.');
        const hamburgerBtn = document.getElementById('hamburger-menu');
        const navMenu = document.getElementById('primary-nav');
        const hamburgerIcon = document.getElementById('hamburger-icon');
        const closeIcon = document.getElementById('close-icon');
        const dropdownToggles = document.querySelectorAll('.nav-links .dropdown > a');
        console.log('Found ' + dropdownToggles.length + ' dropdown toggles.');

        if (hamburgerBtn && navMenu) {
            hamburgerBtn.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                hamburgerIcon.classList.toggle('hidden');
                closeIcon.classList.toggle('hidden');
            });
        }

        dropdownToggles.forEach(toggle => {
            const dropdownMenu = toggle.nextElementSibling;
            
            toggle.parentElement.addEventListener('mouseenter', () => {
                if (window.innerWidth > 768) {
                    dropdownMenu.classList.add('show');
                }
            });
            toggle.parentElement.addEventListener('mouseleave', () => {
                if (window.innerWidth > 768) {
                    dropdownMenu.classList.remove('show');
                }
            });

            toggle.addEventListener('click', (e) => {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    dropdownMenu.classList.toggle('show');
                }
            });
        });
    }

    // =========================================================
    // Dynamic Dropdown & Link Population
    // =========================================================
    function populateDynamicContent() {
        const categoriesDropdown = document.getElementById('categories-dropdown');
        const shopsDropdown = document.getElementById('shops-dropdown');

        const allCategories = shopsData.flatMap(shop => shop.categories);
        const uniqueCategories = [...new Set(allCategories)].sort();
        if (categoriesDropdown) {
            categoriesDropdown.innerHTML = uniqueCategories.map(cat => {
                // Find the first shop that sells this category
                const firstShop = shopsData.find(shop => shop.categories.includes(cat));
                let link = `shops.html?category=${encodeURIComponent(cat)}`; // Fallback
                if (firstShop) {
                    link = `${firstShop.shopPageUrl.replace('index.html', '')}categories.html?category=${encodeURIComponent(cat)}`;
                }
                return `<li><a href="${link}" title="${cat}">${cat}</a></li>`;
            }).join('');
        }

        if (shopsDropdown) {
            shopsDropdown.innerHTML = shopsData.map(shop => 
                `<li><a href="${shop.shopPageUrl}" title="${shop.name}">${shop.name}</a></li>`
            ).join('');
        }
        
        const dealsLink = document.querySelector('a[title="Today\'s Deals"]');
        const newArrivalsLink = document.querySelector('a[title="New Arrivals"]');
        
        const hasDeals = allProducts.some(p => p.isDeals);
        if (dealsLink) {
            dealsLink.href = hasDeals ? 'deals.html' : '#';
        }
        
        if (newArrivalsLink) {
            newArrivalsLink.href = 'new-arrivals.html';
        }
    }

    // =========================================================
    // Search Bar Suggestions
    // =========================================================
    function createSearchableSuggestions() {
        const suggestions = new Set();
        
        // Add all shop names
        shopsData.forEach(shop => suggestions.add({
            name: shop.name,
            link: shop.shopPageUrl,
            type: 'Shop',
            shop_id: shop.shop_id
        }));
        
        // Add all categories from shopsData
        shopsData.forEach(shop => {
            shop.categories.forEach(cat => suggestions.add({
                name: cat,
                link: `shops.html?category=${encodeURIComponent(cat)}`,
                type: 'Category'
            }));
        });
        
        // Add all product names and subcategories
        allProducts.forEach(product => {
            if (product.name) {
                suggestions.add({
                    name: product.name,
                    id: product.id,
                    shop_id: product.shop_id,
                    type: 'Product'
                });
            }
            if (product.subCategory) {
                suggestions.add({
                    name: product.subCategory,
                    link: `shops.html?category=${encodeURIComponent(product.subCategory)}`,
                    type: 'Subcategory'
                });
            }
        });
        
        searchableSuggestions = [...suggestions].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    function initSearchBar() {
        const searchInput = document.getElementById('main-search-input');
        const suggestionsContainer = document.getElementById('search-suggestions-container');
        const clearButton = document.getElementById('clear-search-button');

        if (!searchInput || !suggestionsContainer || !clearButton) {
            console.error('Search bar elements not found. Check your HTML IDs.');
            return;
        }

        const handleInput = () => {
            const query = searchInput.value.toLowerCase().trim();
            suggestionsContainer.innerHTML = '';
            
            if (query.length < 2) {
                suggestionsContainer.classList.remove('show');
                clearButton.classList.add('hidden');
                return;
            }

            clearButton.classList.remove('hidden');

            const filteredSuggestions = searchableSuggestions.filter(s => 
                s.name.toLowerCase().includes(query)
            );
            
            if (filteredSuggestions.length > 0) {
                const suggestionsList = filteredSuggestions.slice(0, 5).map(s => {
                    let link;
                    switch (s.type) {
                        case 'Product':
                            link = `${s.shop_id}-product-details.html?id=${encodeURIComponent(s.id)}`;
                            break;
                        case 'Shop':
                            link = s.link;
                            break;
                        case 'Category':
                            // Find the first shop that sells this category
                            const firstShop = shopsData.find(shop => shop.categories.includes(s.name));
                            if (firstShop) {
                                link = `${firstShop.shopPageUrl.replace('index.html', '')}categories.html?category=${encodeURIComponent(s.name)}`;
                            } else {
                                link = `shops.html?category=${encodeURIComponent(s.name)}`;
                            }
                            break;
                        default:
                            link = s.link; // Fallback for 'Subcategory' and others
                    }
                    return `
                        <li><a href="${link}">${s.name} <span class="suggestion-type">${s.type}</span></a></li>
                    `;
                }).join('');
                
                suggestionsContainer.innerHTML = `<ul>${suggestionsList}</ul>`;
                suggestionsContainer.classList.add('show');
            } else {
                suggestionsContainer.classList.remove('show');
            }
        };

        searchInput.addEventListener('input', handleInput);
        
        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            handleInput(); // Trigger the logic to clear suggestions and hide the button
            searchInput.focus();
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            const searchBarArea = document.querySelector('.header-search-container');
            if (searchBarArea && !searchBarArea.contains(e.target)) {
                suggestionsContainer.classList.remove('show');
            }
        });
    }
    
    // =========================================================
    // Dynamic Ad Ticker (Marquee)
    // =========================================================
    async function initAdTicker() {
        const adPlaceholder = document.getElementById('top-ad-placeholder');
        const adContainer = document.querySelector('.ad-ticker-container');
        if (!adPlaceholder || !adContainer) {
            console.error('Ad ticker elements not found. Check your HTML.');
            return;
        }

        try {
            const response = await fetch('data/ads.json');
            const ads = await response.json();
            
            if (ads.length === 0) {
                adPlaceholder.innerHTML = 'No active ads.';
                return;
            }
            
            let currentAdIndex = 0;
            
            const startAdMarquee = () => {
                const ad = ads[currentAdIndex];
                adPlaceholder.innerHTML = ad.message;
                adPlaceholder.href = ad.link || '#';
                
                // Clear any previous animation
                adPlaceholder.style.animation = 'none';
                
                // Force a reflow to restart the animation
                void adPlaceholder.offsetWidth;
                
                // Calculate animation duration based on text length
                const textWidth = adPlaceholder.offsetWidth;
                const containerWidth = adContainer.offsetWidth;
                const totalDistance = textWidth + containerWidth;
                const speed = 50; // pixels per second
                const duration = totalDistance / speed;

                adPlaceholder.style.animation = `marquee ${duration}s linear`;

                const animationEndHandler = () => {
                    currentAdIndex = (currentAdIndex + 1) % ads.length;
                    adPlaceholder.removeEventListener('animationend', animationEndHandler);
                    startAdMarquee();
                };

                adPlaceholder.addEventListener('animationend', animationEndHandler);
            };

            startAdMarquee();
        } catch (error) {
            console.error('Error fetching ads:', error);
            adPlaceholder.innerHTML = 'Error loading ads.';
        }
    }


    // =========================================================
    // Scroll-to-Top Button Logic
    // =========================================================
    function initScrollToTop() {
        const scrollToTopBtn = document.getElementById('scroll-to-top-btn');
        if (!scrollToTopBtn) return;

        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollToTopBtn.classList.add('show');
            } else {
                scrollToTopBtn.classList.remove('show');
            }
        });

        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // =========================================================
    // Header Content Padding Logic (Dynamic Header Height)
    // =========================================================
    function adjustMainContentPadding() {
        const header = document.querySelector('header');
        const mainContent = document.querySelector('main.main-content');
        
        if (header && mainContent) {
            const headerHeight = header.offsetHeight;
            mainContent.style.paddingTop = `${headerHeight}px`;
        }
    }

    // =========================================================
    // Initialization
    // =========================================================
    await fetchAllData();
    initThemeToggle();
    initNavigation();
    populateDynamicContent();
    initSearchBar();
    initAdTicker();
    initScrollToTop();
    adjustMainContentPadding(); // Call on initial load
    window.addEventListener('resize', adjustMainContentPadding); // Re-run on resize
});