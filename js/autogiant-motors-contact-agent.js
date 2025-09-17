// js/autogiant-motors-contact-agent.js

document.addEventListener('DOMContentLoaded', () => {

    const formDescriptionEl = document.getElementById('form-description');
    const formMessageEl = document.getElementById('contact-form-message');
    const contactForm = document.getElementById('contact-form');
    const backToDetailsLink = document.getElementById('back-to-details-link');
    const pageTitle = document.querySelector('title');
    const breadcrumbProductName = document.querySelector('.breadcrumb .breadcrumb-item:nth-child(2)');

    // Function to get URL parameters
    function getUrlParameter(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        const results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    // Get product and agent details from the URL
    const carMake = getUrlParameter('carMake');
    const carModel = getUrlParameter('carModel');
    const carYear = getUrlParameter('carYear');
    const agentName = getUrlParameter('agentName');
    const agentPhone = getUrlParameter('agentPhone');

    // Display the details on the page
    if (carMake && carModel && carYear && agentName && agentPhone) {
        const vehicleInfo = `${carMake} ${carModel} (${carYear})`;
        
        // Update the page title and description
        pageTitle.textContent = `Contact for ${vehicleInfo} | AutoGiant Motors`;
        formDescriptionEl.innerHTML = `Please fill out the form below to inquire about ${vehicleInfo}.
        <br>You are contacting ${agentName}. (${agentPhone})`;
        
        // Set the "back" link
        backToDetailsLink.textContent = `Back to Vehicle Details`;
        backToDetailsLink.href = `autogiant-motors-product-details.html?id=${encodeURIComponent(carModel)}`;
        breadcrumbProductName.textContent = `${carMake} ${carModel}`;

    } else {
        formDescriptionEl.textContent = 'Please return to the product page to select a vehicle.';
        contactForm.style.display = 'none'; // Hide the form if no data is present
    }

    // Handle form submission
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Simulate form submission
        setTimeout(() => {
            // Show success message
            formMessageEl.textContent = 'Your inquiry has been sent successfully! The agent will contact you shortly.';
            formMessageEl.classList.add('success');
            formMessageEl.style.display = 'block';
            
            // Optionally, clear the form
            contactForm.reset();
        }, 500);
    });
});