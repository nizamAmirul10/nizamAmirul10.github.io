// =========================
// REDUCED MOTION PREFERENCE
// — respects users who set "Reduce motion" in their OS (accessibility)
// =========================
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// =========================
// PIXEL GRID BACKGROUND
// — Cursor-reactive grid: cells near the pointer light up with random palette colors
//   then fade out. Always-on faint base dots are drawn so the grid is visible at rest.
// =========================
const pixelCanvas = document.getElementById('pixel-canvas');
if (pixelCanvas && !prefersReducedMotion) {
    const pctx = pixelCanvas.getContext('2d');
    const cellSize = 28;
    const palette = ['#6366f1', '#ec4899', '#14b8a6', '#818cf8'];
    const influenceCells = 4;     // radius in cells
    const fadeRate = 0.93;        // per-frame alpha decay
    const peakAlpha = 0.55;

    let cols = 0;
    let rows = 0;
    let cells = [];               // flat array of { alpha, color }
    let cursorX = -9999;
    let cursorY = -9999;
    let lastCursorMove = 0;

    function resizePixelCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = pixelCanvas.getBoundingClientRect();
        pixelCanvas.width = rect.width * dpr;
        pixelCanvas.height = rect.height * dpr;
        pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        cols = Math.ceil(rect.width / cellSize);
        rows = Math.ceil(rect.height / cellSize);
        cells = new Array(cols * rows).fill(null).map(() => ({ alpha: 0, color: palette[0] }));
    }

    function lightUpNearCursor() {
        if (cursorX < 0) return;
        const rect = pixelCanvas.getBoundingClientRect();
        const localX = cursorX - rect.left;
        const localY = cursorY - rect.top;
        if (localX < 0 || localX > rect.width || localY < 0 || localY > rect.height) return;

        const centerCol = Math.floor(localX / cellSize);
        const centerRow = Math.floor(localY / cellSize);

        for (let dr = -influenceCells; dr <= influenceCells; dr++) {
            for (let dc = -influenceCells; dc <= influenceCells; dc++) {
                const r = centerRow + dr;
                const c = centerCol + dc;
                if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
                const dist = Math.sqrt(dr * dr + dc * dc);
                if (dist > influenceCells) continue;
                const intensity = (1 - dist / influenceCells) * peakAlpha;
                const cell = cells[r * cols + c];
                if (cell.alpha < intensity) {
                    cell.alpha = intensity;
                    cell.color = palette[Math.floor(Math.random() * palette.length)];
                }
            }
        }
    }

    function drawPixelGrid() {
        const w = pixelCanvas.width / (window.devicePixelRatio || 1);
        const h = pixelCanvas.height / (window.devicePixelRatio || 1);
        pctx.clearRect(0, 0, w, h);

        // Base layer: faint dots (always visible)
        pctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                pctx.fillRect(c * cellSize + cellSize / 2 - 1, r * cellSize + cellSize / 2 - 1, 2, 2);
            }
        }

        // Active layer: colored squares near cursor
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = cells[r * cols + c];
                if (cell.alpha > 0.01) {
                    pctx.globalAlpha = cell.alpha;
                    pctx.fillStyle = cell.color;
                    pctx.fillRect(c * cellSize + 2, r * cellSize + 2, cellSize - 4, cellSize - 4);
                    cell.alpha *= fadeRate;
                }
            }
        }
        pctx.globalAlpha = 1;
    }

    function pixelLoop() {
        lightUpNearCursor();
        drawPixelGrid();
        requestAnimationFrame(pixelLoop);
    }

    window.addEventListener('mousemove', (e) => {
        cursorX = e.clientX;
        cursorY = e.clientY;
        lastCursorMove = performance.now();
        // Hide the first-visit cursor hint as soon as the user actually moves
        const hint = document.getElementById('cursor-hint');
        if (hint && !hint.dataset.dismissed) {
            hint.dataset.dismissed = 'true';
            hint.style.opacity = '0';
            setTimeout(() => hint.remove(), 400);
        }
    });

    window.addEventListener('resize', () => {
        resizePixelCanvas();
    });

    resizePixelCanvas();
    requestAnimationFrame(pixelLoop);
}

