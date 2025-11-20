// WhiteCat Hosting - Frontend JavaScript

// ========================================
// Dynamic Pricing Management
// ========================================
const pricingManager = {
    configs: [],

    iconMap: {
        'Kitten': '🐱',
        'Cat': '😺',
        'Lion': '🦁',
        'Tiger': '🐯',
        'Panther': '🐆'
    },

    async loadConfigs() {
        try {
            const response = await fetch('/api/configs');
            if (!response.ok) {
                throw new Error('Failed to load pricing configurations');
            }

            this.configs = await response.json();
            this.renderPricingCards();
        } catch (err) {
            console.error('Error loading pricing:', err);
            this.showError();
        }
    },

    formatPrice(price) {
        return new Intl.NumberFormat('vi-VN').format(price);
    },

    getIcon(name) {
        return this.iconMap[name] || '🐱';
    },

    renderPricingCards() {
        const pricingGrid = document.getElementById('pricingGrid');
        if (!pricingGrid) return;

        if (this.configs.length === 0) {
            pricingGrid.innerHTML = `
                <div class="pricing-empty">
                    <p>Hiện chưa có gói hosting nào khả dụng.</p>
                </div>
            `;
            return;
        }

        // Determine featured card (middle one if odd count, or second if even)
        const featuredIndex = Math.floor(this.configs.length / 2);

        const cardsHTML = this.configs.map((config, index) => {
            const isFeatured = index === featuredIndex;
            const icon = this.getIcon(config.name);
            const features = Array.isArray(config.features) ? config.features : [];

            return `
                <div class="pricing-card ${isFeatured ? 'featured' : ''}" data-config-id="${config.id}">
                    ${isFeatured ? '<div class="badge">Phổ Biến</div>' : ''}
                    <div class="pricing-header">
                        <div class="pricing-icon">${icon}</div>
                        <h3 class="pricing-name">${config.name}</h3>
                        <div class="pricing-price">
                            <span class="currency">₫</span>
                            <span class="amount">${this.formatPrice(config.price_monthly)}</span>
                            <span class="period">/tháng</span>
                        </div>
                    </div>
                    <ul class="pricing-features">
                        <li><span class="check">✓</span> ${config.storage_gb}GB SSD NVMe Gen 3</li>
                        <li><span class="check">✓</span> ${config.cpu_cores} Core CPU Gen 12</li>
                        <li><span class="check">✓</span> ${config.ram_gb}GB RAM</li>
                        ${features.map(feature => `
                            <li><span class="check">✓</span> ${feature}</li>
                        `).join('')}
                    </ul>
                    <a href="#contact" class="btn ${isFeatured ? 'btn-primary' : 'btn-outline'}">Đăng Ký</a>
                </div>
            `;
        }).join('');

        pricingGrid.innerHTML = cardsHTML;

        // Re-apply scroll animations to new cards
        const pricingCards = pricingGrid.querySelectorAll('.pricing-card');
        pricingCards.forEach(card => {
            card.classList.add('animate-on-scroll');
            if (typeof scrollObserver !== 'undefined') {
                scrollObserver.observe(card);
            }
        });
    },

    showError() {
        const pricingGrid = document.getElementById('pricingGrid');
        if (!pricingGrid) return;

        pricingGrid.innerHTML = `
            <div class="pricing-error">
                <p>⚠️ Không thể tải bảng giá. Vui lòng thử lại sau.</p>
                <button class="btn btn-primary" onclick="pricingManager.loadConfigs()">Thử Lại</button>
            </div>
        `;
    }
};

// Load pricing on page load
pricingManager.loadConfigs();

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

// ========================================
// User Authentication
// ========================================
const authManager = {
    user: null,

    async checkAuth() {
        try {
            const response = await fetch('/api/user');
            const data = await response.json();

            if (data.authenticated) {
                this.user = data.user;
                this.updateUI();
            }
        } catch (err) {
            console.error('Auth check failed:', err);
        }
    },

    updateUI() {
        const discordLogin = document.getElementById('discordLogin');

        if (this.user && discordLogin) {
            // Replace login button with user info
            discordLogin.innerHTML = `
                <img src="${this.user.avatar}" alt="${this.user.username}"
                     style="width: 24px; height: 24px; border-radius: 50%; margin-right: 8px;">
                ${this.user.username}
            `;
            discordLogin.href = '#';
            discordLogin.classList.add('logged-in');

            // Add dropdown menu
            discordLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.showUserMenu(discordLogin);
            });
        }
    },

    showUserMenu(element) {
        // Remove existing menu
        const existingMenu = document.querySelector('.user-menu');
        if (existingMenu) {
            existingMenu.remove();
            return;
        }

        const menu = document.createElement('div');
        menu.className = 'user-menu';
        menu.innerHTML = `
            <div class="user-menu-item user-info">
                <img src="${this.user.avatar}" alt="${this.user.username}">
                <div>
                    <strong>${this.user.username}</strong>
                    <small>${this.user.email || ''}</small>
                </div>
            </div>
            <hr>
            <button class="user-menu-item logout-btn">
                Đăng Xuất
            </button>
        `;

        // Position menu
        const rect = element.getBoundingClientRect();
        menu.style.cssText = `
            position: absolute;
            top: ${rect.bottom + 10}px;
            right: 20px;
            background: var(--bg-card);
            border: 2px solid var(--border-color);
            border-radius: 12px;
            padding: 10px;
            min-width: 200px;
            box-shadow: 0 10px 30px var(--shadow-color);
            z-index: 1000;
        `;

        document.body.appendChild(menu);

        // Logout handler
        menu.querySelector('.logout-btn').addEventListener('click', async () => {
            await this.logout();
            menu.remove();
        });

        // Close on outside click
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target) && e.target !== element) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 100);
    },

    async logout() {
        try {
            await fetch('/auth/logout', { method: 'POST' });
            window.location.reload();
        } catch (err) {
            console.error('Logout failed:', err);
        }
    }
};

