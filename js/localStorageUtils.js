const localStorageUtils = {
  // === Generic ===
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      console.warn(`Failed to parse localStorage key: ${key}`, e);
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn(`Failed to set localStorage key: ${key}`, e);
    }
  },

  remove(key) {
    localStorage.removeItem(key);
  },

  exists(key) {
    return localStorage.getItem(key) !== null;
  },

  // === Profile ===
  getUserProfile() {
    return this.get("iMarketUserProfile");
  },

  saveUserProfile(profileObj) {
    this.set("iMarketUserProfile", profileObj);
  },

  isGuestUser() {
    const profile = this.getUserProfile();
    return !profile || profile.name === "Guest User";
  },

  // === Cart ===
  getCart() {
    return this.get("iMarketCart") || [];
  },

  updateCart(cartArray) {
    this.set("iMarketCart", cartArray);
  },

  clearCart() {
    this.remove("iMarketCart");
  },

  // === Wishlist ===
  getWishlist() {
    return this.get("iMarketUserWishlist") || [];
  },

  updateWishlist(wishlistArray) {
    this.set("iMarketUserWishlist", wishlistArray);
  },

  // === Notifications ===
  getNotifications() {
    return this.get("iMarketUserNotifications") || [];
  },

  addNotification(notificationObj) {
    const current = this.getNotifications();
    current.push(notificationObj);
    this.set("iMarketUserNotifications", current);
  },

  markAllNotificationsRead() {
    const notifications = this.getNotifications().map(n => ({ ...n, read: true }));
    this.set("iMarketUserNotifications", notifications);
  },

  // === Orders ===
  getOrders() {
    return this.get("iMarketUserOrders") || [];
  },

  addOrder(orderObj) {
    const current = this.getOrders();
    current.push(orderObj);
    this.set("iMarketUserOrders", current);
  },

  // === Activities ===
  getActivities() {
    return this.get("iMarketUserActivities") || [];
  },

  logActivity(activityObj) {
    const current = this.getActivities();
    current.push(activityObj);
    this.set("iMarketUserActivities", current);
  },

  // === Coupons ===
  getCoupons() {
    return this.get("iMarketUserCoupons") || [];
  },

  addCoupon(couponObj) {
    const current = this.getCoupons();
    current.push(couponObj);
    this.set("iMarketUserCoupons", current);
  },

  // === Spin Wins ===
  setSpinWin(shopName) {
    this.set("iMarketWonShopForSpin", shopName);
  },

  getSpinWin() {
    return this.get("iMarketWonShopForSpin");
  },

  // === Reviews ===
  getProductReviews() {
    return this.get("iMarketProductReviews") || [];
  },

  addProductReview(reviewObj) {
    const current = this.getProductReviews();
    current.push(reviewObj);
    this.set("iMarketProductReviews", current);
  }
};
