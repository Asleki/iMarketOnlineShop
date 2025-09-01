//
// File: js/header-loader.js
// -------------------------------------------------
// This script loads the header HTML and then initializes all dynamic
// header functionality, including dropdowns, hamburger menu, theme toggle,
// and scroll-to-top/bottom buttons.
//

(async function() {
    console.log('Header loader script started...');

    // =========================================================
    // 1. Header & Footer HTML Loading
    // =========================================================
    async function loadPartial(placeholderId, filePath) {
        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const html = await response.text();
            document.getElementById(placeholderId).innerHTML = html;
        } catch (e) {
            console.error(`Failed to load ${filePath}:`, e);
        }
    }

    // Load the header first
    await loadPartial('main-header-placeholder', 'header.html');
    console.log('Header HTML loaded successfully.');

    // Wait for the header to be in the DOM before proceeding
    const mainHeader = document.getElementById('main-header');
    if (!mainHeader) {
        console.error('Header element not found. Aborting header script initialization.');
        return;
    }

    // =========================================================
    // 2. Data Fetching & Standardization
    // =========================================================
    let shopsData = [];
    let allProducts = [];

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
                };
            });
            console.log('Shops and product data fetched for header use.');
        } catch (error) {
            console.error('Error fetching data for header:', error);
        }
    }

    // =========================================================
    // 3. Theme Toggle Logic
    // =========================================================
    function initThemeToggle() {
        const themeToggleBtn = document.getElementById('theme-toggle');
        const lightIcon = document.getElementById('light-icon');
        const darkIcon = document.getElementById('dark-icon');
        const body = document.body;

        const currentTheme = localStorage.getItem('theme') || 'light';
        body.classList.add(currentTheme + '-mode'); // Use 'light-mode' or 'dark-mode'
        
        if (currentTheme === 'dark') {
            lightIcon.classList.add('hidden');
            darkIcon.classList.remove('hidden');
        } else {
            lightIcon.classList.remove('hidden');
            darkIcon.classList.add('hidden');
        }

        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                const isDark = body.classList.toggle('dark-mode');
                body.classList.toggle('light-mode');
                localStorage.setItem('theme', isDark ? 'dark' : 'light');

                if (isDark) {
                    lightIcon.classList.add('hidden');
                    darkIcon.classList.remove('hidden');
                } else {
                    lightIcon.classList.remove('hidden');
                    darkIcon.classList.add('hidden');
                }
            });
        }
    }

    // =========================================================
    // 4. Dropdown Menu & Hamburger Menu Logic
    // =========================================================
    function initNavigation() {
        const hamburgerBtn = document.getElementById('hamburger-menu');
        const navMenu = document.getElementById('primary-nav');
        const hamburgerIcon = document.getElementById('hamburger-icon');
        const closeIcon = document.getElementById('close-icon');
        const dropdownToggles = document.querySelectorAll('.nav-links .dropdown > a');

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
    // 5. Dynamic Dropdown & Link Population
    // =========================================================
    function populateDynamicContent() {
        const categoriesDropdown = document.getElementById('categories-dropdown');
        const shopsDropdown = document.getElementById('shops-dropdown');

        const allCategories = shopsData.flatMap(shop => shop.categories);
        const uniqueCategories = [...new Set(allCategories)].sort();
        if (categoriesDropdown) {
            categoriesDropdown.innerHTML = uniqueCategories.map(cat => 
                `<li><a href="categories.html#${cat.toLowerCase().replace(/\s+/g, '-')}" title="${cat}">${cat}</a></li>`
            ).join('');
        }

        if (shopsDropdown) {
            shopsDropdown.innerHTML = shopsData.map(shop => 
                `<li><a href="shops/${shop.shop_id}-categories.html" title="${shop.name}">${shop.name}</a></li>`
            ).join('');
        }
        
        const dealsLink = document.querySelector('a[title="Today\'s Deals"]');
        const newArrivalsLink = document.querySelector('a[title="New Arrivals"]');
        
        const hasDeals = allProducts.some(p => p.isDeals);
        if (dealsLink) {
            dealsLink.href = hasDeals ? 'deals.html' : '#';
        }
        
        const hasNewArrivals = allProducts.some(p => {
            const oneMonthAgo = new Date();
            oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
            return p.dateAdded > oneMonthAgo;
        });
        if (newArrivalsLink) {
            newArrivalsLink.href = hasNewArrivals ? 'new-arrivals.html' : '#';
        }
    }

    // =========================================================
    // 6. Scroll-to-Top/Bottom Buttons
    // =========================================================
    function initScrollButtons() {
        // Scroll-to-Top Logic
        const scrollToTopBtn = document.getElementById('scroll-to-top-btn');
        if (scrollToTopBtn) {
            window.addEventListener('scroll', () => {
                if (window.scrollY > 300) {
                    scrollToTopBtn.classList.add('show');
                } else {
                    scrollToTopBtn.classList.remove('show');
                }
            });
            scrollToTopBtn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }

    // =========================================================
    // 7. Initialization
    // =========================================================
    await fetchAllData();
    initThemeToggle();
    initNavigation();
    populateDynamicContent();
    initScrollButtons();

    // Now load the footer
    await loadPartial('main-footer-placeholder', 'footer.html');
    console.log('Footer HTML loaded successfully.');

})();