/* ======================== */
/* DEVELOPER PAGE SCRIPT - developer.js */
/* ======================== */

// Ensure this script runs after the partials have been loaded
document.addEventListener('partialsLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('id');

    // Determine which page we are on and call the appropriate function
    if (window.location.pathname.includes('dev-project-detail.html') && projectId) {
        loadProjectDetails(projectId);
    } else if (window.location.pathname.includes('dev-projects.html')) {
        loadAllProjects();
    } else {
        // This is for developer.html
        loadRecentProjects();
    }
});

/**
 * Fetches the JSON data for all projects.
 * @returns {Promise<Array|null>} A promise that resolves with the projects array or null on error.
 */
async function fetchProjects() {
    try {
        const response = await fetch('data/dev-projects.json');
        if (!response.ok) {
            throw new Error('Failed to fetch project data.');
        }
        const projects = await response.json();
        return projects;
    } catch (error) {
        console.error('Error fetching projects:', error);
        return null;
    }
}

/**
 * Loads and displays the three most recent projects on the main developer page.
 */
async function loadRecentProjects() {
    const container = document.getElementById('projects-container');
    if (!container) return; // Exit if the container element is not found

    const loadingState = container.querySelector('.loading-state');
    const errorState = container.querySelector('.error-state');

    const projects = await fetchProjects();
    
    if (projects) {
        // Sort projects by date in descending order to get the most recent ones
        const sortedProjects = projects.sort((a, b) => {
            const dateA = new Date(a.finish_date === 'In Progress' ? a.start_date : a.finish_date);
            const dateB = new Date(b.finish_date === 'In Progress' ? b.start_date : b.finish_date);
            return dateB - dateA;
        });
        
        const recentProjects = sortedProjects.slice(0, 3);
        
        container.innerHTML = recentProjects.map(project => `
            <a href="dev-project-detail.html?id=${project.id}" class="project-card">
                <img src="${project.image}" alt="${project.name} Project Thumbnail">
                <div class="project-card-info">
                    <h4>${project.name}</h4>
                    <p>${project.description.substring(0, 100)}...</p>
                    <span class="view-details">View Details &rarr;</span>
                </div>
            </a>
        `).join('');
    } else {
        if (errorState) errorState.classList.remove('hidden');
    }
    if (loadingState) loadingState.classList.add('hidden');
}

/**
 * Loads and displays all projects on the dedicated projects page.
 */
async function loadAllProjects() {
    const container = document.getElementById('projects-container');
    if (!container) return; // Exit if the container element is not found

    const loadingState = container.querySelector('.loading-state');
    const errorState = container.querySelector('.error-state');

    const projects = await fetchProjects();
    
    if (projects) {
        container.innerHTML = projects.map(project => `
            <a href="dev-project-detail.html?id=${project.id}" class="project-card">
                <img src="${project.image}" alt="${project.name} Project Thumbnail">
                <div class="project-card-info">
                    <h4>${project.name}</h4>
                    <p>${project.description.substring(0, 150)}...</p>
                    <div class="project-skills">
                        ${project.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                    </div>
                    <span class="view-details">View Details &rarr;</span>
                </div>
            </a>
        `).join('');
    } else {
        if (errorState) errorState.classList.remove('hidden');
    }
    if (loadingState) loadingState.classList.add('hidden');
}

/**
 * Loads and displays the details for a single project based on its ID.
 * @param {string} projectId The unique ID of the project to display.
 */
async function loadProjectDetails(projectId) {
    const container = document.getElementById('project-details-container');
    if (!container) return; // Exit if the container element is not found

    const loadingState = container.querySelector('.loading-state');
    const errorState = container.querySelector('.error-state');

    const projects = await fetchProjects();

    if (projects) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            container.innerHTML = `
                <div class="project-detail-content">
                    <div class="project-header">
                        <img src="${project.image}" alt="Image for ${project.name}" class="project-image-full">
                        <div class="project-header-info">
                            <h1>${project.name}</h1>
                            <div class="project-meta">
                                <p><strong>Dates:</strong> ${project.start_date} - ${project.finish_date}</p>
                                <p><strong>Skills Used:</strong> ${project.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}</p>
                                ${project.github_link ? `<a href="${project.github_link}" class="github-link" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-github"></i> View on GitHub</a>` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="project-description-block">
                        <p>${project.description}</p>
                    </div>
                    ${project.features ? `
                        <div class="project-features-block">
                            <h2>Key Features</h2>
                            <ul>
                                ${project.features.map(feature => `<li><i class="fa fa-check-circle"></i> ${feature}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            `;
        } else {
            if (errorState) {
                errorState.textContent = 'Project not found.';
                errorState.classList.remove('hidden');
            }
        }
    } else {
        if (errorState) errorState.classList.remove('hidden');
    }
    if (loadingState) loadingState.classList.add('hidden');
}