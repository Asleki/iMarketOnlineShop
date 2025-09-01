/**
 * header-footer-loader.js
 * This script dynamically loads and inserts header and footer partials
 * into the main document.
 */
document.addEventListener('DOMContentLoaded', () => {
    const headerPlaceholder = document.getElementById('main-header-placeholder');
    const footerPlaceholder = document.getElementById('main-footer-placeholder');

    const fetchAndInsert = async (placeholder, filePath) => {
        if (placeholder) {
            try {
                const response = await fetch(filePath);
                if (!response.ok) {
                    throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
                }
                const html = await response.text();
                placeholder.innerHTML = html;
            } catch (error) {
                console.error(`Error loading ${filePath}:`, error);
                placeholder.innerHTML = `<p class="text-center">Error loading ${filePath}.</p>`;
            }
        }
    };

    // Load both header and footer concurrently
    Promise.all([
        fetchAndInsert(headerPlaceholder, 'partials/header.html'),
        fetchAndInsert(footerPlaceholder, 'partials/footer.html')
    ]).finally(() => {
        // After all partials have been processed, fire a custom event
        const event = new Event('partialsLoaded');
        document.dispatchEvent(event);
    });
});

document.addEventListener('partialsLoaded', () => {
    // This event listener is intentionally left empty in this file.
    // The actual header functionality is now handled by a separate
    // script, like 'js/header.js', which listens for this event.
});