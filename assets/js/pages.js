document.addEventListener('DOMContentLoaded', function() {
    // ===========================
    // CV Page Functionality - PDF.js Implementation
    // ===========================
    
    // PDF Controls 
    const prevPageBtn = document.getElementById('prevPage');
    const nextPageBtn = document.getElementById('nextPage');
    const zoomInBtn = document.getElementById('zoomIn');
    const zoomOutBtn = document.getElementById('zoomOut');
    const pageInfo = document.getElementById('pageInfo');
    const pdfCanvas = document.getElementById('pdf-canvas');
    const pdfLoading = document.getElementById('pdf-loading');
    
    if (prevPageBtn && pdfCanvas && window.pdfjsLib) {
        let pdfDoc = null;
        let pageNum = 1;
        let pageRendering = false;
        let pageNumPending = null;
        let scale = 1.0;
        let canvas = pdfCanvas;
        let ctx = canvas.getContext('2d');
        
        // Set worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        // Render a page
        function renderPage(num) {
            pageRendering = true;
            
            // Get page
            pdfDoc.getPage(num).then(function(page) {
                // Calculate scale based on container width
                const containerWidth = pdfCanvas.parentElement.clientWidth - 40; // padding
                const viewport = page.getViewport({scale: 1.0});
                const desiredWidth = Math.min(containerWidth, viewport.width);
                scale = desiredWidth / viewport.width;
                
                // Adjust for mobile
                if (window.innerWidth <= 768) {
                    scale = Math.min(scale, 0.8);
                }
                
                const scaledViewport = page.getViewport({scale: scale});
                
                // Prepare canvas using PDF page dimensions
                canvas.height = scaledViewport.height;
                canvas.width = scaledViewport.width;
                
                // Render PDF page into canvas context
                const renderContext = {
                    canvasContext: ctx,
                    viewport: scaledViewport
                };
                
                const renderTask = page.render(renderContext);
                
                // Wait for rendering to finish
                renderTask.promise.then(function() {
                    pageRendering = false;
                    if (pageNumPending !== null) {
                        // New page rendering is pending
                        renderPage(pageNumPending);
                        pageNumPending = null;
                    }
                    // Hide loading indicator
                    if (pdfLoading) {
                        pdfLoading.style.display = 'none';
                    }
                });
            });
            
            // Update page info
            if (pageInfo) {
                pageInfo.textContent = `Page ${num} of ${pdfDoc.numPages}`;
            }
            
            // Update button states
            updateButtonStates();
        }
        
        // Queue rendering
        function queueRenderPage(num) {
            if (pageRendering) {
                pageNumPending = num;
            } else {
                renderPage(num);
            }
        }
        
        // Update button states
        function updateButtonStates() {
            if (prevPageBtn) {
                prevPageBtn.disabled = pageNum <= 1;
                prevPageBtn.style.opacity = pageNum <= 1 ? '0.3' : '1';
            }
            if (nextPageBtn) {
                nextPageBtn.disabled = pageNum >= pdfDoc.numPages;
                nextPageBtn.style.opacity = pageNum >= pdfDoc.numPages ? '0.3' : '1';
            }
        }
        
        // Go to previous page
        function onPrevPage() {
            if (pageNum <= 1) {
                return;
            }
            pageNum--;
            queueRenderPage(pageNum);
        }
        
        // Go to next page
        function onNextPage() {
            if (pageNum >= pdfDoc.numPages) {
                return;
            }
            pageNum++;
            queueRenderPage(pageNum);
        }
        
        // Zoom functions
        function zoomIn() {
            scale *= 1.2;
            queueRenderPage(pageNum);
        }
        
        function zoomOut() {
            scale *= 0.8;
            queueRenderPage(pageNum);
        }
        
        // Handle resize
        function handleResize() {
            if (pdfDoc) {
                queueRenderPage(pageNum);
            }
        }
        
        // Event listeners
        prevPageBtn.addEventListener('click', onPrevPage);
        nextPageBtn.addEventListener('click', onNextPage);
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', zoomIn);
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', zoomOut);
        }
        
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', () => {
            setTimeout(handleResize, 500);
        });
        
        // Load PDF
        const url = 'assets/cv/CV.pdf';
        
        pdfjsLib.getDocument(url).promise.then(function(pdfDoc_) {
            pdfDoc = pdfDoc_;
            
            console.log(`PDF loaded with ${pdfDoc.numPages} pages`);
            
            // Initial page render
            renderPage(pageNum);
            
        }).catch(function(error) {
            console.error('Error loading PDF:', error);
            if (pdfLoading) {
                pdfLoading.textContent = 'Error loading PDF';
            }
        });
    }
    
    // ===========================
    // Research Page Functionality
    // ===========================
    
    // Publications Filter
    const filterButtons = document.querySelectorAll('.filter-btn');
    const publicationItems = document.querySelectorAll('.publication-item');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.dataset.filter;
            
            // Update active button
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Filter publications
            publicationItems.forEach(item => {
                if (filter === 'all' || item.dataset.type === filter) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
    
    // ===========================
    // Teaching Page Functionality
    // ===========================
    
    // Past Courses Accordion
    const accordionHeaders = document.querySelectorAll('.accordion-header');
    
    accordionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const content = this.nextElementSibling;
            const isActive = this.classList.contains('active');
            
            // Close all accordions
            accordionHeaders.forEach(h => {
                h.classList.remove('active');
                if (h.nextElementSibling) {
                    h.nextElementSibling.classList.remove('show');
                }
            });
            
            // Toggle current accordion
            if (!isActive) {
                this.classList.add('active');
                content.classList.add('show');
            }
        });
    });
    
    // ===========================
    // News Page Functionality
    // ===========================
    
    let newsData = [];
    let newsCurrentPage = 1;  // Renamed to avoid conflict with CV page
    const itemsPerPage = 5;
    let filteredNews = [];
    let currentCategory = 'all';
    let currentSearchQuery = '';
    
    // Load news data
    async function loadNewsData() {
        try {
            const response = await fetch('../../news.json');
            const data = await response.json();
            newsData = data.news.sort((a, b) => new Date(b.createAt) - new Date(a.createAt));
            filteredNews = [...newsData];
            
            // Check for search query in URL
            const urlParams = new URLSearchParams(window.location.search);
            const searchQuery = urlParams.get('q');
            
            if (searchQuery) {
                const newsSearchInput = document.getElementById('newsSearchInput');
                if (newsSearchInput) {
                    newsSearchInput.value = searchQuery;
                    currentSearchQuery = searchQuery;
                    filterNewsBySearch(searchQuery);
                }
            }
            
            renderNews();
            setupPagination();
        } catch (error) {
            console.error('Error loading news data:', error);
        }
    }
    
    // Render news items
    function renderNews() {
        const newsGrid = document.getElementById('newsGrid');
        if (!newsGrid) return;
        
        const startIndex = (newsCurrentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const currentItems = filteredNews.slice(startIndex, endIndex);
        
        newsGrid.innerHTML = currentItems.map(item => `
            <article class="news-card" data-category="${item.category}">
                <div class="news-card-image">
                    <img src="${item.imageUrl}" alt="${item.name}">
                    <span class="news-category">${getCategoryDisplayName(item.category)}</span>
                </div>
                <div class="news-card-content">
                    <div class="news-meta">
                        <span class="news-date">${formatDate(item.createAt)}</span>
                        <div class="news-tags">
                            ${item.tags.map(tag => `<span class="news-tag">${tag}</span>`).join('')}
                        </div>
                    </div>
                    <h3 class="news-title">
                        <a href="${item.pageUrl}" target="_blank">${item.name}</a>
                    </h3>
                    <p class="news-excerpt">
                        ${item.description}
                    </p>
                    <a href="${item.pageUrl}" target="_blank" class="read-more">
                        Read more <i class="fas fa-arrow-right"></i>
                    </a>
                </div>
            </article>
        `).join('');
    }
    
    // Format date for display
    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    // Get category display name
    function getCategoryDisplayName(category) {
        const categoryMap = {
            'publication': 'Publication',
            'grant': 'Grant',
            'media': 'Media',
            'award': 'Award'
        };
        return categoryMap[category] || category.charAt(0).toUpperCase() + category.slice(1);
    }
    
    // News Search
    const newsSearchForm = document.querySelector('.news-search-form');
    const newsSearchInput = document.getElementById('newsSearchInput');
    
    if (newsSearchForm) {
        newsSearchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const query = newsSearchInput.value.trim();
            
            // Update URL with search parameter
            const newUrl = query ? 
                `${window.location.pathname}?q=${encodeURIComponent(query)}` : 
                window.location.pathname;
            window.history.pushState({ path: newUrl }, '', newUrl);
            
            currentSearchQuery = query;
            filterNewsBySearch(query);
        });
    }
    
    function filterNewsBySearch(query) {
        const lowerQuery = query.toLowerCase();
        
        if (!query) {
            filteredNews = filterByCategory(newsData, currentCategory);
        } else {
            let searchResults = newsData.filter(item => {
                const titleMatch = item.name.toLowerCase().includes(lowerQuery);
                const descriptionMatch = item.description.toLowerCase().includes(lowerQuery);
                const tagsMatch = item.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
                
                return titleMatch || descriptionMatch || tagsMatch;
            });
            
            filteredNews = filterByCategory(searchResults, currentCategory);
        }
        
        newsCurrentPage = 1;
        renderNews();
        setupPagination();
    }
    
    // Filter by category
    function filterByCategory(items, category) {
        if (category === 'all') {
            return items;
        }
        return items.filter(item => item.category === category);
    }
    
    // News Category Filter
    const filterChips = document.querySelectorAll('.filter-chip');
    
    filterChips.forEach(chip => {
        chip.addEventListener('click', function() {
            const category = this.dataset.category;
            currentCategory = category;
            
            // Update active chip
            filterChips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            // Apply filters
            if (currentSearchQuery) {
                filterNewsBySearch(currentSearchQuery);
            } else {
                filteredNews = filterByCategory(newsData, category);
                newsCurrentPage = 1;
                renderNews();
                setupPagination();
            }
        });
    });
    
    // Setup pagination
    function setupPagination() {
        const totalPages = Math.ceil(filteredNews.length / itemsPerPage);
        const pagination = document.querySelector('.pagination');
        if (!pagination || totalPages <= 1) {
            if (pagination) pagination.style.display = 'none';
            return;
        }
        
        pagination.style.display = 'flex';
        
        const prevBtn = pagination.querySelector('.page-btn');
        const nextBtn = pagination.querySelector('.page-btn:last-child');
        
        // Update prev/next buttons
        prevBtn.disabled = newsCurrentPage === 1;
        nextBtn.disabled = newsCurrentPage === totalPages;
        
        // Generate page numbers
        let pageNumbersHTML = '';
        for (let i = 1; i <= Math.min(totalPages, 5); i++) {
            pageNumbersHTML += `<button class="page-number ${i === newsCurrentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
        }
        
        if (totalPages > 5) {
            pageNumbersHTML += '<span class="page-dots">...</span>';
            pageNumbersHTML += `<button class="page-number" data-page="${totalPages}">${totalPages}</button>`;
        }
        
        // Replace page numbers
        const existingPageNumbers = pagination.querySelectorAll('.page-number, .page-dots');
        existingPageNumbers.forEach(el => el.remove());
        
        nextBtn.insertAdjacentHTML('beforebegin', pageNumbersHTML);
        
        // Add event listeners to new page numbers
        pagination.querySelectorAll('.page-number').forEach(btn => {
            btn.addEventListener('click', function() {
                const page = parseInt(this.dataset.page);
                if (page !== newsCurrentPage) {
                    newsCurrentPage = page;
                    renderNews();
                    setupPagination();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });
        
        // Prev/Next button handlers
        prevBtn.onclick = () => {
            if (newsCurrentPage > 1) {
                newsCurrentPage--;
                renderNews();
                setupPagination();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };
        
        nextBtn.onclick = () => {
            if (newsCurrentPage < totalPages) {
                newsCurrentPage++;
                renderNews();
                setupPagination();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        };
    }
    
    // Initialize news page if we're on the news page
    if (document.getElementById('newsGrid')) {
        loadNewsData();
    }
    
    // ===========================
    // Common Functionality
    // ===========================
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Lazy loading for images
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src || img.src;
                    img.classList.add('loaded');
                    observer.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
});
