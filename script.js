/* ============================================================
   SHAZLIN NIZAM — "TENUN"
   ------------------------------------------------------------
   The loom, and everything that runs on the cloth.
   ============================================================ */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ============================================================
   THE LOOM
   ------------------------------------------------------------
   Songket is woven cell by cell: a dark silk ground, and on top of
   it a supplementary weft of gold thread that floats across the
   surface to build the motif. Because the loom is a grid, every
   motif is stepped — a rosette is a diamond built of little
   rectangles of gold. That is what is drawn here: a repeating
   bunga pecah lapan (eight-point rosette) with tampuk manggis at
   the tile corners and bunga tabur between, in gold floats on the
   black-green ground. The cursor is the light; gold catches it.
   ============================================================ */
(function loom() {
    const canvas = document.getElementById('tenun-canvas') || document.getElementById('pixel-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const T = 24;                 // motif tile, in cells
    const CELL = 5;               // one woven cell, px
    const TILE = T * CELL;
    const LIGHT_R = 240;
    const GOLD = '216, 180, 90';
    const GLINT = '240, 210, 122';

    /* --- the motif, defined on the loom's grid ------------------ */
    const c = (T - 1) / 2;
    function motif(i, j) {
        const dx = Math.abs(i - c);
        const dy = Math.abs(j - c);
        const d1 = dx + dy;
        // bunga pecah lapan — the eight-point rosette
        if (d1 <= 1) return 2;                                                  // heart
        if (d1 === 4) return 1;                                                 // inner ring
        if (d1 >= 5 && d1 <= 7 && (Math.min(dx, dy) === 0.5 || dx === dy)) return 1; // eight arms
        if (d1 === 9) return 2;                                                 // outer ring
        // tampuk manggis — mangosteen calyx at the corners (wraps across tiles)
        const ex = Math.min(i + 0.5, T - i - 0.5);
        const ey = Math.min(j + 0.5, T - j - 0.5);
        if (ex + ey <= 2) return 2;
        if (ex + ey === 4) return 1;
        // bunga tabur — a small scattered flower at the edge midpoints
        if ((Math.abs(i - c) + ey <= 2) || (ex + Math.abs(j - c) <= 2)) return 1;
        return 0;
    }

    const tileCells = [];
    for (let j = 0; j < T; j++) {
        for (let i = 0; i < T; i++) {
            const w = motif(i, j);
            if (w) tileCells.push({ i, j, w });
        }
    }
    // the same motif is woven onto the 3D cloth in kain.js
    window.__tenunTile = { T, cells: tileCells };

    let w = 0;
    let h = 0;
    let dpr = 1;
    let tiles = [];
    let still = null;
    let cx = -9999;
    let cy = -9999;
    let t = 0;

    /* --- paint the whole cloth once, at rest -------------------- */
    function paintStill() {
        still = document.createElement('canvas');
        still.width = canvas.width;
        still.height = canvas.height;
        const g = still.getContext('2d');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);

        // the silk ground — warp and weft, barely there
        g.strokeStyle = 'rgba(242, 236, 222, 0.028)';
        g.lineWidth = 1;
        g.beginPath();
        for (let x = 0.5; x < w; x += CELL) { g.moveTo(x, 0); g.lineTo(x, h); }
        for (let y = 0.5; y < h; y += CELL) { g.moveTo(0, y); g.lineTo(w, y); }
        g.stroke();

        // every gold float, at rest
        for (const tile of tiles) {
            for (const cell of tileCells) {
                floatRect(g, tile.x + cell.i * CELL, tile.y + cell.j * CELL, cell.w === 2 ? 0.085 : 0.05, GOLD);
            }
        }
    }

    function floatRect(g, x, y, alpha, rgb) {
        g.fillStyle = `rgba(${rgb}, ${alpha})`;
        // a float is a short length of thread lying across the ground:
        // wider than tall, with a hair of ground showing between rows
        g.fillRect(x + 0.4, y + 0.9, CELL - 0.8, CELL - 1.8);
    }

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rect = canvas.getBoundingClientRect();
        w = rect.width;
        h = rect.height;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        tiles = [];
        for (let y = -TILE / 2; y < h; y += TILE) {
            for (let x = -TILE / 2; x < w; x += TILE) tiles.push({ x, y });
        }
        paintStill();
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(still, 0, 0, w, h);
    }

    /* --- the living frame: only what the light touches ---------- */
    function frame() {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(still, 0, 0, w, h);

        t += 0.0016;
        const span = w + h * 0.6 + 800;
        const sheen = ((t % 1) * span) - 400;
        const sheenW = 300;
        const reach = LIGHT_R + TILE;

        for (const tile of tiles) {
            const tcx = tile.x + TILE / 2;
            const tcy = tile.y + TILE / 2;
            const nearCursor = Math.abs(tcx - cx) < reach && Math.abs(tcy - cy) < reach;
            const along = tcx + tcy * 0.6;
            const nearSheen = Math.abs(along - sheen) < sheenW + TILE;
            if (!nearCursor && !nearSheen) continue;

            for (const cell of tileCells) {
                const x = tile.x + cell.i * CELL;
                const y = tile.y + cell.j * CELL;
                let a = 0;

                if (nearSheen) {
                    const d = Math.abs((x + y * 0.6) - sheen);
                    if (d < sheenW) a += (1 - d / sheenW) * 0.13;
                }
                if (nearCursor) {
                    const dx = (x - cx) * 0.85;
                    const dy = y - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < LIGHT_R) {
                        const f = 1 - dist / LIGHT_R;
                        a += f * f * (cell.w === 2 ? 0.62 : 0.46);
                    }
                }
                if (a > 0.02) floatRect(ctx, x, y, Math.min(a, 0.9), a > 0.5 ? GLINT : GOLD);
            }
        }

        requestAnimationFrame(frame);
    }

    window.addEventListener('pointermove', (e) => { cx = e.clientX; cy = e.clientY; }, { passive: true });
    window.addEventListener('pointerleave', () => { cx = -9999; cy = -9999; });

    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(resize, 150);
    });

    resize();
    if (!prefersReducedMotion) requestAnimationFrame(frame);
})();

