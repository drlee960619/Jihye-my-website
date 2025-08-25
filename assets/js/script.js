document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            navMenu.classList.toggle('active');
            
            // Prevent body scroll when menu is open
            if (navMenu.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.main-nav')) {
            navMenu?.classList.remove('active');
        }
    });

    // Search form handler
    const searchForm = document.querySelector('.search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            const searchInput = this.querySelector('.search-input');
            if (!searchInput.value.trim()) {
                e.preventDefault();
                searchInput.focus();
            }
        });
    }

    // News Accordion functionality will be handled after dynamic loading

    // Load recent news from JSON
    async function loadRecentNews() {
        try {
            const response = await fetch('news.json');
            const data = await response.json();
            const recentNews = data.news
                .sort((a, b) => new Date(b.createAt) - new Date(a.createAt))
                .slice(0, 10); // Show more items for year grouping
            
            displayRecentNewsByYear(recentNews);
        } catch (error) {
            console.error('Error loading recent news:', error);
        }
    }

    function displayRecentNewsByYear(newsItems) {
        const newsAccordion = document.getElementById('newsAccordion');
        if (!newsAccordion) return;

        // Group news by year
        const newsByYear = {};
        newsItems.forEach(item => {
            const year = new Date(item.createAt).getFullYear();
            if (!newsByYear[year]) {
                newsByYear[year] = [];
            }
            newsByYear[year].push(item);
        });

        // Sort years in descending order
        const sortedYears = Object.keys(newsByYear).sort((a, b) => b - a);
        
        // Generate HTML for each year section
        newsAccordion.innerHTML = sortedYears.map((year, index) => `
            <div class="year-section">
                <button class="year-header ${index === 0 ? 'active' : ''}" data-year="${year}">
                    <span class="year-title">${year}</span>
                    <i class="fas fa-chevron-down arrow"></i>
                </button>
                <div class="year-content ${index === 0 ? 'show' : ''}">
                    ${newsByYear[year].map(item => `
                        <div class="news-item">
                            <span class="news-date">${formatDateShort(item.createAt)}</span>
                            <h3><a href="${item.pageUrl}" target="_blank">${item.name}</a></h3>
                            <p>${item.description}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        // Re-attach event listeners for accordion functionality
        attachAccordionListeners();
    }

    function attachAccordionListeners() {
        const yearHeaders = document.querySelectorAll('.year-header');
        yearHeaders.forEach(header => {
            header.addEventListener('click', function() {
                const yearContent = this.nextElementSibling;
                const isActive = this.classList.contains('active');
                
                // Close all other accordions
                yearHeaders.forEach(otherHeader => {
                    if (otherHeader !== this) {
                        otherHeader.classList.remove('active');
                        otherHeader.nextElementSibling.classList.remove('show');
                    }
                });
                
                // Toggle current accordion
                this.classList.toggle('active');
                yearContent.classList.toggle('show');
            });
        });
    }

    function formatDateShort(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).replace(/\//g, '.');
    }

    // Initialize
    loadRecentNews();
});