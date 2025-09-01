/*
    File: js/preferences.js
    Description: Manages the user preferences selection process. This script dynamically
                 loads the preferences module, handles category selection, saves user
                 choices to Local Storage, and controls the display and dismissal
                 of the preference setup interface. It ensures personalized
                 recommendations on the homepage for new and returning users.
*/

import { localStorageUtils } from './localStorageUtils.js';

document.addEventListener('partialsLoaded', async () => {
    const preferenceScreenWrapper = document.getElementById('preference-screen-wrapper');

    let allCategories = [];

    // --- Dynamic Content Generation ---
    async function fetchCategoriesAndIcons() {
        try {
            const [shopsResponse, iconsResponse] = await Promise.all([
                fetch('data/shops.json'),
                fetch('data/preferences-icons.json')
            ]);

            const shopsData = await shopsResponse.json();
            const iconMappings = await iconsResponse.json();

            // Create a unique, alphabetized list of all categories from all shops
            const uniqueCategories = new Set();
            shopsData.forEach(shop => {
                shop.categories.forEach(cat => uniqueCategories.add(cat));
            });

            allCategories = Array.from(uniqueCategories).sort();

            const categoryIcons = new Map(iconMappings.map(item => [item.category, item.icon]));

            const formContent = allCategories.map(cat => {
                const iconClass = categoryIcons.get(cat) || 'fas fa-question-circle'; // Fallback icon
                return `
                    <label class="category-item">
                        <input type="checkbox" name="category" value="${cat}">
                        <span class="category-name"><i class="${iconClass}"></i> ${cat}</span>
                    </label>
                `;
            }).join('');

            return formContent;

        } catch (error) {
            console.error('Error fetching categories or icons:', error);
            return '<p>Error loading categories. Please try again later.</p>';
        }
    }

    async function generatePreferencesHTML() {
        const formContent = await fetchCategoriesAndIcons();
        return `
            <section class="preferences-section card">
                <h2>Personalize Your iMarket Experience</h2>
                <p>Select categories that interest you most to get tailored recommendations on your homepage.</p>
                <form id="preferences-form">
                    <h3>Choose Your Favorite Categories:</h3>
                    <div class="categories-selection-grid">
                        ${formContent}
                    </div>
                    <button type="submit" class="cta-button">Save Preferences & Continue</button>
                    <button type="button" id="skip-preferences-btn" class="button-outline">Skip for now</button>
                </form>
            </section>
        `;
    }

    // --- Event Handlers & State Management ---
    function attachEventListeners() {
        const preferencesForm = document.getElementById('preferences-form');
        const skipButton = document.getElementById('skip-preferences-btn');
        const categoryItems = document.querySelectorAll('.category-item');

        if (preferencesForm) {
            preferencesForm.addEventListener('submit', handleSavePreferences);
        }

        if (skipButton) {
            skipButton.addEventListener('click', handleSkipPreferences);
        }

        // Add click listener to the entire label to toggle the checkbox
        categoryItems.forEach(item => {
            item.addEventListener('click', () => {
                const checkbox = item.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
            });
        });
    }

    function handleSavePreferences(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const selectedCategories = formData.getAll('category');

        const userProfile = localStorageUtils.getUserProfile() || {};
        userProfile.hasSetPreferences = true; // Set this flag to true
        userProfile.preferredCategories = selectedCategories;
        localStorageUtils.saveUserProfile(userProfile);

        console.log('User preferences saved:', selectedCategories);
        dismissPreferencesModule();
    }

    function handleSkipPreferences() {
        const userProfile = localStorageUtils.getUserProfile() || {};
        userProfile.hasSkipped = true; // Set a new 'hasSkipped' flag
        localStorageUtils.saveUserProfile(userProfile);

        console.log('User skipped preferences.');
        dismissPreferencesModule();
    }

    function dismissPreferencesModule() {
        preferenceScreenWrapper.classList.remove('show');
    }

    // --- Initial Check and Load ---
    async function initPreferencesModule() {
        const userProfile = localStorageUtils.getUserProfile();
        const hasSetPreferences = userProfile && userProfile.hasSetPreferences;
        const hasSkipped = userProfile && userProfile.hasSkipped; // Check for the new flag

        // Change the condition to check if the user has neither set preferences nor skipped.
        if (!hasSetPreferences && !hasSkipped) { 
            const preferencesHtml = await generatePreferencesHTML();
            preferenceScreenWrapper.innerHTML = preferencesHtml;
            preferenceScreenWrapper.classList.add('show');
            attachEventListeners();
        } else {
            preferenceScreenWrapper.classList.remove('show');
        }
    }

    initPreferencesModule();
});