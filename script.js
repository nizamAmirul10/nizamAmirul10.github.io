// =========================
// MATRIX CANVAS ANIMATION
// =========================
let heroMouseX = -9999;
let heroMouseY = -9999;

window.addEventListener('mousemove', (e) => {
    heroMouseX = e.clientX;
    heroMouseY = e.clientY;
});

const canvas = document.getElementById('matrix-canvas');
if (canvas) {
    const ctx = canvas.getContext('2d');

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*(){}[]<>/';
    const charArray = chars.split('');
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = [];
    const brushRadius = 150;
    const brushStrength = 70;

    for (let i = 0; i < columns; i++) {
        drops[i] = Math.random() * -100;
    }

    function drawMatrix() {
        ctx.fillStyle = 'rgba(10, 14, 39, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#6366f1';
        ctx.font = fontSize + 'px monospace';

        for (let i = 0; i < drops.length; i++) {
            const text = charArray[Math.floor(Math.random() * charArray.length)];
            let x = i * fontSize;
            let y = drops[i] * fontSize;

            const dx = x - heroMouseX;
            const dy = y - heroMouseY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < brushRadius && dist > 0.001) {
                // Push character outward from cursor (brush) + jitter for "messup"
                const force = 1 - dist / brushRadius;
                x += (dx / dist) * force * brushStrength;
                y += (dy / dist) * force * brushStrength;
                x += (Math.random() - 0.5) * force * 10;
                y += (Math.random() - 0.5) * force * 10;
            }

            ctx.fillText(text, x, y);

            if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
    }

    setInterval(drawMatrix, 35);

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
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
@keyframes tab - click {
    0 % { transform: translateY(-5px) scale(1); }
    50 % { transform: translateY(-8px) scale(1.05); }
    100 % { transform: translateY(-5px) scale(1); }
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

    function loadExperienceDetail(experienceId) {
        // Show modal
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Load content
        fetch(`experiences/${experienceId}.html`)
            .then(response => {
                if (!response.ok) throw new Error('Content not found');
                return response.text();
            })
            .then(html => {
                modalContent.innerHTML = html;
                modalContent.scrollTop = 0;
            })
            .catch(error => {
                modalContent.innerHTML = `
    < div class="experience-detail" >
            <div class="detail-header">
              <h2>Content Not Available</h2>
            </div>
            <div class="detail-body">
              <p>Sorry, the detailed information for this experience is currently unavailable.</p>
            </div>
          </div >
    `;
                console.error('Error loading experience:', error);
            });
    }

    // Close modal
    function closeModal() {
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

    // Scroll animations
    const animateOnScroll = function () {
        const elements = document.querySelectorAll('.service-card, .project-card, .timeline-card, .tech-item');

        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementBottom = element.getBoundingClientRect().bottom;

            if (elementTop < window.innerHeight - 100 && elementBottom > 0) {
                element.style.opacity = '1';
                element.style.transform = 'translateY(0)';
            }
        });
    };

    // Initial setup for scroll animations
    const setupScrollAnimations = function () {
        const elements = document.querySelectorAll('.service-card, .project-card, .timeline-card, .tech-item');
        elements.forEach((element, index) => {
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px)';
            element.style.transition = `all 0.6s ease ${index * 0.1} s`;
        });
    };

    setupScrollAnimations();
    animateOnScroll();

    window.addEventListener('scroll', animateOnScroll);

    // Navbar background on scroll
    const subhead = document.querySelector('.subhead');
    if (subhead) {
        window.addEventListener('scroll', function () {
            if (window.scrollY > 50) {
                subhead.style.background = 'rgba(15, 23, 42, 0.95)';
                subhead.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
            } else {
                subhead.style.background = 'rgba(15, 23, 42, 0.8)';
                subhead.style.boxShadow = 'none';
            }
        });
    }

    // Interactive cursor effect for cards
    const cards = document.querySelectorAll('.service-card, .project-card');

    cards.forEach(card => {
        card.addEventListener('mousemove', function (e) {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;

            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-10px)`;
        });

        card.addEventListener('mouseleave', function () {
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

    // Parallax effect for gradient orbs
    window.addEventListener('mousemove', function (e) {
        const orbs = document.querySelectorAll('.gradient-orb');
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;

        orbs.forEach((orb, index) => {
            const speed = (index + 1) * 20;
            const x = (mouseX - 0.5) * speed;
            const y = (mouseY - 0.5) * speed;

            orb.style.transform = `translate(${x}px, ${y}px)`;
        });
    });

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
    0 % { transform: scale(1); }
    50 % { transform: scale(1.1); }
    100 % { transform: scale(1); }
}
`;
    document.head.appendChild(style);

    // Typing effect for role
    const roleElement = document.querySelector('.role');
    if (roleElement) {
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

        // Start typing after a short delay
        setTimeout(typeRole, 500);
    }
});