// Smooth scroll and active navigation
document.addEventListener('DOMContentLoaded', function () {

    // =========================
    // TAB SWITCHING FUNCTIONALITY
    // =========================
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', function () {
            const targetTab = this.getAttribute('data-tab');

            // Remove active class from all buttons and panels
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            // Add active class to clicked button
            this.classList.add('active');

            // Show corresponding panel with animation
            const targetPanel = document.querySelector(`.tab-panel[data-tab="${targetTab}"]`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }

            // Add click animation
            this.style.animation = 'none';
            setTimeout(() => {
                this.style.animation = 'tab-click 0.4s ease';
            }, 10);
        });
    });

    // Add tab click animation
    const tabStyle = document.createElement('style');
    tabStyle.textContent = `
@keyframes tab-click {
    0% { transform: translateY(-5px) scale(1); }
    50% { transform: translateY(-8px) scale(1.05); }
    100% { transform: translateY(-5px) scale(1); }
}
`;
    document.head.appendChild(tabStyle);

    // =========================
    // EXPERIENCE MODAL FUNCTIONALITY
    // =========================
    const modal = document.getElementById('experienceModal');
    const modalContent = document.getElementById('modalContent');
    const modalClose = document.querySelector('.modal-close');
    const modalOverlay = document.querySelector('.modal-overlay');
    const clickableCards = document.querySelectorAll('.timeline-card.clickable');

    // Open modal and load content
    clickableCards.forEach(card => {
        card.addEventListener('click', function () {
            const experienceId = this.getAttribute('data-experience');
            loadExperienceDetail(experienceId);
        });
    });

    let activeFetch = null;
    function loadExperienceDetail(experienceId) {
        if (activeFetch) activeFetch.abort();
        activeFetch = new AbortController();

        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        modalContent.innerHTML = '<div class="experience-detail"><div class="detail-body"><p>Loading…</p></div></div>';

        fetch(`experiences/${experienceId}.html`, { signal: activeFetch.signal })
            .then(response => {
                if (!response.ok) throw new Error('Content not found');
                return response.text();
            })
            .then(html => {
                modalContent.innerHTML = html;
                modalContent.scrollTop = 0;
            })
            .catch(error => {
                if (error.name === 'AbortError') return;
                modalContent.innerHTML = `
                    <div class="experience-detail">
                        <div class="detail-header">
                            <h2>Content Not Available</h2>
                        </div>
                        <div class="detail-body">
                            <p>Sorry, the detailed information for this experience is currently unavailable.</p>
                        </div>
                    </div>
                `;
                console.error('Error loading experience:', error);
            });
    }

    // Close modal
    function closeModal() {
        if (activeFetch) activeFetch.abort();
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (modalOverlay) modalOverlay.addEventListener('click', closeModal);

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Scroll-triggered reveal animations (IntersectionObserver — no scroll listener needed)
    // — fully skipped when user prefers reduced motion (elements stay visible from the start)
    const animatedElements = document.querySelectorAll('.service-card, .project-card, .timeline-card, .tech-item');
    if (!prefersReducedMotion) {
        animatedElements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        });

        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -100px 0px' });

        animatedElements.forEach(el => revealObserver.observe(el));
    }

    // Navbar elevation on scroll — only toggles shadow; background stays solid
    // so the pixel BG can never bleed through.
    const subhead = document.querySelector('.subhead');
    if (subhead) {
        let scrolled = false;
        let scrollTicking = false;
        window.addEventListener('scroll', () => {
            if (scrollTicking) return;
            scrollTicking = true;
            requestAnimationFrame(() => {
                const shouldBeScrolled = window.scrollY > 50;
                if (shouldBeScrolled !== scrolled) {
                    scrolled = shouldBeScrolled;
                    subhead.style.boxShadow = scrolled ? '0 4px 20px rgba(0, 0, 0, 0.3)' : 'none';
                }
                scrollTicking = false;
            });
        }, { passive: true });
    }

    // Interactive cursor 3D-tilt for cards (rAF-throttled per card; skipped for reduced motion)
    const cards = prefersReducedMotion ? [] : document.querySelectorAll('.service-card, .project-card');

    cards.forEach(card => {
        let cardTicking = false;
        let lastE = null;
        card.addEventListener('mousemove', (e) => {
            lastE = e;
            if (cardTicking) return;
            cardTicking = true;
            requestAnimationFrame(() => {
                const rect = card.getBoundingClientRect();
                const x = lastE.clientX - rect.left;
                const y = lastE.clientY - rect.top;
                const rotateX = (y - rect.height / 2) / 20;
                const rotateY = (rect.width / 2 - x) / 20;
                card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
                cardTicking = false;
            });
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
        });
    });

    // =========================
    // PROJECT CARD DETAIL TOGGLE (inline master / detail)
    // — clicking a card hides the others and reveals its detail pane on the right
    // — clicking the close (×) restores the grid
    // =========================
    const projectsGrid = document.querySelector('.projects-grid');

    if (projectsGrid) {
        document.querySelectorAll('.project-card[data-project]').forEach(card => {
            card.addEventListener('click', () => {
                const projectId = card.dataset.project;

                projectsGrid.classList.add('detail-mode');

                document.querySelectorAll('.project-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');

                document.querySelectorAll('.project-detail-pane').forEach(p => p.classList.remove('active'));
                const target = document.querySelector(`.project-detail-pane[data-project="${projectId}"]`);
                if (target) target.classList.add('active');
            });
        });

        document.querySelectorAll('.detail-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                projectsGrid.classList.remove('detail-mode');
                document.querySelectorAll('.project-card').forEach(c => c.classList.remove('selected'));
                document.querySelectorAll('.project-detail-pane').forEach(p => p.classList.remove('active'));
            });
        });
    }

    // =========================
    // CONTACT TILE TOGGLE (Email / Phone)
    // — clicking reveals the address/number; clicking again hides it
    // =========================
    document.querySelectorAll('.contact-toggle').forEach(btn => {
        const span = btn.querySelector('.contact-text');
        const original = btn.dataset.default;
        const revealed = btn.dataset.revealed;
        btn.addEventListener('click', () => {
            const isRevealed = btn.classList.toggle('revealed');
            span.textContent = isRevealed ? revealed : original;
        });
    });

    // Parallax effect for gradient orbs (rAF-throttled, cached query; skipped for reduced motion)
    const orbs = prefersReducedMotion ? [] : document.querySelectorAll('.gradient-orb');
    if (orbs.length > 0) {
        let orbMouseX = 0;
        let orbMouseY = 0;
        let orbTicking = false;
        window.addEventListener('mousemove', (e) => {
            orbMouseX = e.clientX / window.innerWidth;
            orbMouseY = e.clientY / window.innerHeight;
            if (orbTicking) return;
            orbTicking = true;
            requestAnimationFrame(() => {
                orbs.forEach((orb, index) => {
                    const speed = (index + 1) * 20;
                    const x = (orbMouseX - 0.5) * speed;
                    const y = (orbMouseY - 0.5) * speed;
                    orb.style.transform = `translate(${x}px, ${y}px)`;
                });
                orbTicking = false;
            });
        });
    }

    // Tech stack item interaction
    const techItems = document.querySelectorAll('.tech-item');

    techItems.forEach(item => {
        item.addEventListener('click', function () {
            this.style.animation = 'none';
            setTimeout(() => {
                this.style.animation = 'pop 0.5s ease';
            }, 10);
        });
    });

    // Add pop animation
    const style = document.createElement('style');
    style.textContent = `
@keyframes pop {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
}
`;
    document.head.appendChild(style);

    // =========================
    // TERMINAL SESSION ANIMATION
    // — Reveals each terminal line/output one at a time, like a real shell session.
    //   Skipped (everything visible) when prefers-reduced-motion is on.
    // =========================
    const terminalBody = document.querySelector('.terminal-body');
    if (terminalBody && !prefersReducedMotion) {
        const lines = terminalBody.children;
        // Hide all lines except the blinking-cursor line
        for (const line of lines) line.style.opacity = '0';
        let i = 0;
        function revealNext() {
            if (i >= lines.length) return;
            lines[i].style.transition = 'opacity 0.25s ease';
            lines[i].style.opacity = '1';
            const isCommand = lines[i].classList.contains('terminal-line');
            i++;
            setTimeout(revealNext, isCommand ? 280 : 180);
        }
        // Slight delay so the page-fade-in finishes first
        setTimeout(revealNext, 600);
    }

    // Typing effect for role (instant text for reduced motion users)
    const roleElement = document.querySelector('.role');
    if (roleElement && !prefersReducedMotion) {
        const roleText = roleElement.textContent;
        roleElement.textContent = '';

        let charIndex = 0;
        const typingSpeed = 100;

        function typeRole() {
            if (charIndex < roleText.length) {
                roleElement.textContent += roleText.charAt(charIndex);
                charIndex++;
                setTimeout(typeRole, typingSpeed);
            }
        }

        setTimeout(typeRole, 500);
    }

    // =========================
    // EDITORIAL HOVER REVEAL (Olivier Larose style)
    // — Works across all .hover-list elements on the page (Featured + Explore).
    // — Items with data-image show a real image; items with data-preview show a themed
    //   gradient + uppercase label. One shared .hover-image element follows the cursor.
    // =========================
    const hoverImage = document.getElementById('hover-image');
    const hoverImageLabel = document.getElementById('hover-image-label');
    const hoverLists = document.querySelectorAll('.hover-list');
    const supportsHover = window.matchMedia('(hover: hover)').matches;

    if (hoverLists.length && hoverImage && !prefersReducedMotion && supportsHover) {
        let hx = 0;
        let hy = 0;
        let hoverTicking = false;
        const previewClasses = ['preview-about', 'preview-education', 'preview-work', 'label-only'];

        function paintHoverPosition() {
            hoverImage.style.setProperty('--hover-x', hx + 'px');
            hoverImage.style.setProperty('--hover-y', hy + 'px');
            hoverTicking = false;
        }

        hoverLists.forEach(list => {
            list.addEventListener('mousemove', (e) => {
                hx = e.clientX;
                hy = e.clientY;
                if (hoverTicking) return;
                hoverTicking = true;
                requestAnimationFrame(paintHoverPosition);
            });
        });

        function clearPreviewClasses() {
            previewClasses.forEach(cls => hoverImage.classList.remove(cls));
        }

        const items = document.querySelectorAll('.hover-list-item');
        items.forEach(item => {
            const src = item.dataset.image;
            const preview = item.dataset.preview;

            // Preload real images so they don't flash on first hover
            if (src) {
                const preload = new Image();
                preload.src = src;
            }

            item.addEventListener('mouseenter', () => {
                clearPreviewClasses();
                if (src) {
                    hoverImage.style.backgroundImage = `url("${src}")`;
                    if (hoverImageLabel) hoverImageLabel.textContent = '';
                    hoverImage.classList.add('active');
                } else if (preview) {
                    hoverImage.style.backgroundImage = '';
                    hoverImage.classList.add(`preview-${preview}`, 'label-only', 'active');
                    if (hoverImageLabel) hoverImageLabel.textContent = preview;
                }
                // No data-image / data-preview → no floating preview shown
            });

            item.addEventListener('mouseleave', () => {
                hoverImage.classList.remove('active');
            });
        });
    }
});
