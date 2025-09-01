/*
    File: js/utils/localStorageUtils.js
    Description: This utility script provides a set of helper functions for interacting with the browser's
                 localStorage. It simplifies operations such as storing and retrieving user preferences,
                 profile data, and shopping-related information (cart, notifications, wishlist).
                 Each function includes error handling for robust data management.
*/

const localStorageUtils = {

    /**
     * Retrieves the user profile object from localStorage.
     * @returns {object} The user profile, or a default guest object if not found or invalid.
     */
    getUserProfile: () => {
        try {
            const profile = JSON.parse(localStorage.getItem('userProfile'));
            // Return existing profile if valid and logged in, otherwise default guest profile
            if (profile && typeof profile === 'object' && profile.isLoggedIn !== undefined) {
                return profile;
            }
        } catch (error) {
            console.error('Error parsing user profile from localStorage:', error);
        }
        // Default guest profile
        return { isLoggedIn: false, firstName: 'Guest', membershipLevel: 'Bronze' };
    },

    /**
     * Stores the user profile object in localStorage.
     * @param {object} profile - The user profile object to store.
     */
    setUserProfile: (profile) => {
        try {
            localStorage.setItem('userProfile', JSON.stringify(profile));
        } catch (error) {
            console.error('Error storing user profile to localStorage:', error);
        }
    },

    /**
     * Removes the user profile from localStorage (e.g., on logout).
     */
    clearUserProfile: () => {
        try {
            localStorage.removeItem('userProfile');
        } catch (error) {
            console.error('Error clearing user profile from localStorage:', error);
        }
    },

    /**
     * Retrieves the current shopping cart array from localStorage.
     * @returns {Array<object>} An array of cart items, or an empty array if not found or invalid.
     */
    getCart: () => {
        try {
            const cart = JSON.parse(localStorage.getItem('cart'));
            return Array.isArray(cart) ? cart : [];
        } catch (error) {
            console.error('Error parsing cart from localStorage:', error);
            return [];
        }
    },

    /**
     * Stores the shopping cart array in localStorage.
     * @param {Array<object>} cart - The array of cart items to store.
     */
    setCart: (cart) => {
        try {
            localStorage.setItem('cart', JSON.stringify(cart));
        } catch (error) {
            console.error('Error storing cart to localStorage:', error);
        }
    },

    /**
     * Adds an item to the shopping cart in localStorage.
     * @param {object} item - The item object to add to the cart.
     * @returns {boolean} True if the item was added successfully, false otherwise.
     */
    addToCart: (item) => {
        try {
            const cart = localStorageUtils.getCart();
            const existingItemIndex = cart.findIndex(cartItem => cartItem.id === item.id);

            if (existingItemIndex > -1) {
                // If item exists, just increment quantity (or update other properties)
                cart[existingItemIndex].quantity = (cart[existingItemIndex].quantity || 1) + (item.quantity || 1);
            } else {
                // Add new item, ensure it has a quantity property
                cart.push({ ...item, quantity: item.quantity || 1 });
            }
            localStorageUtils.setCart(cart);
            return true;
        } catch (error) {
            console.error('Error adding item to cart:', error);
            return false;
        }
    },

    /**
     * Removes an item from the shopping cart in localStorage by its ID.
     * @param {string} itemId - The ID of the item to remove.
     * @returns {boolean} True if the item was removed, false otherwise.
     */
    removeFromCart: (itemId) => {
        try {
            let cart = localStorageUtils.getCart();
            const initialLength = cart.length;
            cart = cart.filter(item => item.id !== itemId);
            localStorageUtils.setCart(cart);
            return cart.length < initialLength; // Returns true if an item was actually removed
        } catch (error) {
            console.error('Error removing item from cart:', error);
            return false;
        }
    },

    /**
     * Retrieves the current notifications array from localStorage.
     * @returns {Array<object>} An array of notification objects, or an empty array.
     */
    getNotifications: () => {
        try {
            const notifications = JSON.parse(localStorage.getItem('notifications'));
            return Array.isArray(notifications) ? notifications : [];
        } catch (error) {
            console.error('Error parsing notifications from localStorage:', error);
            return [];
        }
    },

    /**
     * Stores the notifications array in localStorage.
     * @param {Array<object>} notifications - The array of notification objects to store.
     */
    setNotifications: (notifications) => {
        try {
            localStorage.setItem('notifications', JSON.stringify(notifications));
        } catch (error) {
            console.error('Error storing notifications to localStorage:', error);
        }
    },

    /**
     * Adds a new notification to localStorage.
     * @param {object} notification - The notification object to add.
     * @returns {boolean} True if added successfully, false otherwise.
     */
    addNotification: (notification) => {
        try {
            const notifications = localStorageUtils.getNotifications();
            // Ensure unique ID or handle duplicates if necessary
            notifications.push({ ...notification, id: notification.id || Date.now() });
            localStorageUtils.setNotifications(notifications);
            return true;
        } catch (error) {
            console.error('Error adding notification:', error);
            return false;
        }
    },

    /**
     * Retrieves the current wishlist array from localStorage.
     * @returns {Array<object>} An array of wishlist items, or an empty array.
     */
    getWishlist: () => {
        try {
            const wishlist = JSON.parse(localStorage.getItem('wishlist'));
            return Array.isArray(wishlist) ? wishlist : [];
        } catch (error) {
            console.error('Error parsing wishlist from localStorage:', error);
            return [];
        }
    },

    /**
     * Stores the wishlist array in localStorage.
     * @param {Array<object>} wishlist - The array of wishlist items to store.
     */
    setWishlist: (wishlist) => {
        try {
            localStorage.setItem('wishlist', JSON.stringify(wishlist));
        } catch (error) {
            console.error('Error storing wishlist to localStorage:', error);
        }
    },

    /**
     * Adds an item to the wishlist in localStorage.
     * @param {object} item - The item object to add to the wishlist.
     * @returns {boolean} True if added successfully, false otherwise.
     */
    addToWishlist: (item) => {
        try {
            const wishlist = localStorageUtils.getWishlist();
            // Prevent adding duplicates
            if (!wishlist.some(wishlistItem => wishlistItem.id === item.id)) {
                wishlist.push(item);
                localStorageUtils.setWishlist(wishlist);
                return true;
            }
            return false; // Item already in wishlist
        } catch (error) {
            console.error('Error adding item to wishlist:', error);
            return false;
        }
    },

    /**
     * Removes an item from the wishlist in localStorage by its ID.
     * @param {string} itemId - The ID of the item to remove.
     * @returns {boolean} True if removed successfully, false otherwise.
     */
    removeFromWishlist: (itemId) => {
        try {
            let wishlist = localStorageUtils.getWishlist();
            const initialLength = wishlist.length;
            wishlist = wishlist.filter(item => item.id !== itemId);
            localStorageUtils.setWishlist(wishlist);
            return wishlist.length < initialLength;
        } catch (error) {
            console.error('Error removing item from wishlist:', error);
            return false;
        }
    },

    /**
     * Retrieves the theme preference ('light' or 'dark') from localStorage.
     * @returns {string} The stored theme, defaults to 'light'.
     */
    getThemePreference: () => {
        try {
            return localStorage.getItem('themePreference') || 'light';
        } catch (error) {
            console.error('Error getting theme preference from localStorage:', error);
            return 'light';
        }
    },

    /**
     * Stores the theme preference ('light' or 'dark') in localStorage.
     * @param {string} theme - The theme to store ('light' or 'dark').
     */
    setThemePreference: (theme) => {
        try {
            if (theme === 'light' || theme === 'dark') {
                localStorage.setItem('themePreference', theme);
            } else {
                console.warn('Invalid theme preference provided. Must be "light" or "dark".');
            }
        } catch (error) {
            console.error('Error setting theme preference to localStorage:', error);
        }
    }
};

// Export the utility object (for module systems, otherwise accessible globally if script is not module type)
// This line assumes you might be using ES Modules. If not, the functions would be accessible via the global `localStorageUtils` object.
// export default localStorageUtils;