document.addEventListener('DOMContentLoaded', () => {
    // Function to fetch and render team members
    const fetchTeam = async () => {
        try {
            const response = await fetch('data/team.json');
            const team = await response.json();
            const container = document.getElementById('team-members-container');
            if (container) {
                container.innerHTML = team.map(member => `
                    <div class="team-card">
                        <img src="${member.image}" alt="Photo of ${member.name}">
                        <h3>${member.name}</h3>
                        <p class="role">${member.role}</p>
                        <p class="quote">"${member.quote}"</p>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error fetching team members:', error);
        }
    };
    // Function to fetch and render reviews
    const fetchReviews = async () => {
        try {
            const response = await fetch('data/reviews.json');
            const reviews = await response.json();
            const container = document.getElementById('reviews-container');
            if (container) {
                container.innerHTML = reviews.map(review => `
                    <div class="review-card">
                        <div class="review-header">
                            <img src="${review.author_image}" alt="Review author photo">
                            <div class="author-info">
                                <h4>${review.author}</h4>
                                <p class="review-date">${review.date}</p>
                            </div>
                        </div>
                        <div class="star-rating">
                            ${'<i class="fas fa-star"></i>'.repeat(review.star_rating)}
                            ${'<i class="far fa-star"></i>'.repeat(5 - review.star_rating)}
                        </div>
                        <p class="review-text">${review.review_text}</p>
                        <div class="review-footer">
                            <span class="review-likes"><i class="fas fa-thumbs-up"></i> ${review.likes} Likes</span>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
        }
    };
    // Function to fetch and display featured shops (from shops.json)
    const fetchShops = async () => {
        try {
            const response = await fetch('data/shops.json');
            const shops = await response.json();
            const shopsContainer = document.getElementById('shops-container');
            if (shopsContainer) {
                // Logic to display shops if you add a new section for it
            }
        } catch (error) {
            console.error('Error fetching shops:', error);
        }
    };
    // Function to fetch and use preferences icons (from data/preferences-icons.json)
    const fetchPreferencesIcons = async () => {
        try {
            const response = await fetch('data/preferences-icons.json');
            const icons = await response.json();
            // Logic to use the icons, e.g., to build the preferences screen
        } catch (error) {
            console.error('Error fetching preferences icons:', error);
        }
    };
    fetchTeam();
    fetchReviews();
});