document.addEventListener('DOMContentLoaded', function () {

    /* ========================================================
       THE PROOF NUMBERS count themselves up. They are what a
       recruiter scans first, so they should arrive, not sit.
       ======================================================== */
    const stats = document.querySelectorAll('.stat-num');
    if (stats.length && !prefersReducedMotion && 'IntersectionObserver' in window) {
        const countUp = (el) => {
            // the suffix (x, +) lives in an <em>; only the number moves
            const node = el.firstChild;
            if (!node || node.nodeType !== 3) return;
            const target = parseInt(node.textContent, 10);
            if (!isFinite(target)) return;
            const dur = 900;
            const t0 = performance.now();
            const tick = (now) => {
                const k = Math.min(1, (now - t0) / dur);
                const eased = 1 - Math.pow(1 - k, 3);
                node.textContent = String(Math.round(target * eased));
                if (k < 1) requestAnimationFrame(tick);
            };
            node.textContent = '0';
            requestAnimationFrame(tick);
        };
        const statObs = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;
                countUp(entry.target);
                statObs.unobserve(entry.target);
            });
        }, { threshold: 0.6 });
        stats.forEach((el) => statObs.observe(el));
    }

    /* ========================================================
       HOW FAR THROUGH THE BOLT — the selvedge thread fills as
       the page is read, with a bunga at the leading edge.
       ======================================================== */
    const readThread = document.getElementById('selvedge-thread');
    if (readThread) {
        let queued = false;
        const paintRead = () => {
            const span = document.documentElement.scrollHeight - window.innerHeight;
            const pct = span > 0 ? (window.scrollY / span) * 100 : 0;
            readThread.style.setProperty('--read', Math.min(100, Math.max(0, pct)) + '%');
            queued = false;
        };
        window.addEventListener('scroll', () => {
            if (queued) return;
            queued = true;
            requestAnimationFrame(paintRead);
        }, { passive: true });
        paintRead();
    }

    /* ========================================================
       NAV — Kuala Lumpur time, and a shadow once you scroll
       ======================================================== */
    const navTime = document.getElementById('nav-time');
    if (navTime) {
        const fmt = new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit', hour12: false
        });
        const tick = () => { navTime.textContent = `KL ${fmt.format(new Date())}`; };
        tick();
        setInterval(tick, 30000);
    }

    const subhead = document.querySelector('.subhead');
    if (subhead) {
        let scrolled = false;
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(() => {
                const should = window.scrollY > 40;
                if (should !== scrolled) {
                    scrolled = should;
                    subhead.style.boxShadow = scrolled ? '0 14px 34px -22px rgba(0, 0, 0, 0.8)' : 'none';
                }
                ticking = false;
            });
        }, { passive: true });
    }

    /* ========================================================
       EXPERIENCE MODAL — loads /experiences/*.html partials
       ======================================================== */
    const modal = document.getElementById('experienceModal');
    const modalContent = document.getElementById('modalContent');
    const clickableCards = document.querySelectorAll('.timeline-card.clickable');
    let activeFetch = null;

    function loadExperienceDetail(experienceId) {
        if (!modal || !modalContent) return;
        if (activeFetch) activeFetch.abort();
        activeFetch = new AbortController();

        modal.classList.add('open');
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
                        <div class="detail-header"><h2>Content not available</h2></div>
                        <div class="detail-body"><p>Sorry, the detail for this experience could not be loaded.</p></div>
                    </div>`;
                console.error('Error loading experience:', error);
            });
    }

    function closeModal() {
        if (!modal) return;
        if (activeFetch) activeFetch.abort();
        modal.classList.remove('open');
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
            if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
        });
    }

    /* ========================================================
       REVEAL — rows arrive the way a shuttle lays a pick
       ======================================================== */
    const revealTargets = document.querySelectorAll(
        '.case, .timeline-card, .award-card, .skill-group, .achievements-list li, .testimonial-card, .hover-list-item, .currently-list li, .more-list li, .hero-stats li, .feat-card'
    );
    if (!prefersReducedMotion && 'IntersectionObserver' in window && revealTargets.length) {
        const perParent = new Map();
        revealTargets.forEach((el) => {
            const idx = perParent.get(el.parentElement) || 0;
            perParent.set(el.parentElement, idx + 1);
            el.style.transitionDelay = `${Math.min(idx, 8) * 0.07}s`;
            el.classList.add('reveal');
        });
        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    io.unobserve(entry.target);
                }
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
        revealTargets.forEach(el => io.observe(el));
    }

    /* ========================================================
       CASE STUDIES — inline accordion + sticky index
       ======================================================== */
    const cases = document.querySelectorAll('.case');
    if (cases.length) {
        const setOpen = (c, open) => {
            c.classList.toggle('open', open);
            const btn = c.querySelector('.case-toggle');
            if (btn) btn.setAttribute('aria-expanded', String(open));
        };

        // How far down the sticky header reaches, so the panel opens below it
        const headroom = () => {
            const bar = document.querySelector('.subhead');
            return (bar ? bar.offsetHeight : 68) + 16;
        };

        /* The panel used to unfold silently below the fold, and a reader had
           no reason to think anything had happened. Now the page follows the
           reveal: the top of the detail is carried up under the header while
           it opens, and the sections inside arrive one after another. The
           page only ever moves forward, never back, so a case that is already
           on screen does not jump. */
        const followReveal = (c) => {
            const detail = c.querySelector('.case-detail');
            if (!detail) return;
            setTimeout(() => {
                const top = detail.getBoundingClientRect().top;
                if (top > headroom() + 40) {
                    window.scrollTo({
                        top: window.scrollY + top - headroom(),
                        behavior: prefersReducedMotion ? 'auto' : 'smooth'
                    });
                }
                // land assistive tech on the content that just appeared
                detail.setAttribute('tabindex', '-1');
                detail.focus({ preventScroll: true });
            }, 140);
        };

        cases.forEach(c => {
            const btn = c.querySelector('.case-toggle');
            const media = c.querySelector('.case-media');
            const toggle = () => {
                const open = !c.classList.contains('open');
                setOpen(c, open);
                if (open) {
                    followReveal(c);
                } else {
                    // Collapsing shortens the page, so the browser drops the
                    // reader somewhere arbitrary. Put them back on the card
                    // they just closed instead.
                    setTimeout(() => {
                        const top = c.getBoundingClientRect().top;
                        if (top < headroom()) {
                            window.scrollTo({
                                top: window.scrollY + top - headroom(),
                                behavior: prefersReducedMotion ? 'auto' : 'smooth'
                            });
                        }
                    }, 140);
                }
            };
            if (btn) btn.addEventListener('click', toggle);
            if (media) {
                media.addEventListener('click', toggle);
                media.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
                });
            }
        });

        const openFromHash = () => {
            const target = location.hash && document.querySelector(`.case${location.hash}`);
            if (!target) return;
            setOpen(target, true);
            setTimeout(() => target.scrollIntoView({
                behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start'
            }), 60);
        };
        openFromHash();
        window.addEventListener('hashchange', openFromHash);

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

    /* ========================================================
       CONTACT — click reveals the address and copies it
       ======================================================== */
    document.querySelectorAll('.contact-toggle').forEach(btn => {
        const span = btn.querySelector('.contact-text');
        const original = btn.dataset.default;
        const revealed = btn.dataset.revealed;
        btn.addEventListener('click', () => {
            const isRevealed = btn.classList.toggle('revealed');
            span.textContent = isRevealed ? revealed : original;
            if (isRevealed && navigator.clipboard) navigator.clipboard.writeText(revealed).catch(() => { });
        });
    });

    /* ========================================================
       RESUME VIEWER
       ======================================================== */
    const resumeBtn = document.getElementById('resumeBtn');
    const resumeModal = document.getElementById('resumeModal');
    const resumeFrame = document.getElementById('resumeFrame');
    const RESUME_SRC = 'Resume-public.pdf';

    function openResume() {
        if (!resumeModal) return;
        if (resumeFrame && !resumeFrame.getAttribute('src')) {
            resumeFrame.setAttribute('src', `${RESUME_SRC}#toolbar=1&navpanes=0`);
        }
        resumeModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
    function closeResume() {
        if (!resumeModal) return;
        resumeModal.classList.remove('open');
        document.body.style.overflow = '';
    }
    if (resumeBtn) resumeBtn.addEventListener('click', openResume);
    if (resumeModal) {
        resumeModal.querySelectorAll('[data-resume-close]').forEach(el => el.addEventListener('click', closeResume));
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && resumeModal.classList.contains('open')) closeResume();
        });
    }

    /* ========================================================
       KAD TEBUK — the punch card reads itself row by row,
       the way a Jacquard loom feeds one card per pick
       ======================================================== */
    const cardBody = document.querySelector('.terminal-body');
    if (cardBody && !prefersReducedMotion) {
        const rows = cardBody.children;
        for (const row of rows) row.style.opacity = '0';
        let i = 0;
        (function feed() {
            if (i >= rows.length) return;
            rows[i].style.transition = 'opacity 0.25s ease';
            rows[i].style.opacity = '1';
            const isCommand = rows[i].classList.contains('terminal-line');
            i++;
            setTimeout(feed, isCommand ? 300 : 200);
        })();
    }

});
