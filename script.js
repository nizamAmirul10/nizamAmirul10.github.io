// =========================
// REDUCED MOTION PREFERENCE
// — respects users who set "Reduce motion" in their OS (accessibility)
// =========================
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// =========================
// PIXEL GRID BACKGROUND
// — Cursor-reactive grid: cells near the pointer light up then fade out.
//   Mostly ivory sparks with the occasional accent cell — reads as static/film grain.
// =========================
const pixelCanvas = document.getElementById('pixel-canvas');
if (pixelCanvas && !prefersReducedMotion) {
    const pctx = pixelCanvas.getContext('2d');
    const cellSize = 30;
    const palette = ['#f2efe6', '#f2efe6', '#a9a69d', '#d4f04f'];
    const influenceCells = 4;     // radius in cells
    const fadeRate = 0.92;        // per-frame alpha decay
    const peakAlpha = 0.4;

    let cols = 0;
    let rows = 0;
    let cells = [];
    let cursorX = -9999;
    let cursorY = -9999;

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
        pctx.fillStyle = 'rgba(255, 255, 255, 0.035)';
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                pctx.fillRect(c * cellSize + cellSize / 2 - 1, r * cellSize + cellSize / 2 - 1, 2, 2);
            }
        }

        // Active layer: lit squares near cursor
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const cell = cells[r * cols + c];
                if (cell.alpha > 0.01) {
                    pctx.globalAlpha = cell.alpha;
                    pctx.fillStyle = cell.color;
                    pctx.fillRect(c * cellSize + 3, r * cellSize + 3, cellSize - 6, cellSize - 6);
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
        // Hide the first-visit cursor hint as soon as the user actually moves
        const hint = document.getElementById('cursor-hint');
        if (hint && !hint.dataset.dismissed) {
            hint.dataset.dismissed = 'true';
            hint.style.opacity = '0';
            setTimeout(() => hint.remove(), 400);
        }
    });

    window.addEventListener('resize', resizePixelCanvas);

    resizePixelCanvas();
    requestAnimationFrame(pixelLoop);
}

