// js/footer.js

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Load footer.html into the DOM
    const footerContainer = document.getElementById('main-footer-placeholder');
    if (footerContainer) {
        try {
            const response = await fetch('partials/footer.html');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const footerHtml = await response.text();
            footerContainer.innerHTML = footerHtml;
            console.log('Footer loaded successfully.');

            // Call init function AFTER footer content is loaded
            initializeFooterFeatures();

        } catch (error) {
            console.error('Failed to load footer:', error);
            // Fallback for missing footer
            footerContainer.innerHTML = '<p class="text-center">Error loading footer. Please try again later.</p>';
        }
    } else {
        console.warn('Footer placeholder element #main-footer-placeholder not found in the DOM.');
        // If footer is directly in index.html, initialize features directly
        initializeFooterFeatures();
    }
});


function initializeFooterFeatures() {
    // 2. Dynamic Date Updates
    const copyrightYearSpan = document.getElementById('copyright-year');
    const lastModifiedSpan = document.getElementById('last-modified');

    // Set current year for copyright
    if (copyrightYearSpan) {
        copyrightYearSpan.textContent = new Date().getFullYear();
    } else {
        console.warn('Copyright year span element #copyright-year not found.');
    }

    // Set last modified date of the document
    if (lastModifiedSpan) {
        // document.lastModified returns a string like "MM/DD/YYYY hh:mm:ss"
        // We want to format it nicely.
        const lastModDate = new Date(document.lastModified);

        // Options for date formatting
        const options = {
            year: 'numeric',
            month: 'long', // e.g., "July"
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false // 24-hour format
        };
        const formattedDate = lastModDate.toLocaleDateString('en-US', options);

        lastModifiedSpan.textContent = formattedDate;
    } else {
        console.warn('Last modified span element #last-modified not found.');
    }
}