// Check authentication on load
authManager.checkAuth();

// Handle login success/error messages
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.get('login') === 'success') {
    // Show success message
    showNotification('Đăng nhập thành công! Chào mừng bạn đến với WhiteCat 🐱', 'success');
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
} else if (urlParams.get('error')) {
    showNotification('Đăng nhập thất bại. Vui lòng thử lại.', 'error');
    window.history.replaceState({}, document.title, window.location.pathname);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : 'var(--accent-primary)'};
        color: white;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 15px;
        animation: slideIn 0.3s ease-out;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// Add notification animations
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    .user-menu-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.3s;
    }
    .user-menu-item:hover {
        background: var(--bg-secondary);
    }
    .user-menu-item img {
        width: 40px;
        height: 40px;
        border-radius: 50%;
    }
    .user-menu-item div {
        display: flex;
        flex-direction: column;
    }
    .user-menu-item small {
        color: var(--text-secondary);
        font-size: 12px;
    }
    .user-menu hr {
        border: none;
        border-top: 1px solid var(--border-color);
        margin: 5px 0;
    }
    .logout-btn {
        width: 100%;
        background: none;
        border: none;
        color: var(--text-primary);
        font-family: inherit;
        font-size: 14px;
        text-align: left;
        cursor: pointer;
    }
    .logout-btn:hover {
        color: #ef4444;
    }
    .btn-discord.logged-in {
        background: var(--accent-primary);
    }
`;
document.head.appendChild(notificationStyles);

// ========================================
// Smooth Scrolling
// ========================================
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

// ========================================
// Form Submission
// ========================================
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = new FormData(this);
        const data = {
            name: this.querySelector('input[type="text"]').value,
            email: this.querySelector('input[type="email"]').value,
            phone: this.querySelector('input[type="tel"]').value,
            message: this.querySelector('textarea').value
        };

        // Simple validation
        if (!data.name || !data.email || !data.message) {
            showNotification('Vui lòng điền đầy đủ thông tin bắt buộc.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                showNotification('Cảm ơn bạn đã liên hệ! WhiteCat sẽ phản hồi sớm nhất. 🐱', 'success');
                this.reset();
            } else {
                showNotification('Có lỗi xảy ra. Vui lòng thử lại.', 'error');
            }
        } catch (err) {
            showNotification('Có lỗi xảy ra. Vui lòng thử lại.', 'error');
        }
    });
}

// ========================================
// Scroll Animations
// ========================================
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

document.querySelectorAll('.feature-card, .pricing-card, .contact-item').forEach(element => {
    element.classList.add('animate-on-scroll');
    scrollObserver.observe(element);
});

// ========================================
// Active Navigation
// ========================================
const updateActiveNav = () => {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-menu a');

    let currentSection = '';

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
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

// ========================================
// Counter Animation
// ========================================
const animateCounter = (config) => {
    const { element, target, duration, suffix } = config;
    const increment = target / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current) + suffix;
    }, 16);
};

const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = entry.target.querySelectorAll('.stat-number');

            statNumbers.forEach(stat => {
                const target = parseInt(stat.getAttribute('data-target') || '0', 10);
                let suffix = '';

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

// ========================================
// Cat Interaction
// ========================================
const sleepingCat = document.querySelector('.sleeping-cat');
if (sleepingCat) {
    sleepingCat.style.cursor = 'pointer';
    sleepingCat.style.pointerEvents = 'auto';

    sleepingCat.addEventListener('click', () => {
        // Wake up animation
        const zzz = sleepingCat.querySelector('.sleep-zzz');
        if (zzz) {
            zzz.style.display = 'none';
            setTimeout(() => {
                zzz.style.display = 'block';
            }, 3000);
        }

        // Meow notification
        showNotification('Meow! 🐱 Đừng đánh thức mèo đang ngủ!', 'info');
    });
}

// ========================================
// Initialize
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    updateActiveNav();
});