document.addEventListener('DOMContentLoaded', function () {

    // =========================
    // NAV — Kuala Lumpur local time + elevation on scroll
    // =========================
    const navTime = document.getElementById('nav-time');
    if (navTime) {
        const fmt = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kuala_Lumpur',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        const tick = () => { navTime.textContent = `KL ${fmt.format(new Date())}`; };
        tick();
        setInterval(tick, 30000);
    }

    const subhead = document.querySelector('.subhead');
    if (subhead) {
        let scrolled = false;
        let scrollTicking = false;
        window.addEventListener('scroll', () => {
            if (scrollTicking) return;
            scrollTicking = true;
            requestAnimationFrame(() => {
                const shouldBeScrolled = window.scrollY > 40;
                if (shouldBeScrolled !== scrolled) {
                    scrolled = shouldBeScrolled;
                    subhead.style.boxShadow = scrolled ? '0 10px 40px -10px rgba(0, 0, 0, 0.6)' : 'none';
                }
                scrollTicking = false;
            });
        }, { passive: true });
    }

    // =========================
    // EXPERIENCE MODAL (about.html — loads /experiences/*.html partials)
    // =========================
    const modal = document.getElementById('experienceModal');
    const modalContent = document.getElementById('modalContent');
    const clickableCards = document.querySelectorAll('.timeline-card.clickable');

    let activeFetch = null;
    function loadExperienceDetail(experienceId) {
        if (!modal || !modalContent) return;
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
                            <h2>Content not available</h2>
                        </div>
                        <div class="detail-body">
                            <p>Sorry, the detailed information for this experience is currently unavailable.</p>
                        </div>
                    </div>
                `;
                console.error('Error loading experience:', error);
            });
    }

    function closeModal() {
        if (!modal) return;
        if (activeFetch) activeFetch.abort();
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    clickableCards.forEach(card => {
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.addEventListener('click', () => loadExperienceDetail(card.getAttribute('data-experience')));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                loadExperienceDetail(card.getAttribute('data-experience'));
            }
        });
    });

    if (modal) {
        modal.querySelectorAll('.modal-close, .modal-overlay').forEach(el => el.addEventListener('click', closeModal));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
        });
    }

    // =========================
    // SCROLL REVEAL — IntersectionObserver, staggered per sibling group
    // =========================
    const revealTargets = document.querySelectorAll(
        '.case, .timeline-card, .award-card, .skill-group, .achievements-list li, .testimonial-card, .hover-list-item, .currently-list li'
    );
    if (!prefersReducedMotion && 'IntersectionObserver' in window && revealTargets.length) {
        const perParent = new Map();
        revealTargets.forEach((el) => {
            const idx = perParent.get(el.parentElement) || 0;
            perParent.set(el.parentElement, idx + 1);
            el.style.setProperty('--reveal-delay', `${Math.min(idx, 8) * 0.07}s`);
            el.classList.add('reveal');
        });

        const revealObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    revealObserver.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });

        revealTargets.forEach(el => revealObserver.observe(el));
    }

    // =========================
    // CASE STUDIES (projects.html) — inline accordion + sticky index
    // =========================
    const cases = document.querySelectorAll('.case');

    if (cases.length) {
        const setOpen = (c, open) => {
            c.classList.toggle('open', open);
            const btn = c.querySelector('.case-toggle');
            if (btn) btn.setAttribute('aria-expanded', String(open));
        };

        cases.forEach(c => {
            const btn = c.querySelector('.case-toggle');
            const media = c.querySelector('.case-media');
            const toggle = () => setOpen(c, !c.classList.contains('open'));
            if (btn) btn.addEventListener('click', toggle);
            if (media) {
                media.addEventListener('click', toggle);
                media.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
                });
            }
        });

        // Deep link: projects.html#case-skala → scroll to it and open the write-up
        const openFromHash = () => {
            const target = location.hash && document.querySelector(`.case${location.hash}`);
            if (!target) return;
            setOpen(target, true);
            setTimeout(() => target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' }), 60);
        };
        openFromHash();
        window.addEventListener('hashchange', openFromHash);

        // Sticky index: highlight the project currently in view
        const navLinks = document.querySelectorAll('.case-nav-link');
        if (navLinks.length && 'IntersectionObserver' in window) {
            const byId = new Map([...navLinks].map(a => [a.getAttribute('href').slice(1), a]));
            const inView = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    navLinks.forEach(a => a.classList.remove('active'));
                    const link = byId.get(entry.target.id);
                    if (link) link.classList.add('active');
                });
            }, { rootMargin: '-35% 0px -55% 0px', threshold: 0 });
            cases.forEach(c => inView.observe(c));
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') cases.forEach(c => setOpen(c, false));
        });
    }

    // =========================
    // CONTACT TOGGLE — click reveals the email address; click again hides it
    // =========================
    document.querySelectorAll('.contact-toggle').forEach(btn => {
        const span = btn.querySelector('.contact-text');
        const original = btn.dataset.default;
        const revealed = btn.dataset.revealed;
        btn.addEventListener('click', () => {
            const isRevealed = btn.classList.toggle('revealed');
            span.textContent = isRevealed ? revealed : original;
            if (isRevealed && navigator.clipboard) {
                navigator.clipboard.writeText(revealed).catch(() => {});
            }
        });
    });

    // =========================
    // RESUME VIEWER MODAL
    // =========================
    const resumeBtn = document.getElementById('resumeBtn');
    const resumeModal = document.getElementById('resumeModal');
    const resumeFrame = document.getElementById('resumeFrame');
    const RESUME_SRC = 'Resume-public.pdf';

    function openResume() {
        if (!resumeModal) return;
        if (resumeFrame && !resumeFrame.getAttribute('src')) {
            resumeFrame.setAttribute('src', `${RESUME_SRC}#toolbar=1&navpanes=0`);
        }
        resumeModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeResume() {
        if (!resumeModal) return;
        resumeModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (resumeBtn) resumeBtn.addEventListener('click', openResume);
    if (resumeModal) {
        resumeModal.querySelectorAll('[data-resume-close]').forEach(el => el.addEventListener('click', closeResume));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && resumeModal.classList.contains('active')) closeResume();
        });
    }

    // =========================
    // SESSION LOG ANIMATION — reveals each line one at a time, like a real shell
    // =========================
    const terminalBody = document.querySelector('.terminal-body');
    if (terminalBody && !prefersReducedMotion) {
        const lines = terminalBody.children;
        for (const line of lines) line.style.opacity = '0';
        let i = 0;
        function revealNext() {
            if (i >= lines.length) return;
            lines[i].style.transition = 'opacity 0.25s ease';
            lines[i].style.opacity = '1';
            const isCommand = lines[i].classList.contains('terminal-line');
            i++;
            setTimeout(revealNext, isCommand ? 300 : 200);
        }
        setTimeout(revealNext, 900);
    }

    // =========================
    // EDITORIAL HOVER REVEAL — one floating preview follows the cursor over list rows
    // — data-image → real image; data-preview → tinted card with an italic label
    // =========================
    const hoverImage = document.getElementById('hover-image');
    const hoverImageLabel = document.getElementById('hover-image-label');
    const hoverLists = document.querySelectorAll('.hover-list');
    const supportsHover = window.matchMedia('(hover: hover)').matches;

    if (hoverLists.length && hoverImage && !prefersReducedMotion && supportsHover) {
        let hx = 0;
        let hy = 0;
        let hoverTicking = false;
        const previewClasses = ['preview-about', 'preview-education', 'preview-work', 'preview-fertilemate', 'label-only'];

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

        document.querySelectorAll('.hover-list-item').forEach(item => {
            const src = item.dataset.image;
            const preview = item.dataset.preview;

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
            });

            item.addEventListener('mouseleave', () => {
                hoverImage.classList.remove('active');
            });
        });
    }
});
