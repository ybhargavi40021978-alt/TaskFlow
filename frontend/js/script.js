/**
 * TaskFlow — Modern Collaborative Project Management Web Application
 * Client-Side Script: script.js
 */

document.addEventListener('DOMContentLoaded', () => {
  initHeaderScroll();
  initMobileMenu();
  initSmoothScroll();
  initPreviewInteractions();
  initMegaMenu();
  initPricingToggle();
  initShowcaseFilter();
});

/**
 * Add subtle elevation shadow to header on scroll
 */
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 15) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

/**
 * Mobile Navigation Drawer Toggle & Outside-Click Handling
 */
function initMobileMenu() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileNav = document.getElementById('mobileNav');

  if (!hamburgerBtn || !mobileNav) return;

  const toggleMenu = () => {
    const isExpanded = hamburgerBtn.getAttribute('aria-expanded') === 'true';
    hamburgerBtn.setAttribute('aria-expanded', String(!isExpanded));
    hamburgerBtn.classList.toggle('active');
    mobileNav.classList.toggle('open');
    mobileNav.setAttribute('aria-hidden', String(isExpanded));
  };

  const closeMenu = () => {
    hamburgerBtn.setAttribute('aria-expanded', 'false');
    hamburgerBtn.classList.remove('active');
    mobileNav.classList.remove('open');
    mobileNav.setAttribute('aria-hidden', 'true');
  };

  hamburgerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Close when clicking any link inside the mobile nav
  mobileNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      closeMenu();
    });
  });

  // Close when clicking outside of the header/mobile nav
  document.addEventListener('click', (e) => {
    if (!mobileNav.contains(e.target) && !hamburgerBtn.contains(e.target)) {
      if (mobileNav.classList.contains('open')) {
        closeMenu();
      }
    }
  });

  // Close on Escape key press for accessibility
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileNav.classList.contains('open')) {
      closeMenu();
      hamburgerBtn.focus();
    }
  });
}

/**
 * Smooth scrolling for internal anchor links (#features, #how-it-works, #about, #hero)
 */
function initSmoothScroll() {
  const anchorLinks = document.querySelectorAll('a[href^="#"]');

  anchorLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        e.preventDefault();
        
        const headerHeight = document.querySelector('.site-header')?.offsetHeight || 76;
        const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });

        // Set focus to the section for keyboard accessibility
        targetElement.setAttribute('tabindex', '-1');
        targetElement.focus({ preventScroll: true });
      }
    });
  });
}

/**
 * Micro-interactions inside the Miniature Product Preview
 */
function initPreviewInteractions() {
  const addTaskBtn = document.querySelector('.mini-add-task-btn');
  const taskCards = document.querySelectorAll('.task-card');

  // Interactive feedback when clicking the mini Add Task button
  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', () => {
      showToast('Task creation form opens in active workspace');
    });
  }

  // Subtle interactive card highlight feedback
  taskCards.forEach(card => {
    card.addEventListener('click', () => {
      taskCards.forEach(c => c.style.outline = 'none');
      card.style.outline = '2px solid #2563EB';
      setTimeout(() => {
        card.style.outline = 'none';
      }, 1800);
    });
  });
}

/**
 * Lightweight Toast Notification helper for UI feedback
 */
function showToast(message) {
  let existingToast = document.querySelector('.taskflow-toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'taskflow-toast';
  toast.textContent = message;
  
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    backgroundColor: '#0F172A',
    color: '#FFFFFF',
    padding: '12px 20px',
    borderRadius: '10px',
    fontSize: '0.875rem',
    fontWeight: '500',
    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
    zIndex: '9999',
    opacity: '0',
    transform: 'translateY(12px)',
    transition: 'all 0.25s ease'
  });

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => toast.remove(), 250);
  }, 2600);
}

/**
 * Header Mega-Menu Interaction (Keyboard, Click & Esc handling)
 */
function initMegaMenu() {
  const dropdownToggleBtn = document.getElementById('appScreensDropdownBtn');
  const dropdownItem = dropdownToggleBtn ? dropdownToggleBtn.closest('.nav-item-dropdown') : null;
  const megaMenu = document.getElementById('appScreensMenu');

  if (!dropdownToggleBtn || !dropdownItem || !megaMenu) return;

  dropdownToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = dropdownItem.classList.contains('open');
    if (isOpen) {
      dropdownItem.classList.remove('open');
      dropdownToggleBtn.setAttribute('aria-expanded', 'false');
    } else {
      dropdownItem.classList.add('open');
      dropdownToggleBtn.setAttribute('aria-expanded', 'true');
    }
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!dropdownItem.contains(e.target)) {
      dropdownItem.classList.remove('open');
      dropdownToggleBtn.setAttribute('aria-expanded', 'false');
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dropdownItem.classList.contains('open')) {
      dropdownItem.classList.remove('open');
      dropdownToggleBtn.setAttribute('aria-expanded', 'false');
      dropdownToggleBtn.focus();
    }
  });
}

/**
 * Interactive Billing Toggle (Annual vs Monthly calculation)
 */
function initPricingToggle() {
  const toggleBtn = document.getElementById('billingToggleBtn');
  const monthlyLabel = document.getElementById('monthlyLabel');
  const annualLabel = document.getElementById('annualLabel');
  const proPriceVal = document.getElementById('proPriceVal');
  const entPriceVal = document.getElementById('entPriceVal');

  if (!toggleBtn || !proPriceVal || !entPriceVal) return;

  let isAnnual = true;

  toggleBtn.addEventListener('click', () => {
    isAnnual = !isAnnual;

    if (isAnnual) {
      toggleBtn.classList.remove('monthly');
      toggleBtn.setAttribute('aria-checked', 'true');
      annualLabel.classList.add('active');
      monthlyLabel.classList.remove('active');

      proPriceVal.textContent = '12';
      entPriceVal.textContent = '29';
      showToast('Switched to Annual Billing (Saved 20%)');
    } else {
      toggleBtn.classList.add('monthly');
      toggleBtn.setAttribute('aria-checked', 'false');
      monthlyLabel.classList.add('active');
      annualLabel.classList.remove('active');

      proPriceVal.textContent = '15';
      entPriceVal.textContent = '35';
      showToast('Switched to Monthly Billing');
    }
  });
}

/**
 * Interactive Showcase Category Filter Tabs
 */
function initShowcaseFilter() {
  const tabs = document.querySelectorAll('.showcase-tab-btn');
  const cards = document.querySelectorAll('.showcase-card');

  if (!tabs.length || !cards.length) return;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const filter = tab.getAttribute('data-filter');

      cards.forEach(card => {
        const category = card.getAttribute('data-category');
        if (filter === 'all' || category === filter) {
          card.classList.remove('filtered-out');
        } else {
          card.classList.add('filtered-out');
        }
      });
    });
  });
}

