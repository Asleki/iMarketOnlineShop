//
// File: js/soko-properties-product-details.js
// -------------------------------------------------
// This script handles the dynamic content for a single property details page.
// It uses the product ID from the URL to fetch data and populate the page.
// It also includes a currency converter widget and image gallery.
//

document.addEventListener('DOMContentLoaded', async () => {

    const loadingMessage = document.getElementById('loading-message');
    const productDetailsContent = document.getElementById('product-details-content');

    /**
     * Fetches property data from the JSON file and returns a specific property.
     * @param {string} propertyId - The ID of the property to find.
     * @returns {Object|null} - The property object or null if not found.
     */
    async function fetchPropertyById(propertyId) {
        try {
            const response = await fetch('data/soko-properties-products.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const allProperties = await response.json();
            return allProperties.find(p => p.propertyId === propertyId) || null;
        } catch (error) {
            console.error('Failed to load property data:', error);
            return null;
        }
    }

    /**
     * Renders the details of a single property onto the page.
     * @param {Object} property - The property object to render.
     */
    function renderPropertyDetails(property) {
        // Hide loading message and show content container
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
        if (productDetailsContent) {
            productDetailsContent.style.display = 'grid';
        }
        
        // Populate the header and core information with defensive checks
        const productTitle = document.getElementById('product-title');
        if (productTitle) {
            productTitle.textContent = property.title;
        }

        const productPrice = document.getElementById('product-price');
        if (productPrice) {
            productPrice.textContent = property.price.amount.toLocaleString('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 0 });
        }
        
        const productLocation = document.getElementById('product-location');
        if (productLocation) {
            productLocation.textContent = `${property.location.address}, ${property.location.city}, ${property.location.county}`;
        }

        // Populate the meta information
        const metaContainer = document.getElementById('product-meta');
        if (metaContainer) {
            metaContainer.innerHTML = `
                <span>${property.propertyType}</span>
                ${property.bedrooms !== undefined ? `<span>${property.bedrooms} Bed${property.bedrooms > 1 ? 's' : ''}</span>` : ''}
                ${property.bathrooms !== undefined ? `<span>${property.bathrooms} Bath${property.bathrooms > 1 ? 's' : ''}</span>` : ''}
                ${property.area ? `<span>${property.area.size} ${property.area.unit}</span>` : ''}
                ${property.plotSize ? `<span>${property.plotSize.size} ${property.plotSize.unit} Plot</span>` : ''}
                <span id="views-count">Views: ${property.views}</span>
            `;
        }

        // Populate description
        const descriptionText = document.getElementById('description-text');
        if (descriptionText) {
            descriptionText.textContent = property.description;
        }

        // Populate the features list
        const featuresList = document.getElementById('features-list');
        if (featuresList) {
            featuresList.innerHTML = property.features.map(feature => `<li>${feature}</li>`).join('');
        }

        // Populate the agent information
        const agentCompany = document.getElementById('agent-company');
        if (agentCompany) {
            agentCompany.textContent = property.agentInfo.name;
        }

        const agentContactPerson = document.getElementById('agent-contact-person');
        if (agentContactPerson) {
            agentContactPerson.textContent = property.agentInfo.contactPerson;
        }

        const agentPhone = document.getElementById('agent-phone');
        if (agentPhone) {
            agentPhone.textContent = property.agentInfo.phone;
        }

        const agentEmail = document.getElementById('agent-email');
        if (agentEmail) {
            agentEmail.textContent = property.agentInfo.email;
        }
        
        const inquireBtn = document.getElementById('inquire-btn');
        if (inquireBtn) {
            inquireBtn.href = `mailto:${property.agentInfo.email}`;
        }

        // Populate the payment modes list
        const paymentModesList = document.getElementById('payment-modes-list');
        if (paymentModesList) {
            paymentModesList.innerHTML = property.allowedPaymentModes.map(mode => `<li>${mode}</li>`).join('');
        }

        // Populate the reviews section
        const reviewsList = document.getElementById('reviews-list');
        const reviewsCount = document.getElementById('reviews-count');

        if (reviewsList && reviewsCount) {
            if (property.reviews && property.reviews.length > 0) {
                reviewsCount.textContent = property.reviews.length;
                reviewsList.innerHTML = ''; // Clear the initial message
                
                property.reviews.forEach(review => {
                    const reviewElement = document.createElement('div');
                    reviewElement.classList.add('review');
                    const starsHtml = '⭐️'.repeat(review.rating);
                    reviewElement.innerHTML = `
                        <div class="review-header">
                            <span class="reviewer-name">Reviewed by: <strong>${review.reviewerName}</strong></span>
                            <span class="review-date">${new Date(review.date).toLocaleDateString()}</span>
                        </div>
                        <div class="review-rating">${starsHtml}</div>
                        <p class="review-comment">${review.comment}</p>
                    `;
                    reviewsList.appendChild(reviewElement);
                });
            } else {
                reviewsCount.textContent = '0';
                reviewsList.innerHTML = '<p>No reviews yet. Be the first to leave a review!</p>';
            }
        }

        // Set up image gallery and converter
        setupImageGallery(property);
        setupCurrencyConverter();
    }

    /**
     * Sets up the image gallery functionality.
     * @param {Object} property - The property object containing image URLs.
     */
    function setupImageGallery(property) {
        const mainImage = document.getElementById('main-product-image');
        const thumbnailGallery = document.getElementById('thumbnail-gallery');
        const images = [...property.images, ...property.interiorImages];

        if (mainImage && thumbnailGallery && images.length > 0) {
            // Set the initial main image
            mainImage.src = images[0];

            // Populate and set up thumbnails
            const thumbnailsHtml = images.map(image => `
                <div class="thumbnail-image-container">
                    <img src="${image}" alt="Thumbnail of property" class="thumbnail-image">
                </div>
            `).join('');
            thumbnailGallery.innerHTML = thumbnailsHtml;
            
            const thumbnails = document.querySelectorAll('.thumbnail-image-container');
            if (thumbnails.length > 0) {
                thumbnails[0].classList.add('active'); // Set the first one as active

                thumbnails.forEach(thumb => {
                    thumb.addEventListener('click', () => {
                        document.querySelector('.thumbnail-image-container.active')?.classList.remove('active');
                        thumb.classList.add('active');
                        mainImage.src = thumb.querySelector('.thumbnail-image').src;
                    });
                });
            }
        }
    }

    /**
     * Sets up the currency converter functionality.
     */
    function setupCurrencyConverter() {
        const amountInput = document.getElementById('converter-amount');
        const currencySelect = document.getElementById('currency-select');
        const convertBtn = document.getElementById('convert-btn');
        const convertedAmountElement = document.getElementById('converted-amount');

        if (convertBtn) {
            // Placeholder exchange rates - these would be fetched from an API in a real application
            const rates = {
                'USD': 0.0075,
                'EUR': 0.0068,
                'GBP': 0.0060
            };

            convertBtn.addEventListener('click', () => {
                const amount = parseFloat(amountInput.value);
                const targetCurrency = currencySelect.value;
                
                if (isNaN(amount) || amount <= 0) {
                    convertedAmountElement.textContent = 'Please enter a valid amount.';
                    return;
                }

                const converted = amount * rates[targetCurrency];
                convertedAmountElement.textContent = `Converted Amount: ${targetCurrency} ${converted.toFixed(2)}`;
            });
        }
    }

    /**
     * Main function to initialize the page on load.
     */
    async function init() {
        // Get the product ID from the URL query parameter
        const params = new URLSearchParams(window.location.search);
        const productId = params.get('id');

        if (!productId) {
            if (loadingMessage) {
                loadingMessage.textContent = 'Error: No property ID specified in the URL.';
            }
            if (productDetailsContent) {
                productDetailsContent.style.display = 'none';
            }
            return;
        }

        const property = await fetchPropertyById(productId);
        if (property) {
            renderPropertyDetails(property);
        } else {
            if (loadingMessage) {
                loadingMessage.textContent = 'Property not found. Please check the URL.';
            }
            if (productDetailsContent) {
                productDetailsContent.style.display = 'none';
            }
        }
    }

    // Run the main initialization function
    init();
});