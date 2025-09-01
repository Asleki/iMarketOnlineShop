// js/soko-properties-contact.js

document.addEventListener('partialsLoaded', async () => {
    async function loadShopContactInfo() {
        const phonePlaceholder = document.getElementById('contact-phone');
        const emailPlaceholder = document.getElementById('contact-email');
        const addressPlaceholder = document.getElementById('contact-address');

        try {
            const response = await fetch('data/shops.json');
            if (!response.ok) {
                throw new Error('Failed to fetch shops data.');
            }
            const shops = await response.json();

            // Find the Soko Properties shop data
            const sokoProperties = shops.find(shop => shop.shop_id === 'soko_properties');

            if (sokoProperties && sokoProperties.contact_info) {
                const contactInfo = sokoProperties.contact_info;

                // Populate the HTML elements with the fetched data
                if (phonePlaceholder) {
                    phonePlaceholder.textContent = contactInfo.phone;
                }
                if (emailPlaceholder) {
                    emailPlaceholder.textContent = contactInfo.email;
                    emailPlaceholder.href = `mailto:${contactInfo.email}`;
                }
                if (addressPlaceholder) {
                    addressPlaceholder.textContent = contactInfo.address;
                }
            } else {
                console.error('Soko Properties contact info not found in shops.json');
                if (phonePlaceholder) phonePlaceholder.textContent = 'Data not available';
                if (emailPlaceholder) emailPlaceholder.textContent = 'Data not available';
                if (addressPlaceholder) addressPlaceholder.textContent = 'Data not available';
            }
        } catch (error) {
            console.error('Error loading shop data:', error);
            const contactInfoContainer = document.querySelector('.contact-info');
            if(contactInfoContainer) contactInfoContainer.innerHTML = '<p class="text-center">An error occurred while loading contact details. Please try again later.</p>';
        }
    }

    loadShopContactInfo();
});