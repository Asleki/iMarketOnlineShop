// js/nashaa-kicks-contact.js

document.addEventListener('DOMContentLoaded', async () => {

    // Function to fetch shop data from the provided array
    async function fetchShopData() {
        // Since the data is an array, we'll just use it directly
        const shopData = {
            "shop_id": "nashaa_kicks",
            "name": "Nashaa Kicks",
            "description": "Step into style and comfort with our wide range of footwear for men and women.",
            "logo_url": "https://placehold.co/150x75/D0F0E6/000000?text=Nashaa+Kicks+Logo",
            "categories": [
                "Men's Shoes",
                "Women's Shoes",
                "Sneakers",
                "Flats"
            ],
            "contact_info": {
                "email": "support@nashaakicks.com",
                "phone": "+254766778899",
                "address": "Kilimani, Nairobi"
            },
            "product_data_file": "nashaa-kicks.json",
            "shopPageUrl": "nashaa-kicks-index.html"
        };
        return shopData;
    }

    async function loadContactInfo() {
        try {
            const data = await fetchShopData();
            const contactInfo = data.contact_info;

            if (contactInfo) {
                document.getElementById('contact-email').textContent = contactInfo.email;
                document.getElementById('contact-email').href = `mailto:${contactInfo.email}`;
                document.getElementById('contact-phone').textContent = contactInfo.phone;
                document.getElementById('contact-phone').href = `tel:${contactInfo.phone}`;
                document.getElementById('contact-address').textContent = contactInfo.address;
            }

        } catch (error) {
            console.error('Failed to load contact information:', error);
        }
    }

    loadContactInfo();
});