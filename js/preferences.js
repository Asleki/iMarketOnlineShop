/*
    File: js/preferences.js
    Description: Manages the user preferences selection process. This script dynamically
                 loads the preferences module, handles category selection, saves user
                 choices to Local Storage, and controls the display and dismissal
                 of the preference setup interface. It ensures personalized
                 recommendations on the homepage for new and returning users.
*/

document.addEventListener('DOMContentLoaded', () => {
    // Import the localStorageUtils module
    // The 'localStorageUtils' object must be available globally or imported here.
    // If you are using ES6 modules, uncomment the line below.
    // import { localStorageUtils } from './localStorageUtils.js';

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

            // After loading, check for existing preferences and attach listeners
            checkAndPopulatePreferences();
            attachPreferencesEventListeners();
        } catch (error) {
            console.error('Error loading preferences module:', error);
            preferenceScreenWrapper.style.display = 'none'; // Hide if loading fails
        }
    }

    // Function to check for and populate user preferences
    function checkAndPopulatePreferences() {
        const userProfile = localStorageUtils.getUserProfile();
        if (userProfile && userProfile.favoriteCategories) {
            const savedCategories = userProfile.favoriteCategories;
            const checkboxes = document.querySelectorAll('input[name="category"]');
            checkboxes.forEach(checkbox => {
                if (savedCategories.includes(checkbox.value)) {
                    checkbox.checked = true;
                }
            });
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
            item.addEventListener('click', (e) => {
                // Prevent bubbling to avoid double-toggling
                if (e.target.tagName.toLowerCase() === 'input') return;
                const checkbox = item.querySelector('input[type="checkbox"]');
                if (checkbox) {
                    checkbox.checked = !checkbox.checked; // Toggle checkbox state
                }
            });
        });
    }

    // Function to handle form submission
    function handlePreferencesSubmit(event) {
        event.preventDefault(); // Prevent default form submission

        const selectedCategories = [];
        const checkboxes = document.querySelectorAll('input[name="category"]:checked');
        checkboxes.forEach(checkbox => {
            selectedCategories.push(checkbox.value);
        });

        // Update the user profile with the selected categories
        const userProfile = localStorageUtils.getUserProfile() || {};
        userProfile.favoriteCategories = selectedCategories;
        userProfile.hasSetPreferences = true; // Set a flag that preferences have been set
        localStorageUtils.saveUserProfile(userProfile);

        console.log('User preferences saved:', selectedCategories);
        dismissPreferencesModule();
    }

    // Function to handle skipping preferences
    function handleSkipPreferences() {
        // Set a flag that preferences were acknowledged (skipped)
        const userProfile = localStorageUtils.getUserProfile() || {};
        userProfile.hasSetPreferences = true;
        userProfile.hasSkippedPreferences = true; // Optional: track if skipped
        localStorageUtils.saveUserProfile(userProfile);
        
        console.log('User skipped preferences.');
        dismissPreferencesModule();
    }

    // Function to dismiss the preferences module
    function dismissPreferencesModule() {
        preferenceScreenWrapper.innerHTML = ''; // Clear content
        preferenceScreenWrapper.style.display = 'none'; // Hide the wrapper
        // Note: index.js is responsible for rendering the homepage content based on these settings.
    }

    // --- Initial Check and Load ---
    const userProfile = localStorageUtils.getUserProfile();
    const hasSetPreferences = userProfile && userProfile.hasSetPreferences;

    if (!hasSetPreferences) {
        // If preferences haven't been set or skipped, load the module
        loadPreferencesModule();
    } else {
        // Otherwise, ensure the wrapper is hidden
        preferenceScreenWrapper.style.display = 'none';
    }
});