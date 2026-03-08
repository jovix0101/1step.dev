// Simplified personal homepage interactions
document.addEventListener('DOMContentLoaded', function() {
  // Floating navigation functionality
  const navDots = document.querySelectorAll('.nav-dot');
  const sections = document.querySelectorAll('section[id]');

  // Update active nav dot based on scroll position
  function updateActiveNav() {
    const scrollY = window.pageYOffset;
    const windowHeight = window.innerHeight;

    sections.forEach((section) => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');

      // Check if section is in viewport
      if (scrollY >= sectionTop - windowHeight / 3 &&
          scrollY < sectionTop + sectionHeight - windowHeight / 3) {
        navDots.forEach(dot => dot.classList.remove('active'));
        const activeDot = document.querySelector(`[href="#${sectionId}"]`);
        if (activeDot) activeDot.classList.add('active');
      }
    });
  }

  // Smooth scroll for navigation
  navDots.forEach(dot => {
    dot.addEventListener('click', function(e) {
      e.preventDefault();
      const targetId = this.getAttribute('href').substring(1);
      const targetSection = document.getElementById(targetId);

      if (targetSection) {
        targetSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Throttled scroll handler
  let scrollTimeout;
  window.addEventListener('scroll', () => {
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }
    scrollTimeout = setTimeout(updateActiveNav, 10);
  });

  // Initial nav update
  updateActiveNav();

  // Simple profile card interactions
  const profileCard = document.querySelector('.profile-card');
  const avatar = document.querySelector('.avatar-image');

  if (profileCard && avatar) {
    profileCard.addEventListener('mouseenter', () => {
      avatar.style.transform = 'scale(1.05)';
    });

    profileCard.addEventListener('mouseleave', () => {
      avatar.style.transform = 'scale(1)';
    });
  }

  // Quick links hover effects
  const quickLinks = document.querySelectorAll('.quick-link');
  quickLinks.forEach(link => {
    link.addEventListener('mouseenter', function() {
      const icon = this.querySelector('.link-icon');
      if (icon) {
        icon.style.transform = 'scale(1.1)';
      }
    });

    link.addEventListener('mouseleave', function() {
      const icon = this.querySelector('.link-icon');
      if (icon) {
        icon.style.transform = 'scale(1)';
      }
    });
  });

  // Skills tags simple interaction
  const skillTags = document.querySelectorAll('.skill-tag');
  skillTags.forEach(tag => {
    tag.addEventListener('click', function() {
      // Simple feedback
      this.style.transform = 'scale(0.95)';
      setTimeout(() => {
        this.style.transform = '';
      }, 150);
    });
  });

  // Project cards simple animation
  const projectItems = document.querySelectorAll('.project-item');
  const projectObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, {
    threshold: 0.2,
    rootMargin: '0px 0px -30px 0px'
  });

  projectItems.forEach((item, index) => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(20px)';
    item.style.transition = `opacity 0.4s ease ${index * 0.1}s, transform 0.4s ease ${index * 0.1}s`;
    projectObserver.observe(item);
  });

  // Contact methods simple interaction
  const contactMethods = document.querySelectorAll('.contact-method');
  contactMethods.forEach(method => {
    method.addEventListener('click', function(e) {
      // Simple click feedback
      this.style.transform = 'scale(0.98)';
      setTimeout(() => {
        this.style.transform = '';
      }, 100);
    });
  });

  // Keyboard navigation enhancement
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      document.body.classList.add('keyboard-navigation');
    }

    // Arrow key navigation for nav dots
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const activeNav = document.querySelector('.nav-dot.active');
      if (activeNav) {
        e.preventDefault();
        const allNavs = Array.from(navDots);
        const currentIndex = allNavs.indexOf(activeNav);
        let nextIndex;

        if (e.key === 'ArrowUp') {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : allNavs.length - 1;
        } else {
          nextIndex = currentIndex < allNavs.length - 1 ? currentIndex + 1 : 0;
        }

        allNavs[nextIndex].click();
        allNavs[nextIndex].focus();
      }
    }
  });

  document.addEventListener('mousedown', () => {
    document.body.classList.remove('keyboard-navigation');
  });

  console.log('✨ Simplified personal homepage loaded');
});