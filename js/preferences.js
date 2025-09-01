/*
    File: js/preferences.js
    Description: Manages the user preferences selection process. This script dynamically
                 loads the preferences module, handles category selection, saves user
                 choices to Local Storage, and controls the display and dismissal
                 of the preference setup interface. It ensures personalized
                 recommendations on the homepage for new and returning users.
*/

document.addEventListener('DOMContentLoaded', () => {
    const preferenceScreenWrapper = document.getElementById('preference-screen-wrapper');

    // Function to load the preferences HTML partial
    async function loadPreferencesModule() {
        try {
            const response = await fetch('partials/preferences.html');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const html = await response.text();
            preferenceScreenWrapper.innerHTML = html;
            preferenceScreenWrapper.style.display = 'block'; // Show the wrapper

            // Attach event listeners after the content is loaded
            attachPreferencesEventListeners();
        } catch (error) {
            console.error('Error loading preferences module:', error);
            preferenceScreenWrapper.style.display = 'none'; // Hide if loading fails
        }
    }

    // Function to attach event listeners to the loaded preferences module
    function attachPreferencesEventListeners() {
        const preferencesForm = document.getElementById('preferences-form');
        const skipPreferencesBtn = document.getElementById('skip-preferences-btn');

        if (preferencesForm) {
            preferencesForm.addEventListener('submit', handlePreferencesSubmit);
        }

        if (skipPreferencesBtn) {
            skipPreferencesBtn.addEventListener('click', handleSkipPreferences);
        }

        // Add event listeners for the custom checkbox styling
        const categoryItems = document.querySelectorAll('.category-item');
        categoryItems.forEach(item => {
            item.addEventListener('click', () => {
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked; // Toggle checkbox state
                    // No need to manually toggle classes, CSS :checked handles it
                }
            });
        });
    }

    // Function to handle form submission
    function handlePreferencesSubmit(event) {
        event.preventDefault(); // Prevent default form submission

        const selectedCategories = [];
        const checkboxes = preferencesForm.querySelectorAll('input[name="category"]:checked');
        checkboxes.forEach(checkbox => {
            selectedCategories.push(checkbox.value);
        });

        // Save preferences and a flag indicating preferences have been set
        localStorageUtils.saveData('userPreferences', selectedCategories);
        localStorageUtils.saveData('hasSetPreferences', true);

        console.log('User preferences saved:', selectedCategories);
        dismissPreferencesModule();
        // Optionally, trigger a refresh of the recommended section on the homepage
        // For now, we'll just dismiss. The index.js might re-render on load.
    }

    // Function to handle skipping preferences
    function handleSkipPreferences() {
        // Set a flag that preferences were acknowledged (skipped)
        localStorageUtils.saveData('hasSetPreferences', true);
        localStorageUtils.saveData('userSkippedPreferences', true); // Optional: track if skipped
        console.log('User skipped preferences.');
        dismissPreferencesModule();
    }

    // Function to dismiss the preferences module
    function dismissPreferencesModule() {
        preferenceScreenWrapper.innerHTML = ''; // Clear content
        preferenceScreenWrapper.style.display = 'none'; // Hide the wrapper
        // If the main page relies on preferences to render, you might want to call
        // a function from index.js here to re-render the recommended section.
        // For example: if (typeof renderRecommendedProducts === 'function') renderRecommendedProducts();
    }

    // --- Initial Check and Load ---
    // Check if the user has already set preferences or skipped them
    const hasSetPreferences = localStorageUtils.getData('hasSetPreferences');

    if (!hasSetPreferences) {
        // If preferences haven't been set or skipped, load the module
        loadPreferencesModule();
    } else {
        // Otherwise, ensure the wrapper is hidden
        preferenceScreenWrapper.style.display = 'none';
    }
});