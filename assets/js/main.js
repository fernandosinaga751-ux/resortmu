/* ═══════════════════════════════════════════════════════════════
   GKPS RESORT MEDAN UTARA - MAIN SCRIPTS
   ═══════════════════════════════════════════════════════════════ */

// ═══ CAROUSEL FUNCTIONALITY ═══
class ImageCarousel {
  constructor(containerId, images, interval = 5000) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    
    this.images = images;
    this.interval = interval;
    this.currentSlide = 0;
    this.autoPlayInterval = null;
    
    this.init();
  }
  
  init() {
    this.render();
    this.startAutoPlay();
    this.addEventListeners();
  }
  
  render() {
    let slidesHTML = this.images.map((img, index) => `
      <div class="carousel-slide ${index === 0 ? 'active' : ''}" data-slide="${index}">
        <img src="${img.src}" alt="${img.alt || 'GKPS Resort Medan Utara'}">
      </div>
    `).join('');
    
    let dotsHTML = this.images.map((_, index) => `
      <div class="carousel-dot ${index === 0 ? 'active' : ''}" data-slide="${index}"></div>
    `).join('');
    
    this.container.innerHTML = `
      ${slidesHTML}
      <div class="carousel-overlay">
        <div class="carousel-content">
          <div class="carousel-tag">Gereja Kristen Protestan Simalungun</div>
          <h1 class="carousel-title">GKPS</h1>
          <div class="carousel-subtitle">Resort Medan Utara</div>
          <p class="carousel-verse">
            "Sebab di mana dua atau tiga orang berkumpul dalam nama-Ku,<br>di situ Aku ada di tengah-tengah mereka."
            <cite>— Matius 18:20</cite>
          </p>
        </div>
      </div>
      <button class="carousel-nav prev">‹</button>
      <button class="carousel-nav next">›</button>
      <div class="carousel-dots">${dotsHTML}</div>
    `;
  }
  
  addEventListeners() {
    const prevBtn = this.container.querySelector('.carousel-nav.prev');
    const nextBtn = this.container.querySelector('.carousel-nav.next');
    const dots = this.container.querySelectorAll('.carousel-dot');
    
    prevBtn.addEventListener('click', () => {
      this.prevSlide();
      this.resetAutoPlay();
    });
    
    nextBtn.addEventListener('click', () => {
      this.nextSlide();
      this.resetAutoPlay();
    });
    
    dots.forEach((dot, index) => {
      dot.addEventListener('click', () => {
        this.goToSlide(index);
        this.resetAutoPlay();
      });
    });
  }
  
  goToSlide(index) {
    const slides = this.container.querySelectorAll('.carousel-slide');
    const dots = this.container.querySelectorAll('.carousel-dot');
    
    slides[this.currentSlide].classList.remove('active');
    dots[this.currentSlide].classList.remove('active');
    
    this.currentSlide = index;
    
    slides[this.currentSlide].classList.add('active');
    dots[this.currentSlide].classList.add('active');
  }
  
  nextSlide() {
    const next = (this.currentSlide + 1) % this.images.length;
    this.goToSlide(next);
  }
  
  prevSlide() {
    const prev = (this.currentSlide - 1 + this.images.length) % this.images.length;
    this.goToSlide(prev);
  }
  
  startAutoPlay() {
    this.autoPlayInterval = setInterval(() => this.nextSlide(), this.interval);
  }
  
  resetAutoPlay() {
    clearInterval(this.autoPlayInterval);
    this.startAutoPlay();
  }
}

// ═══ TAB FUNCTIONALITY ═══
function initTabs() {
  const tabBars = document.querySelectorAll('.tab-bar');
  
  tabBars.forEach(tabBar => {
    const tabs = tabBar.querySelectorAll('.tab-btn');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetId = tab.dataset.tab;
        
        // Deactivate all tabs
        tabs.forEach(t => t.classList.remove('active'));
        contents.forEach(c => c.classList.remove('active'));
        
        // Activate clicked tab
        tab.classList.add('active');
        const targetContent = document.getElementById('tab-' + targetId);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
  });
}

// ═══ MOBILE MENU TOGGLE ═══
function initMobileMenu() {
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const navLinks = document.querySelector('.nav-links');
  
  if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => {
      navLinks.classList.toggle('active');
    });
  }
}

// ═══ SCROLL ANIMATIONS ═══
function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);
  
  const animateElements = document.querySelectorAll('.jemaat-card, .seksi-card, .pengurus-card, .kg-card');
  animateElements.forEach(el => observer.observe(el));
}

// ═══ UTILITY FUNCTIONS ═══
function formatDate(dateString) {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function getFileIcon(type) {
  if (!type) return '📄';
  if (type.includes('pdf')) return '📕';
  if (type.includes('word') || type.includes('document')) return '📘';
  if (type.includes('sheet') || type.includes('excel')) return '📗';
  if (type.includes('image')) return '🖼️';
  return '📄';
}

// ═══ DATA MANAGEMENT ═══
const DataManager = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || null;
    } catch (e) {
      return null;
    }
  },
  
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Error saving to localStorage:', e);
      return false;
    }
  },
  
  remove(key) {
    localStorage.removeItem(key);
  }
};

// ═══ INITIALIZE ON DOM READY ═══
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initMobileMenu();
  initScrollAnimations();
});

// Export for use in other scripts
window.ImageCarousel = ImageCarousel;
window.DataManager = DataManager;
window.formatDate = formatDate;
window.formatBytes = formatBytes;
window.getFileIcon = getFileIcon;
