// Smooth scroll and active navigation
document.addEventListener('DOMContentLoaded', function () {
    // Navigation active state
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('section');

    // Intersection Observer for active nav
    const observerOptions = {
        threshold: 0.3,
        rootMargin: '-100px 0px -50% 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
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
            element.style.transition = `all 0.6s ease ${index * 0.1}s`;
        });
    };

    setupScrollAnimations();
    animateOnScroll();

    window.addEventListener('scroll', animateOnScroll);

    // Navbar background on scroll
    const subhead = document.querySelector('.subhead');
    window.addEventListener('scroll', function () {
        if (window.scrollY > 50) {
            subhead.style.background = 'rgba(15, 23, 42, 0.95)';
            subhead.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        } else {
            subhead.style.background = 'rgba(15, 23, 42, 0.8)';
            subhead.style.boxShadow = 'none';
        }
    });

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
      0% { transform: scale(1); }
      50% { transform: scale(1.1); }
      100% { transform: scale(1); }
    }
  `;
    document.head.appendChild(style);

    // Typing effect for role (optional enhancement)
    const roleElement = document.querySelector('.role');
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

    // Smooth scroll for navigation links
    navLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);

            if (targetSection) {
                const offsetTop = targetSection.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
});
