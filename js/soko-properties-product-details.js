// js/soko-properties-product-details.js

document.addEventListener('partialsLoaded', async () => {
    // Helper function to format prices
    function formatPrice(amount, currency) {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0
        }).format(amount);
    }

    // Function to populate the page with property data
    function populatePage(property) {
        // Update dynamic SEO and meta tags
        document.getElementById('property-title-meta').textContent = property.title;
        document.getElementById('property-description-meta').content = property.description;
        document.getElementById('property-keywords-meta').content = `${property.title}, ${property.propertyType}, ${property.location.city}, ${property.location.county}, ${property.location.country}, property for sale, Soko Properties, real estate`;

        document.getElementById('og-title-meta').content = property.title;
        document.getElementById('og-description-meta').content = property.description;
        document.getElementById('og-image-meta').content = property.images[0] || 'https://www.imarket.co.ke/images/imarket-share-logo.jpg';
        document.getElementById('og-url-meta').content = window.location.href;
        document.getElementById('twitter-title-meta').content = property.title;
        document.getElementById('twitter-description-meta').content = property.description;
        document.getElementById('twitter-image-meta').content = property.images[0] || 'https://www.imarket.co.ke/images/imarket-share-logo.jpg';
        document.getElementById('canonical-url').href = window.location.href;

        // Populate main details
        document.getElementById('property-title').textContent = property.title;
        document.getElementById('property-price').textContent = formatPrice(property.price.amount, property.price.currency);
        document.getElementById('property-location').textContent = `${property.location.address}, ${property.location.city}, ${property.location.county}`;
        document.getElementById('property-type').textContent = property.propertyType;
        document.getElementById('property-bedrooms').textContent = property.bedrooms || 'N/A';
        document.getElementById('property-bathrooms').textContent = property.bathrooms || 'N/A';
        document.getElementById('property-area').textContent = property.area ? `${property.area.size} ${property.area.unit}` : 'N/A';
        document.getElementById('property-year-built').textContent = property.yearBuilt || 'N/A';
        document.getElementById('property-description').textContent = property.description;

        // Populate features list
        const featuresList = document.getElementById('property-features');
        featuresList.innerHTML = ''; // Clear existing content
        if (property.features && property.features.length > 0) {
            property.features.forEach(feature => {
                const li = document.createElement('li');
                li.textContent = feature;
                featuresList.appendChild(li);
            });
        } else {
            featuresList.innerHTML = '<li>No features listed.</li>';
        }

        // Populate agent info
        document.getElementById('agent-contact-person').textContent = property.agentInfo.contactPerson;
        document.getElementById('agent-phone').textContent = property.agentInfo.phone;
        document.getElementById('agent-email').textContent = property.agentInfo.email;
        document.getElementById('inquire-btn').href = `soko-properties-contact-agent.html?id=${property.propertyId}`;
        // Populate image gallery
        const imageGallery = document.getElementById('image-gallery');
        imageGallery.innerHTML = ''; // Clear existing content
        const allImages = [...property.images, ...property.interiorImages];
        if (allImages.length > 0) {
            allImages.forEach(imageUrl => {
                const img = document.createElement('img');
                img.src = imageUrl;
                img.alt = property.title;
                img.loading = 'lazy';
                imageGallery.appendChild(img);
            });
        } else {
            imageGallery.innerHTML = '<p class="text-center">No images available for this property.</p>';
        }
    }

    // Main logic to fetch data and populate the page
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');

    if (!propertyId) {
        document.getElementById('property-details-container').innerHTML = '<p class="text-center">Property not found. Please go back to the list.</p>';
        return;
    }

    try {
        const response = await fetch('data/soko-properties-products.json');
        if (!response.ok) {
            throw new Error('Failed to fetch property data.');
        }
        const properties = await response.json();
        const property = properties.find(p => p.propertyId === propertyId);

        if (property) {
            populatePage(property);
        } else {
            document.getElementById('property-details-container').innerHTML = '<p class="text-center">Property not found. Please check the URL or go back to the list.</p>';
        }

    } catch (error) {
        console.error('Error loading property data:', error);
        document.getElementById('property-details-container').innerHTML = '<p class="text-center">An error occurred while loading the property details. Please try again later.</p>';
    }
});