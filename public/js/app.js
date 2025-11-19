// WhiteCat Hosting - Frontend JavaScript
// Compiled from TypeScript

// Theme Management
const themeManager = {
    currentTheme: 'light',

    toggle() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.set(this.currentTheme);
    },

    set(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('whitecat-theme', theme);
        this.currentTheme = theme;
    },

    init() {
        const savedTheme = localStorage.getItem('whitecat-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (savedTheme) {
            this.set(savedTheme);
        } else if (prefersDark) {
            this.set('dark');
        }
    }
};

// Initialize theme
themeManager.init();

// Theme toggle button
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        themeManager.toggle();
    });
}

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        if (href) {
            const target = document.querySelector(href);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        }
    });
});

// Form submission handler
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Get form data
        const formData = new FormData(this);

        // Simple validation
        const inputs = this.querySelectorAll('input, textarea');
        let isValid = true;

        inputs.forEach(input => {
            if (input.hasAttribute('required') && !input.value.trim()) {
                isValid = false;
                input.style.borderColor = '#ef4444';
            } else {
                input.style.borderColor = '';
            }
        });

        if (isValid) {
            // Show success message
            alert('Cảm ơn bạn đã liên hệ! WhiteCat sẽ phản hồi trong thời gian sớm nhất. 🐱');
            this.reset();
        }
    });
}

// Scroll animations using Intersection Observer
const animationOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
        }
    });
}, animationOptions);

// Observe all animatable elements
document.querySelectorAll('.feature-card, .pricing-card, .contact-item').forEach(element => {
    element.classList.add('animate-on-scroll');
    scrollObserver.observe(element);
});

// Add active state to navigation on scroll
const updateActiveNav = () => {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-menu a');

    let currentSection = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;

        if (window.pageYOffset >= sectionTop - 100) {
            currentSection = section.getAttribute('id') || '';
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSection}`) {
            link.classList.add('active');
        }
    });
};

window.addEventListener('scroll', updateActiveNav);

// Counter animation for stats
const animateCounter = (config) => {
    const { element, target, duration, suffix } = config;
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current) + suffix;
    }, 16);
};

// Trigger counter animation when stats are visible
const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = entry.target.querySelectorAll('.stat-number');

            statNumbers.forEach(stat => {
                const target = parseInt(stat.getAttribute('data-target') || '0', 10);
                let suffix = '';

                // Determine suffix based on target value
                if (target === 99 || target === 40) {
                    suffix = '%';
                }

                animateCounter({
                    element: stat,
                    target: target,
                    duration: 2000,
                    suffix: suffix
                });
            });

            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    statsObserver.observe(heroStats);
}

// Cat mascot interaction
const catMascot = document.querySelector('.cat-mascot');
if (catMascot) {
    catMascot.addEventListener('click', () => {
        catMascot.style.animation = 'none';
        catMascot.offsetHeight; // Trigger reflow
        catMascot.style.animation = 'cat-float 0.5s ease-in-out 3';

        // Play a subtle "meow" effect (visual only)
        const meow = document.createElement('div');
        meow.textContent = 'Meow!';
        meow.style.cssText = `
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 14px;
            color: var(--accent-primary);
            animation: fadeUp 1s ease-out forwards;
            pointer-events: none;
        `;

        catMascot.appendChild(meow);

        setTimeout(() => {
            meow.remove();
        }, 1000);
    });
}

// Add fadeUp animation dynamically
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeUp {
        0% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        100% {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
    }
`;
document.head.appendChild(style);

// Mobile menu toggle (for future implementation)
const initMobileMenu = () => {
    // Placeholder for mobile menu functionality
    // Can be expanded when mobile menu button is added
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initMobileMenu();
    updateActiveNav();
});
