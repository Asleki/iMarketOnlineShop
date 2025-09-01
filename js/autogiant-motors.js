// File: js/autogiant-motors.js
// This script provides dynamic functionality for the AutoGiant Motors shop page.

document.addEventListener('partialsLoaded', async () => {
    console.log('Partials loaded. Initializing AutoGiant Motors page logic.');

    // Wait for the main header to be loaded, then hide the cart icon.
    // NOTE: This requires a corresponding CSS rule. Add this to your main.css:
    // .no-cart-icon #cart-icon-wrapper { display: none !important; }

    // =========================================================
    // 1. Dynamic Hero Slider & Subheader Loading
    // =========================================================
    const subheaderPlaceholder = document.getElementById('shop-subheader-placeholder');
    if (subheaderPlaceholder) {
        // Load the shop-specific header partial
        const subheaderResponse = await fetch('partials/autogiant-motors-header.html');
        const subheaderHtml = await subheaderResponse.text();
        subheaderPlaceholder.innerHTML = subheaderHtml;
    }

    let carsData = [];

    // Fetch and standardize data
    try {
        const response = await fetch('data/autogiant-motors-products.json');
        if (!response.ok) {
            throw new Error('Failed to fetch AutoGiant Motors products.');
        }
        carsData = await response.json();
    } catch (error) {
        console.error('Error loading product data:', error);
    }
    
    function renderHeroSlider() {
        if (carsData.length === 0) return;

        const sliderContainer = document.getElementById('autogiant-motors-hero-slider');
        const latestCars = carsData.sort((a, b) => b.year - a.year).slice(0, 3);
        let currentIndex = 0;

        const updateSlider = () => {
            sliderContainer.innerHTML = '';
            const car = latestCars[currentIndex];
            const slide = document.createElement('div');
            slide.classList.add('hero-slide');
            slide.innerHTML = `
                <div class="hero-image-wrapper">
                    <img src="${car.car_display_image}" alt="${car.make} ${car.model}" class="hero-image">
                    <div class="hero-overlay"></div>
                </div>
                <div class="hero-content">
                    <h1 class="hero-title text-inverted">${car.make} ${car.model}</h1>
                    <p class="hero-subtitle text-inverted">Experience the elegance of the new ${car.year} model.</p>
                    <div class="hero-buttons">
                        <a href="autogiant-motors-car-details.html?id=${car.model.replace(/\s/g, '-')}" class="btn-cta">View Details</a>
                    </div>
                </div>
            `;
            sliderContainer.appendChild(slide);
        };

        const nextSlide = () => {
            currentIndex = (currentIndex + 1) % latestCars.length;
            updateSlider();
        };

        const prevSlide = () => {
            currentIndex = (currentIndex - 1 + latestCars.length) % latestCars.length;
            updateSlider();
        };

        document.querySelector('.hero-slider-nav .next-btn').addEventListener('click', nextSlide);
        document.querySelector('.hero-slider-nav .prev-btn').addEventListener('click', prevSlide);

        setInterval(nextSlide, 5000); // Auto-advance slider every 5 seconds
        updateSlider();
    }

    // =========================================================
    // 2. Featured Vehicles Grid/List Toggle
    // =========================================================
    const featuredContainer = document.getElementById('featured-products-container');
    const gridViewBtn = document.getElementById('grid-view-btn');
    const listViewBtn = document.getElementById('list-view-btn');

    function renderFeaturedVehicles(viewType = 'grid') {
        featuredContainer.innerHTML = '';
        featuredContainer.className = viewType === 'grid' ? 'product-grid' : 'product-list';

        const featuredCars = carsData.slice(0, 6); // Display first 6 as featured

        if (featuredCars.length === 0) {
            featuredContainer.innerHTML = '<p class="text-center">No featured vehicles available at the moment.</p>';
            return;
        }

        featuredCars.forEach(car => {
            const card = document.createElement('div');
            card.classList.add(viewType === 'grid' ? 'product-card' : 'product-item-list');
            const carUrl = `autogiant-motors-car-details.html?id=${car.model.replace(/\s/g, '-')}`;

            const detailsHtml = viewType === 'list' ? `
                <div class="list-details">
                    <h3 class="list-title">${car.make} ${car.model}</h3>
                    <p><strong>Year:</strong> ${car.year}</p>
                    <p><strong>Price:</strong> Ksh ${car.price.toLocaleString()}</p>
                    <p><strong>Location:</strong> ${car.contact_agent.location}</p>
                </div>
                <div class="list-actions">
                    <a href="${carUrl}" class="btn-primary">View Details</a>
                </div>
            ` : '';

            card.innerHTML = `
                <div class="product-image-wrapper">
                    <img src="${car.car_display_image}" alt="${car.make} ${car.model}" loading="lazy">
                </div>
                ${detailsHtml}
            `;
            
            if (viewType === 'grid') {
                const title = document.createElement('h3');
                title.classList.add('product-title');
                title.textContent = `${car.make} ${car.model}`;

                const price = document.createElement('p');
                price.classList.add('product-price');
                price.textContent = `Ksh ${car.price.toLocaleString()}`;

                const button = document.createElement('a');
                button.classList.add('btn-primary');
                button.href = carUrl;
                button.textContent = 'View Details';

                card.appendChild(title);
                card.appendChild(price);
                card.appendChild(button);
            }

            featuredContainer.appendChild(card);
        });
    }

    // Event listeners for view toggle
    gridViewBtn.addEventListener('click', () => {
        renderFeaturedVehicles('grid');
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
    });

    listViewBtn.addEventListener('click', () => {
        renderFeaturedVehicles('list');
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
    });


    // =========================================================
    // 3. Sticky Subheader & Scroll Logic
    // =========================================================
    const shopSubheader = document.getElementById('autogiant-motors-header');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 200) { // Height threshold to trigger sticky behavior
            shopSubheader.classList.add('collapsed');
        } else {
            shopSubheader.classList.remove('collapsed');
        }
    });

    // =========================================================
    // 4. Initialization
    // =========================================================
    renderHeroSlider();
    renderFeaturedVehicles('grid');
});