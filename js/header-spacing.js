// File: js/header-spacing.js
document.addEventListener('partialsLoaded', () => {
    const mainContent = document.getElementById('main-content');
    const header = document.getElementById('main-header-placeholder');

    function adjustMainContentPadding() {
        if (header && mainContent) {
            const headerHeight = header.offsetHeight;
            mainContent.style.paddingTop = `${headerHeight}px`;
        }
    }

    // Call on initial load and whenever the window is resized
    adjustMainContentPadding();
    window.addEventListener('resize', adjustMainContentPadding);
});